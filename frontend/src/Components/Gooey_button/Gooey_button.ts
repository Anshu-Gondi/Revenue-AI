import './Gooey_button.css';

export function renderGooeyButton(): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1" class="goo-filter">
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  
                      0 1 0 0 0  
                      0 0 1 0 0  
                      0 0 0 20 -10" result="goo" />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
    <div class="gooey-button-container">
      <button class="gooey-button" id="predict-button">Predict</button>
      <span class="bubbles">
        <span class="bubble"></span>
        <span class="bubble"></span>
        <span class="bubble"></span>
        <span class="bubble"></span>
      </span>
    </div>
  `;
}
