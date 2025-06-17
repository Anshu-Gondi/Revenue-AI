import './style.css';
import { renderNavbar, attachNavbarAuthListeners } from './Components/Navbar/Navbar';
import { renderGooeyButton }     from './Components/Gooey_button/Gooey_button';
import { renderAboutPage }       from './Pages/About/About';
import { renderContactPage }     from './Pages/Contact/Contact';
import { renderPredictionPage }  from './Pages/Predication/Predication';
import { renderLoginPage }       from './Pages/Login/Login';
import { renderSignupPage }      from './Pages/Signup/Signup';
import { AuthService }           from './Services/AuthService';
import { showToast }             from './Components/Toast/Toast';

const app = document.querySelector<HTMLDivElement>('#app')!;

type Page = 'home' | 'about' | 'contact' | 'predict' | 'login' | 'signup';
let currentPage: Page = 'home';

function renderWithFlip(target: Page, content: string) {
  const direction = getFlipDirection(currentPage, target);
  currentPage = target;
  disableScrollTemporarily();

  app.innerHTML = `
    <div class="page">
      ${renderNavbar()}
      <main class="main-content page-content ${direction}">
        ${content}
      </main>
    </div>
  `;

  attachNavbarAuthListeners({
    home:   renderHome,
    predict: renderPredict,
    about:  renderAbout,
    contact: renderContact,
    login:   renderLogin,
    signup:  renderSignup
  });
}

function getFlipDirection(from: Page, to: Page): string {
  const order: Page[] = ['home','about','contact','predict','login','signup'];
  return order.indexOf(to) > order.indexOf(from) ? 'page-flip-left' : 'page-flip-right';
}

function disableScrollTemporarily(duration = 600) {
  document.body.style.overflow = 'hidden';
  setTimeout(() => { document.body.style.overflow = ''; }, duration);
}

// ─── Pages ─────────────────────────────────────────────────────────

function renderHome() {
  renderWithFlip('home', `
    <h1 class="hero-title">Welcome to the Sales Predictor</h1>
    <p class="hero-subtitle">Predict your business future with confidence.</p>
    <div class="button-container">${renderGooeyButton()}</div>
  `);

  document.getElementById('predict-button')?.addEventListener('click', e => {
    e.preventDefault();
    renderPredict();
  });
}

function renderAbout() {
  renderWithFlip('about', renderAboutPage());
}

function renderContact() {
  renderWithFlip('contact', renderContactPage());
}

function renderPredict() {
  // if not logged in, force login
  if (!AuthService.getAccessToken()) {
    showToast('Please log in to use prediction', 'error');
    return renderLogin();
  }
  renderWithFlip('predict', renderPredictionPage());
}

function renderLogin() {
  renderWithFlip('login', renderLoginPage());
}

function renderSignup() {
  renderWithFlip('signup', renderSignupPage());
}

// ─── Initialize ────────────────────────────────────────────────────
renderHome();
