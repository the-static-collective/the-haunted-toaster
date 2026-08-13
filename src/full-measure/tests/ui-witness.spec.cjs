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
