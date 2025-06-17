import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderLoginPage } from './Login';
import { AuthService } from '../../Services/AuthService';
import { showToast } from '../../Components/Toast/Toast';

vi.mock('../../Components/Toast/Toast');
vi.mock('../../Services/AuthService');

describe('Login Page', () => {
  let loginSpy: ReturnType<typeof vi.spyOn>;
  let saveTokensSpy: ReturnType<typeof vi.spyOn>;
  let toastSpy: ReturnType<typeof showToast>;

  beforeEach(() => {
    document.body.innerHTML = renderLoginPage();

    // replace AuthService.login & saveTokens with spies
    loginSpy = vi.spyOn(AuthService as any, 'login');
    saveTokensSpy  = vi.spyOn(AuthService, 'saveTokens');
    toastSpy       = showToast as any; // already a mock from vi.mock
  });

  it('renders the login form and Google placeholder', () => {
    expect(document.querySelector('form#loginForm')).toBeTruthy();
    expect(document.querySelector('#google-signin')).toBeTruthy();
  });

  it('on successful username/password login calls saveTokens & navigates & toasts', async () => {
    // stub login → resolve to tokens
    loginSpy.mockResolvedValue({ access: 'a', refresh: 'r' });
    const form = document.querySelector('#loginForm')! as HTMLFormElement;
    ;(form.querySelector('input[name="username"]') as HTMLInputElement).value = 'u';
    ;(form.querySelector('input[name="password"]') as HTMLInputElement).value = 'p';

    // wait for setTimeout(…,0) handler wiring
    await new Promise(r => setTimeout(r, 0));
    form.dispatchEvent(new Event('submit', { bubbles: true }));

    // allow async handlers
    await new Promise(r => setTimeout(r, 0));

    expect(loginSpy).toHaveBeenCalledWith('u','p');
    expect(saveTokensSpy).toHaveBeenCalledWith({ access:'a', refresh:'r' });
    expect(toastSpy).toHaveBeenCalledWith('Logged in successfully!','success');
    // predict-link click simulated?
    // You can spy on dispatchEvent or window.location.hash etc.
  });

  it('on failed login shows error toast', async () => {
    loginSpy.mockResolvedValue({ detail: 'bad creds' });
    await new Promise(r => setTimeout(r, 0));
    document.querySelector('#loginForm')!.dispatchEvent(new Event('submit',{ bubbles:true }));

    await new Promise(r => setTimeout(r, 0));
    expect(toastSpy).toHaveBeenCalledWith('bad creds','error');
    expect(saveTokensSpy).not.toHaveBeenCalled();
  });
});
