import { describe, it, expect } from 'vitest';
import { renderAboutPage } from './About';

describe('About Page', () => {
  it('renders About content correctly', () => {
    document.body.innerHTML = renderAboutPage();

    const title = document.querySelector('h1.about-title');
    expect(title).not.toBeNull();
    expect(title?.textContent).toContain('About Me');

    const skills = document.querySelectorAll('.skills-list li');
    expect(skills.length).toBeGreaterThanOrEqual(3);

    const youtubeLink = document.querySelector('a[href*="youtube.com"]');
    const githubLink = document.querySelector('a[href*="github.com"]');
    expect(youtubeLink).not.toBeNull();
    expect(githubLink).not.toBeNull();
  });
});