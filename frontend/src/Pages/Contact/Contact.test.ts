// src/Tests/Contact.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1) Hoist‑friendly mock factory with its own inner spy
vi.mock('../../Components/Toast/Toast', () => ({
  showToast: vi.fn()
}));

import { renderContactPage } from './Contact';
// now this import gets the mocked version
import { showToast } from '../../Components/Toast/Toast';

declare const global: any;

describe('Contact Page', () => {
  beforeEach(() => {
    // switch to fake timers so our setTimeout(…,0) listener fires immediately
    vi.useFakeTimers();

    // 2) fetch always resolves OK
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'OK' })
      })
    ) as any;

    // render and immediately run the zero‑delay callback
    document.body.innerHTML = renderContactPage();
    vi.runAllTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders contact form elements', () => {
    const form = document.getElementById('contactForm')!;
    expect(form).not.toBeNull();
    expect(form.querySelector('input[name="name"]')).toBeTruthy();
    expect(form.querySelector('input[name="email"]')).toBeTruthy();
    expect(form.querySelector('textarea[name="message"]')).toBeTruthy();
  });

  it('submits the form and shows success toast', async () => {
    const form = document.getElementById('contactForm')!;

    // fill in fields
    form.querySelector<HTMLInputElement>('input[name="name"]')!.value    = 'Alice';
    form.querySelector<HTMLInputElement>('input[name="email"]')!.value   = 'alice@example.com';
    form.querySelector<HTMLTextAreaElement>('textarea[name="message"]')!.value = 'Hi there';

    // dispatch submit
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // wait through both promise microtasks (fetch → json)
    await Promise.resolve();
    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledWith('OK', 'success');
  });
});
