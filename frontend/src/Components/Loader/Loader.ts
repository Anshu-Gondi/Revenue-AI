import "./Loader.css";

export function renderLoader(): string {
  return `
  <div class="loader-overlay">
    <div class="loader">
        <div class="loader-item"></div>
        <div class="loader-item"></div>
        <div class="loader-item"></div>
        <div class="loader-core"></div>
        <div class="loader-particles">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
    </div>
  </div>
  `;
}
