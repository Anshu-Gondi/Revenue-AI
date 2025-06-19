/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// 1) Stub out style.css
vi.mock('./style.css', () => ({}));

// 2) Mock AuthService, Toast, **Tour**
vi.mock("./Services/AuthService", () => ({
  AuthService: { getAccessToken: vi.fn() },
}));
vi.mock("./Components/Toast/Toast", () => ({ showToast: vi.fn() }));
vi.mock("./Components/Tour/Tour",   () => ({
  defineTour: () => {},
  startTour:  () => Promise.resolve()
}));

import { AuthService } from "./Services/AuthService";
import { showToast }   from "./Components/Toast/Toast";

describe("App shell (main.ts)", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    document.body.innerHTML = `<div id="app"></div>`;

    // unauthenticated by default
    (AuthService.getAccessToken as any).mockReturnValue(null);

    await import("./main.ts");
    vi.runAllTimers();
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
    expect(document.querySelector("form#loginForm")).toBeTruthy();
  });

  it("when logged in, clicking Predict renders the prediction page", async () => {
    (AuthService.getAccessToken as any).mockReturnValue("fake-jwt-token");

    vi.resetModules();
    document.body.innerHTML = `<div id="app"></div>`;
    await import("./main.ts");

    const predictBtn = document.querySelector("#predict-button") as HTMLButtonElement;
    predictBtn.click();

    vi.useFakeTimers();
    vi.runAllTimers();
    vi.useRealTimers();

    expect(showToast).not.toHaveBeenCalled();
    expect(document.querySelector(".prediction-title")!.textContent).toBe(
      "Smart Sales Prediction"
    );
    expect(document.querySelector("#fileInput")).toBeTruthy();
  });
});
