import './Login.css';
import { AuthService } from '../../Services/AuthService';
import { showToast } from '../../Components/Toast/Toast';

declare global {
  interface Window {
    google: any;
  }
}

declare const google: any;

// Pull in your Vite env var
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
console.log('GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);


export function renderLoginPage() {
  const html = `
    <section class="auth-section">
      <h1>Log In</h1>
      <form id="loginForm" class="auth-form">
        <input name="username" placeholder="Username" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Log In</button>
      </form>

      <!-- placeholder for Google button -->
      <div id="google-signin" style="margin:1rem 0;"></div>

      <p>
        Don't have an account?
        <a href="#" id="to-signup-inline">Sign up</a>
      </p>
    </section>
  `;

  setTimeout(() => {
    // 1) Handle the username/password form
    const form = document.getElementById('loginForm') as HTMLFormElement | null;
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const data = new FormData(form);
        const username = data.get('username') as string;
        const password = data.get('password') as string;

        try {
          const res = await AuthService.login(username, password);
          if ((res as any).access) {
            AuthService.saveTokens(res as any);
            showToast('Logged in successfully!', 'success');
            document.getElementById('predict-link')?.dispatchEvent(new MouseEvent('click'));
          } else {
            showToast((res as any).detail || 'Login failed.', 'error');
          }
        } catch {
          showToast('Unexpected error during login.', 'error');
        }
      });
    }

    // 2) Inline “Sign up” link
    document.getElementById('to-signup-inline')?.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('signup-link')?.click();
    });

    // 3) Initialize Google One‑Tap / popup
    if (window.google && GOOGLE_CLIENT_ID) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential
      });
      (window as any).handleGoogleCredential = handleGoogleCredential;
      google.accounts.id.renderButton(
        document.getElementById('google-signin'),
        { theme: 'outline', size: 'large' }
      );
      // Optionally prompt automatically:
      // google.accounts.id.prompt();
    }
  }, 0);

  return html;
}

// 4) Callback after Google login
async function handleGoogleCredential(response: { credential: string }) {
  const id_token = response.credential;
  try {
    const res = await fetch('http://127.0.0.1:8000/api/auth/google-login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: id_token })
    });
    const data = await res.json();
    if (res.ok) {
      AuthService.saveTokens({
        access:  data.access_token,
        refresh: data.refresh_token
      });
      showToast('Logged in via Google!', 'success');
      document.getElementById('predict-link')?.dispatchEvent(new MouseEvent('click'));
    } else {
      showToast(data?.detail || 'Google login failed.', 'error');
    }
  } catch {
    showToast('Error connecting to server for Google login.', 'error');
  }
}

(window as any).handleGoogleCredential = handleGoogleCredential;
