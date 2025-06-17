import { describe, it, expect } from 'vitest';
import { renderGooeyButton } from './Gooey_button';

describe('Gooey Button Component', () => {
  it('returns SVG filter and button markup', () => {
    const html = renderGooeyButton();

    // it should include the goo filter SVG defs
    expect(html).toContain('<filter id="goo">');
    expect(html).toContain('feGaussianBlur');
    expect(html).toContain('feColorMatrix');
    expect(html).toContain('feBlend');

    // it should include the container div
    expect(html).toContain('class="gooey-button-container"');

    // it should include the button with the correct id and class
    expect(html).toContain('<button class="gooey-button" id="predict-button">Predict</button>');

    // it should include exactly four bubble spans
    const bubbleCount = (html.match(/<span class="bubble">/g) || []).length;
    expect(bubbleCount).toBe(4);
  });
});
