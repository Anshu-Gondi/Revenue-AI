import "./Navbar.css";
import { AuthService } from "../../Services/AuthService";

export function renderNavbar(): string {
  const isLoggedIn = !!AuthService.getAccessToken();

  const authLinks = isLoggedIn
    ? `<li><a href="#" id="logout-link">Logout</a></li>`
    : `
      <li><a href="#" id="login-link">Login</a></li>
      <li><a href="#" id="signup-link">Sign Up</a></li>
    `;

  // the first four links remain unchanged
  return `
  <div class="navbar-wrapper">
    <nav class="navbar">
      <div class="navbar-logo">Sales Predictor</div>
      <ul class="navbar-links">
        <li><a href="#" id="home-link">Home</a></li>
        <li><a href="#" id="predict-link">Predict</a></li>
        <li><a href="#" id="about-link">About</a></li>
        <li><a href="#" id="contact-link">Contact</a></li>
        ${authLinks}
      </ul>
    </nav>
  </div>
  `;
}

export function attachNavbarAuthListeners(renderers: {
  home: () => void;
  predict: () => void;
  about: () => void;
  contact: () => void;
  login: () => void;
  signup: () => void;
}) {
  document.getElementById('home-link')?.addEventListener('click', e => {
    e.preventDefault();
    renderers.home();
  });
  document.getElementById('predict-link')?.addEventListener('click', e => {
    e.preventDefault();
    renderers.predict();
  });
  document.getElementById('about-link')?.addEventListener('click', e => {
    e.preventDefault();
    renderers.about();
  });
  document.getElementById('contact-link')?.addEventListener('click', e => {
    e.preventDefault();
    renderers.contact();
  });

  const logInEl = document.getElementById('login-link');
  if (logInEl) logInEl.addEventListener('click', e => {
    e.preventDefault();
    renderers.login();
  });

  const signUpEl = document.getElementById('signup-link');
  if (signUpEl) signUpEl.addEventListener('click', e => {
    e.preventDefault();
    renderers.signup();
  });

  const logoutEl = document.getElementById('logout-link');
  if (logoutEl) logoutEl.addEventListener('click', e => {
    e.preventDefault();
    AuthService.logout();
  });
}
