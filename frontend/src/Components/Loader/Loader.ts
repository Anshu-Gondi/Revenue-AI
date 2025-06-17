import "./Loader.css";

export function renderLoader(): string {
  return `
  <div class="loader-overlay">
    <div class="loader">
        <div class="loader-item"></div>
        <div class="loader-item"></div>
        <div class="loader-item"></div>
    </div>
  </div>
  `;
}
