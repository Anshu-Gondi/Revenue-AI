import { describe, it, expect, beforeEach } from 'vitest';
import { defineTour, startTour } from './Tour';

describe('Tour Module', () => {
  beforeEach(() => {
    // start with empty DOM
    document.body.innerHTML = '';
  });

  it('walks through defined steps, creating and removing tooltips', async () => {
    // set up two dummy elements in the page
    document.body.innerHTML = `
      <div id="step1" style="position:absolute; top:10px; left:20px;"></div>
      <div id="step2" style="position:absolute; top:50px; left:60px;"></div>
    `;
    const el1 = document.getElementById('step1')!;
    const el2 = document.getElementById('step2')!;

    defineTour([
      { el: el1, message: 'First message' },
      { el: el2, message: 'Second message' }
    ]);

    // startTour returns a promise that resolves after all steps are done
    const tourPromise = startTour();

    // Step 1 tooltip should appear
    let tip = document.querySelector('.tour-tooltip') as HTMLElement;
    expect(tip).not.toBeNull();
    expect(tip.textContent).toContain('First message');
    // simulate clicking Next
    (tip.querySelector('.tour-next') as HTMLButtonElement).click();

    // allow the promise to advance to next step
    await Promise.resolve();

    // Step 2 tooltip
    tip = document.querySelector('.tour-tooltip') as HTMLElement;
    expect(tip).not.toBeNull();
    expect(tip.textContent).toContain('Second message');
    ;(tip.querySelector('.tour-next') as HTMLButtonElement).click();

    // finally await tour completion
    await tourPromise;

    // no tooltips left
    expect(document.querySelector('.tour-tooltip')).toBeNull();
  });
});
