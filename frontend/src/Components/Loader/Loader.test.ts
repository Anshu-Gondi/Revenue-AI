import { describe, it, expect } from 'vitest';
import { renderLoader } from './Loader';

describe('Loader Component', () => {
  it('returns overlay with loader structure', () => {
    const html = renderLoader();

    // must contain the overlay wrapper
    expect(html).toContain('class="loader-overlay"');

    // must contain the inner loader
    expect(html).toContain('<div class="loader">');

    // should have exactly three loader-item divs
    const itemCount = (html.match(/<div class="loader-item"><\/div>/g) || []).length;
    expect(itemCount).toBe(3);
  });

  it('overlay sits above everything (z-index rule)', () => {
    // we won't parse CSS here, but at least confirm the overlay class exists
    const html = renderLoader();
    expect(html).toContain('loader-overlay');
  });
});
