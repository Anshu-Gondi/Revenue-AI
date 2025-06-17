import { describe, it, expect, beforeEach, vi } from 'vitest';

let showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;

describe('Toast Module', () => {
  beforeEach(async () => {
    // Reset JSDOM
    document.body.innerHTML = '';
    // Reset timers & mocks
    vi.useFakeTimers();
    vi.resetModules();

    // Stub requestAnimationFrame so 'show' is added synchronously
    // @ts-ignore
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => cb(0);

    // Dynamically import a fresh module instance
    const mod = await import('./Toast');
    showToast = mod.showToast;
  });

  it('creates a single toast-container and appends a toast', () => {
    showToast('Hello world', 'success');

    const container = document.querySelector('.toast-container');
    expect(container).not.toBeNull();

    const toasts = container!.querySelectorAll('.toast');
    expect(toasts.length).toBe(1);

    const toast = toasts[0];
    // should have both "toast" and "success" and "show" classes
    expect(toast.classList.contains('toast')).toBe(true);
    expect(toast.classList.contains('success')).toBe(true);
    expect(toast.classList.contains('show')).toBe(true);

    // icon and message markup
    expect(toast.innerHTML).toContain('<span class="toast-icon">✅</span>');
    expect(toast.innerHTML).toContain('<span class="toast-message">Hello world</span>');
  });

  it('reuses the same container on subsequent calls', () => {
    showToast('One', 'info');
    showToast('Two', 'warning');

    const containers = document.querySelectorAll('.toast-container');
    expect(containers.length).toBe(1);

    const toasts = containers[0].querySelectorAll('.toast');
    expect(toasts.length).toBe(2);
  });

  it('auto‑removes the toast after the delay', () => {
    showToast('Temp', 'error');
    const container = document.querySelector('.toast-container')!;
    expect(container.querySelectorAll('.toast').length).toBe(1);

    // advance to removal
    vi.advanceTimersByTime(3500);
    // advance the removal animation delay
    vi.advanceTimersByTime(300);

    expect(container.querySelectorAll('.toast').length).toBe(0);
  });
});
