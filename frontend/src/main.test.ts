/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// 1) Stub out style.css so main.ts can load immediately
vi.mock('./style.css', () => ({}));

// 2) Mock AuthService & Toast
vi.mock("./Services/AuthService", () => ({
  AuthService: { getAccessToken: vi.fn() },
}));
vi.mock("./Components/Toast/Toast", () => ({ showToast: vi.fn() }));

import { AuthService } from "./Services/AuthService";
import { showToast }   from "./Components/Toast/Toast";

describe("App shell (main.ts)", () => {
  beforeEach(async () => {
    // switch to fake timers so we can clear out the 600 ms scroll‐unlock timeout
    vi.useFakeTimers();

    vi.resetModules();
    document.body.innerHTML = `<div id="app"></div>`;

    // unauthenticated by default
    (AuthService.getAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

    // import and run main.ts (which calls renderHome() and schedules disableScrollTemporarily)
    await import("./main");

    // fast‑forward ALL timers so that disableScrollTemporarily's setTimeout runs immediately
    vi.runAllTimers();

    // back to real timers (just in case)
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("initially shows the Home page …", () => {
    const hero = document.querySelector(".hero-title")!;
    expect(hero.textContent).toBe("Welcome to the Sales Predictor");

    const btn = document.querySelector("#predict-button") as HTMLButtonElement;
    expect(btn.textContent).toBe("Predict");
  });

  it("when not logged in, clicking Predict shows an error toast and stays on login view", () => {
    const predictBtn = document.querySelector("#predict-button") as HTMLButtonElement;
    predictBtn.click();

    expect(showToast).toHaveBeenCalledWith(
      "Please log in to use prediction",
      "error"
    );
    // Should still be on the login form
    expect(document.querySelector("form#loginForm")).toBeTruthy();
  });

  it("when logged in, clicking Predict renders the prediction page", async () => {
    // simulate login
    (AuthService.getAccessToken as ReturnType<typeof vi.fn>).mockReturnValue("fake-jwt-token");

    // re‑import so renderHome logic picks up the new auth state
    vi.resetModules();
    document.body.innerHTML = `<div id="app"></div>`;
    await import("./main");

    const predictBtn = document.querySelector("#predict-button") as HTMLButtonElement;
    predictBtn.click();

    // wait one tick so the click handler finishes
    await new Promise(r => setTimeout(r, 0));

    // 1)  toast assertion to NOT expect a toast
    expect(showToast).not.toHaveBeenCalled();

    // 2) now the prediction page is rendered
    expect(document.querySelector(".prediction-title")!.textContent).toBe(
      "Smart Sales Prediction"
    );
    expect(document.querySelector("#fileInput")).toBeTruthy();
  });
});
