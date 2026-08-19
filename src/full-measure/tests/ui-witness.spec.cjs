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
      const surface = page.locator(".candidate-surface");
      const scrollRegion = page.locator("#candidateGrid");
      const crossMark = page.locator("#candidateCrossMark");
      const cross = page.locator("#candidateCross");
      await expect(cards).toHaveCount(6);
      await expect(crossMark).toBeVisible();
      await expect(crossMark).toHaveText("Mark CROSS parent");
      await expect(cross).toBeVisible();
      await expect(cross).toHaveText("CROSS A + B");
      await expect(scrollRegion).toHaveCount(1);

      const actionBox = await actions.boundingBox();
      const cardBoxes = await cards.evaluateAll((items) => items.map((item) => {
        const box = item.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      }));
      expect(Math.max(...cardBoxes.map(({ bottom }) => bottom))).toBeLessThanOrEqual(actionBox.y);

      const before = await surface.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          clientWidth: element.clientWidth,
          overflowY: getComputedStyle(element).overflowY,
        };
      });
      const gridBefore = await scrollRegion.evaluate((element) => ({
        clientWidth: element.clientWidth,
        overflowY: getComputedStyle(element).overflowY,
      }));
      expect(before.overflowY).toBe("hidden");
      expect(gridBefore.overflowY).toBe("auto");

      for (let index = 0; index < 6; index += 1) {
        await cards.nth(index).hover();
      }

      const after = await surface.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          clientWidth: element.clientWidth,
          overflowY: getComputedStyle(element).overflowY,
        };
      });
      const gridAfter = await scrollRegion.evaluate((element) => ({ clientWidth: element.clientWidth }));
      expect(after).toEqual(before);
      expect(gridAfter.clientWidth).toBe(gridBefore.clientWidth);
    }
    if (state === "rendering") {
      await expect(page.locator(".toast-feel:disabled")).toHaveCount(7);
    }
    // Provenance remains asserted above, but its per-commit text must not churn visual baselines.
    await page.locator("#buildInfoSummary").evaluate((element) => {
      element.style.visibility = "hidden";
    });
    // Video/VSPantry is an additive source surface with its own live browser witness below.
    // Keep the long-running canonical state baselines scoped to the pre-existing state machine.
    const videoSource = page.locator("#videoSourceBlock");
    if (await videoSource.count()) {
      await videoSource.evaluate((element) => {
        element.style.display = "none";
      });
    }
    await expect(page).toHaveScreenshot(`${state}.png`, {
      animations: "disabled",
      fullPage: true,
      // The six-up footer intentionally gained two visible CROSS controls in #147.
      // Keep the old canonical image as a broad visual guard while admitting only
      // the inspected 1% footer delta; every other state remains pixel-strict.
      maxDiffPixelRatio: state === "six-up" ? 0.011 : 0,
    });
  });
}

test("witness Video source and VSPantry", async ({ page }, testInfo) => {
  await page.goto("/?state=empty");
  await expect(page.locator("html")).toHaveAttribute("data-witness-ready", "true");
  expect(await page.evaluate(() => window.__consoleErrors)).toEqual([]);

  const block = page.locator("#videoSourceBlock");
  const addToPantry = page.locator("#addVideoToPantry");
  await expect(block).toBeVisible();
  await expect(addToPantry).toBeChecked();

  const checkboxBox = await addToPantry.boundingBox();
  expect(checkboxBox.width).toBeLessThanOrEqual(18);
  expect(checkboxBox.height).toBeLessThanOrEqual(18);

  await page.locator("#videoDrop").click();
  await expect(page.locator("#videoDropTitle")).toHaveText("visual-specimen-1.mp4");
  await expect(page.locator("#videoDropHint")).toContainText("in VSPantry");
  await expect(page.locator("#videoPantryStatus")).toContainText("1 specimen");

  await page.locator("#videoFolderImport").click();
  await expect(page.locator("#videoPantryStatus")).toContainText("3 total");
  await expect(page.locator("#videoPantryStatus")).toContainText("2 admitted");
  await expect(page.locator("#videoPantryStatus")).toContainText("1 duplicates");

  await block.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("video-vspantry.png"),
  });

  await page.locator("#removeVideo").click();
  await expect(page.locator("#videoDropTitle")).toHaveText("Add one video");
});
