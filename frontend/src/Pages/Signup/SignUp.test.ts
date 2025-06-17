import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderSignupPage } from './Signup';
import { AuthService } from '../../Services/AuthService';
import { showToast } from '../../Components/Toast/Toast';

vi.mock('../../Components/Toast/Toast');
vi.mock('../../Services/AuthService');

describe('Signup Page', () => {
  let signupSpy: ReturnType<typeof vi.spyOn>;
  let toastSpy: typeof showToast;

  beforeEach(() => {
    document.body.innerHTML = renderSignupPage();
    signupSpy = vi.spyOn(AuthService as any, 'signup');
    toastSpy  = showToast as any;
  });

  it('renders the signup form and Google placeholder', () => {
    expect(document.querySelector('form#signupForm')).toBeTruthy();
    expect(document.querySelector('#google-signin')).toBeTruthy();
  });

  it('on successful signup shows success toast and navigates to login', async () => {
    signupSpy.mockResolvedValue({ id: 123 });
    await new Promise(r => setTimeout(r,0));
    const form = document.querySelector('#signupForm')! as HTMLFormElement;
    ;(form.querySelector('input[name="username"]') as HTMLInputElement).value = 'newuser';
    ;(form.querySelector('input[name="email"]') as HTMLInputElement).value = 'e@x.com';
    ;(form.querySelector('input[name="password"]') as HTMLInputElement).value = 'pw';

    form.dispatchEvent(new Event('submit',{ bubbles:true }));
    await new Promise(r => setTimeout(r, 0));

    expect(signupSpy).toHaveBeenCalledWith('newuser','e@x.com','pw');
    expect(toastSpy).toHaveBeenCalledWith('Account created! Please log in.','success');
    // assert that login-link was clicked etc.
  });

  it('on signup error shows error toast', async () => {
    signupSpy.mockResolvedValue({ non_field_errors: ['bad'] });
    await new Promise(r => setTimeout(r,0));
    document.querySelector('#signupForm')!.dispatchEvent(new Event('submit',{ bubbles:true }));
    await new Promise(r => setTimeout(r,0));
    expect(toastSpy).toHaveBeenCalledWith('bad','error');
  });
});
