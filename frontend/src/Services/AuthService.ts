export interface Tokens {
  access: string;
  refresh: string;
}

const API_URL = import.meta.env.VITE_API_BASE_URL;

export class AuthService {
  /** Log in using Google OAuth */
  static async googleLogin(id_token: string): Promise<Tokens | { detail: string }> {
    try {
      const res = await fetch(`${API_URL}/api/auth/social/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: id_token }),
      });

      const data = await res.json();
      if (!res.ok) throw data;

      return {
        access: data.access_token,
        refresh: data.refresh_token,
      };
    } catch (err: any) {
      console.error('Google login error', err);
      return { detail: err.detail || err.message || 'Google login failed' };
    }
  }

  /** Sign up a new user */
  static async signup(username: string, email: string, password: string) {
    try {
      const resp = await fetch(`${API_URL}/api/auth/signup/`, {
        method: 'POST',
        headers: AuthService.jsonHeaders(),
        body: JSON.stringify({ username, email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) throw data;
      return data;
    } catch (err: any) {
      console.error('Signup error', err);
      // Normalize an error object you can show in UI
      return { non_field_errors: [err.detail || err.message || 'Signup failed'] };
    }
  }

  /** Log in an existing user */
  static async login(username: string, password: string) {
    try {
      const resp = await fetch(`${API_URL}/api/auth/login/`, {
        method: 'POST',
        headers: AuthService.jsonHeaders(),
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();
      if (!resp.ok) throw data;
      return data as Tokens;
    } catch (err: any) {
      console.error('Login error', err);
      return { detail: err.detail || err.message || 'Login failed' };
    }
  }

  /** Save tokens in localStorage */
  static saveTokens(tokens: Tokens) {
    localStorage.setItem('access', tokens.access);
    localStorage.setItem('refresh', tokens.refresh);
  }

  /** Remove tokens & redirect to login */
  static logout() {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    window.location.hash = '#/login';
  }

  /** Get the current access token */
  static getAccessToken(): string | null {
    return localStorage.getItem('access');
  }

  /** Build the Authorization header if we have a token */
  static authHeader(): Record<string,string> {
    const token = AuthService.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Common JSON headers + auth */
  static jsonHeaders(): Record<string,string> {
    return {
      'Content-Type': 'application/json',
      ...AuthService.authHeader(),
    };
  }

  /**
   * A fetch wrapper that injects the auth header, and if the response
   * is a 401, will automatically attempt to refresh the token once.
   */
  static async fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    // First attempt
    let headers = {
      ...(init.headers as Record<string,string> || {}),
      ...AuthService.authHeader(),
    };
    let resp = await fetch(input, { ...init, headers });

    // If expired, try refresh flow
    if (resp.status === 401) {
      const refresh = localStorage.getItem('refresh');
      if (refresh) {
        const refreshResp = await fetch(`${API_URL}/api/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (refreshResp.ok) {
          const { access, refresh: newRefresh } = await refreshResp.json();
          AuthService.saveTokens({ access, refresh: newRefresh });
          // retry original request with new access token
          headers = {
            ...(init.headers as Record<string,string> || {}),
            Authorization: `Bearer ${access}`,
          };
          resp = await fetch(input, { ...init, headers });
        } else {
          // refresh itself failed → log out
          AuthService.logout();
          throw new Error('Session expired, please log in again.');
        }
      } else {
        AuthService.logout();
        throw new Error('No refresh token, please log in again.');
      }
    }

    return resp;
  }
}
