const { test, expect } = require("@playwright/test");

for (const state of [
  "empty",
  "song-ready",
  "toast-feel",
  "six-up",
  "listener",
  "rendering",
  "complete",
  "failure",
  "past-toasts-empty",
  "past-toasts",
  "toast-detail",
  "retoast-armed",
  "thoughtline",
  "past-toast-missing-media",
]) {
  test(`witness ${state}`, async ({ page }) => {
    await page.goto(`/?state=${state}`);
    await expect(page.locator("html")).toHaveAttribute("data-witness-ready", "true");
    await expect(page.locator("body")).toHaveAttribute("data-ui-witness-commit", /.+/);
    expect(await page.evaluate(() => window.__consoleErrors)).toEqual([]);
    if (state === "toast-feel") {
      const ordinary = page.locator(".toast-feel:not(.toast-feel--madd-clown)");
      const maddClown = page.locator(".toast-feel--madd-clown");
      await expect(ordinary).toHaveCount(6);
      await expect(maddClown).toHaveCount(1);
      const ordinaryBoxes = await ordinary.evaluateAll((buttons) =>
        buttons.map((button) => ({ width: button.offsetWidth, height: button.offsetHeight })));
      expect(new Set(ordinaryBoxes.map(({ width }) => width)).size).toBe(1);
      expect(new Set(ordinaryBoxes.map(({ height }) => height)).size).toBe(1);
      expect((await maddClown.boundingBox()).height).toBeGreaterThan(ordinaryBoxes[0].height);

      await page.locator('[data-toast-feel-id="wire-heat"]').focus();
      await page.keyboard.press("End");
      await expect(maddClown).toHaveAttribute("aria-checked", "true");
      await page.locator('[data-toast-feel-id="wire-heat"]').click();
    }
    if (state === "six-up") {
      const cards = page.locator(".candidate-card");
      const actions = page.locator(".candidate-actions");
      await expect(cards).toHaveCount(6);
      const actionBox = await actions.boundingBox();
      const cardBoxes = await cards.evaluateAll((items) => items.map((item) => {
        const box = item.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      }));
      expect(Math.max(...cardBoxes.map(({ bottom }) => bottom))).toBeLessThanOrEqual(actionBox.y);
    }
    if (state === "rendering") {
      await expect(page.locator(".toast-feel:disabled")).toHaveCount(7);
    }
    if (state === "past-toasts-empty") {
      await expect(page.locator("#pastToastsDrawer")).not.toHaveClass(/is-hidden/);
      await expect(page.locator("#pastToastsList")).toContainText("No past toasts yet");
    }
    if (state === "past-toasts" || state === "toast-detail") {
      const card = page.locator("[data-past-toast]");
      await expect(card).toHaveCount(1);
      await expect(card).toContainText("Dreamstate Divide");
      await expect(card.locator("[data-toast-rating]")).toHaveCount(5);
      await expect(card.locator('[data-toast-artifact="receipt"]')).toBeEnabled();
      await expect(card.locator('[data-toast-artifact="score"]')).toBeEnabled();
      await expect(card.locator('[data-toast-artifact="timeline"]')).toBeEnabled();
    }
    if (state === "retoast-armed") {
      await expect(page.locator("#pastToastsDrawer")).toHaveClass(/is-hidden/);
      await expect(page.locator("#retoastBadge")).not.toHaveClass(/is-hidden/);
      await expect(page.locator("#retoastBadge")).toContainText("Re-toast armed · Dreamstate Divide");
    }
    if (state === "thoughtline") {
      await expect(page.locator("[data-thoughtline-node]")).toHaveCount(3);
      await expect(page.locator("[data-thoughtline-edge]")).toHaveCount(2);
      await expect(page.locator("[data-thoughtline-edge]").first()).toHaveAttribute("data-evidence-count", /[1-9]/);
    }
    if (state === "past-toast-missing-media") {
      const card = page.locator("[data-past-toast]");
      await expect(card).toContainText("Video unavailable");
      await expect(card.locator('[data-toast-artifact="video"]')).toBeDisabled();
      await expect(card.locator('[data-toast-artifact="receipt"]')).toBeEnabled();
    }
    // Provenance remains asserted above, but its per-commit text must not churn visual baselines.
    await page.locator("#buildInfoSummary").evaluate((element) => {
      element.style.visibility = "hidden";
    });
    await expect(page).toHaveScreenshot(`${state}.png`, {
      animations: "disabled",
      fullPage: true,
    });
  });
}