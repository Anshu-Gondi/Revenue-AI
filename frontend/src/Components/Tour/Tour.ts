import './Tour.css'

type Step = { el: HTMLElement; message: string };

let steps: Step[] = [];

/**
 * Define the steps of the tour.
 * @param s An array of { el, message } objects.
 */
export function defineTour(s: Step[]) {
  steps = s;
}

/**
 * Run the tour: for each step, show a tooltip and wait for the user to click “Next.”
 */
export async function startTour() {
  for (const step of steps) {
    const { el, message } = step;
    const rect = el.getBoundingClientRect();

    // Create tooltip
    const tip = document.createElement('div');
    tip.className = 'tour-tooltip';
    tip.innerHTML = `
      <p class="tour-message">${message}</p>
      <button class="tour-next">Next ›</button>
    `;
    document.body.appendChild(tip);

    // Position it below the element (adjust as needed)
    tip.style.top  = `${rect.bottom + 8}px`;
    tip.style.left = `${rect.left}px`;

    // Wait for “Next” click
    await new Promise<void>(resolve => {
      tip.querySelector('.tour-next')!
        .addEventListener('click', () => {
          tip.remove();
          resolve();
        });
    });
  }
}
