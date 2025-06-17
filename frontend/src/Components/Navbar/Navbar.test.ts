import { describe, it, beforeEach, vi, expect } from 'vitest';
import { renderNavbar, attachNavbarAuthListeners } from './Navbar';
import { AuthService } from '../../Services/AuthService';

// Mock AuthService
vi.mock('../../Services/AuthService', () => ({
  AuthService: {
    getAccessToken: vi.fn(),
    logout: vi.fn()
  }
}));

describe('Navbar Component', () => {
  beforeEach(() => {
    document.body.innerHTML = ''; // Reset DOM
  });

  it('renders login/signup links when not authenticated', () => {
    (AuthService.getAccessToken as any).mockReturnValue(null);

    document.body.innerHTML = renderNavbar();

    expect(document.querySelector('#login-link')).not.toBeNull();
    expect(document.querySelector('#signup-link')).not.toBeNull();
    expect(document.querySelector('#logout-link')).toBeNull();
  });

  it('renders logout link when authenticated', () => {
    (AuthService.getAccessToken as any).mockReturnValue('mock-token');

    document.body.innerHTML = renderNavbar();

    expect(document.querySelector('#login-link')).toBeNull();
    expect(document.querySelector('#signup-link')).toBeNull();
    expect(document.querySelector('#logout-link')).not.toBeNull();
  });

  it('attaches click listeners to all navbar links', () => {
    (AuthService.getAccessToken as any).mockReturnValue(null);
    document.body.innerHTML = renderNavbar();

    const renderers = {
      home: vi.fn(),
      predict: vi.fn(),
      about: vi.fn(),
      contact: vi.fn(),
      login: vi.fn(),
      signup: vi.fn(),
    };

    attachNavbarAuthListeners(renderers);

    document.getElementById('home-link')?.click();
    document.getElementById('predict-link')?.click();
    document.getElementById('about-link')?.click();
    document.getElementById('contact-link')?.click();
    document.getElementById('login-link')?.click();
    document.getElementById('signup-link')?.click();

    expect(renderers.home).toHaveBeenCalled();
    expect(renderers.predict).toHaveBeenCalled();
    expect(renderers.about).toHaveBeenCalled();
    expect(renderers.contact).toHaveBeenCalled();
    expect(renderers.login).toHaveBeenCalled();
    expect(renderers.signup).toHaveBeenCalled();
  });

  it('calls AuthService.logout when logout is clicked', () => {
    (AuthService.getAccessToken as any).mockReturnValue('mock-token');
    document.body.innerHTML = renderNavbar();

    const logoutLink = document.getElementById('logout-link');
    attachNavbarAuthListeners({
      home: vi.fn(),
      predict: vi.fn(),
      about: vi.fn(),
      contact: vi.fn(),
      login: vi.fn(),
      signup: vi.fn(),
    });

    logoutLink?.click();
    expect(AuthService.logout).toHaveBeenCalled();
  });
});
