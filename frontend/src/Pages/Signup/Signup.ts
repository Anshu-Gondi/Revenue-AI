import './Signup.css';
import { AuthService } from '../../Services/AuthService';
import { showToast } from '../../Components/Toast/Toast';

declare global {
  interface Window {
    google: any;
    handleGoogleCredential: (response: { credential: string }) => void;
  }
}

declare const google: any;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_URL = import.meta.env.VITE_API_BASE_URL;

export function renderSignupPage() {
  const html = `
    <section class="auth-section">
      <h1>Sign Up</h1>
      <form id="signupForm" class="auth-form">
        <input name="username" placeholder="Username" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Create Account</button>
      </form>

      <!-- Google Sign-In placeholder -->
      <div id="google-signin" style="margin:1rem 0;"></div>

      <p>
        Already have an account?
        <a href="#" id="to-login-inline">Log in</a>
      </p>
    </section>
  `;

  setTimeout(() => {
    // Sign up form handler
    const form = document.getElementById('signupForm') as HTMLFormElement;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const data = new FormData(form);
      const username = data.get('username') as string;
      const email = data.get('email') as string;
      const password = data.get('password') as string;

      const res = await AuthService.signup(username, email, password);
      if (res.id) {
        showToast('Account created! Please log in.', 'success');
        document.getElementById('login-link')?.click();
      } else {
        const err = Object.values(res).flat().join(', ');
        showToast(err || 'Signup failed', 'error');
      }
    });

    // Inline login link
    document.getElementById('to-login-inline')?.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('login-link')?.click();
    });

    // Google Sign-In button
    if (window.google && GOOGLE_CLIENT_ID) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential
      });
      google.accounts.id.renderButton(
        document.getElementById('google-signin'),
        { theme: 'outline', size: 'large' }
      );
    }
  }, 0);

  return html;
}

// Google Sign-In handler (same as in Login.ts)
async function handleGoogleCredential(response: { credential: string }) {
  const id_token = response.credential;
  try {
    const res = await fetch(`${API_URL}/api/auth/google-login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: id_token })
    });
    const data = await res.json();
    if (res.ok) {
      AuthService.saveTokens({
        access: data.access_token,
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

window.handleGoogleCredential = handleGoogleCredential;
