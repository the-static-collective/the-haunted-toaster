const { test, expect } = require("@playwright/test");

const ALPHA_STATES = [
  "empty",
  "song-ready",
  "toast-feel",
  "six-up",
  "listener",
  "rendering",
  "complete",
  "failure",
];

for (const state of ALPHA_STATES) {
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
      await expect(page.locator("#toastFeelChoices")).toBeVisible();
      await expect(page.locator("#betaSixUpWindow")).toBeHidden();
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

    // Per-commit provenance is asserted above but must not churn visual baselines.
    await page.locator("#buildInfoSummary").evaluate((element) => {
      element.style.visibility = "hidden";
    });
    // Video/VSPantry is additive beta furniture with a dedicated witness below.
    // Keep long-running alpha images scoped to their ancestral state machine.
    for (const selector of ["#videoSourceMount", "#videoPantryWindow"]) {
      const surface = page.locator(selector);
      if (await surface.count()) {
        await surface.evaluate((element) => {
          element.style.display = "none";
        });
      }
    }

    await expect(page).toHaveScreenshot(`${state}.png`, {
      animations: "disabled",
      fullPage: true,
      maxDiffPixelRatio: state === "six-up" ? 0.011 : 0,
    });
  });
}

test("witness Video source and VSPantry", async ({ page }, testInfo) => {
  await page.goto("/?state=empty");
  await expect(page.locator("html")).toHaveAttribute("data-witness-ready", "true");
  expect(await page.evaluate(() => window.__consoleErrors)).toEqual([]);

  const source = page.locator("#videoSourceMount");
  const pantry = page.locator("#videoPantryWindow");
  const addToPantry = page.locator("#addVideoToPantry");
  await expect(source).toBeVisible();
  await expect(pantry).toBeVisible();
  await expect(addToPantry).toBeChecked();

  await page.locator("#videoDrop").click();
  await expect(page.locator("#videoDropTitle")).toHaveText("visual-specimen-1.mp4");
  await expect(page.locator("#videoDropHint")).toContainText("in VSPantry");
  await expect(page.locator("#videoPantryStatus")).toContainText("1 specimen");

  await page.locator("#videoFolderImport").click();
  await expect(page.locator("#videoPantryStatus")).toContainText("3 total");
  await expect(page.locator("#videoPantryStatus")).toContainText("2 admitted");
  await expect(page.locator("#videoPantryStatus")).toContainText("1 duplicates");

  await source.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("video-source.png"),
  });
  await pantry.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("video-vspantry.png"),
  });

  await page.locator("#removeVideo").click();
  await expect(page.locator("#videoDropTitle")).toHaveText("Add one video");
});

for (const state of ["beta-home", "beta-history"]) {
  test(`witness ${state}`, async ({ page }, testInfo) => {
    await page.goto(`/?state=${state}`);
    await expect(page.locator("html")).toHaveAttribute("data-witness-ready", "true");
    await expect(page.locator("body")).toHaveAttribute("data-ui-witness-commit", /.+/);
    expect(await page.evaluate(() => window.__consoleErrors)).toEqual([]);

    await expect(page.locator("#betaSixUpWindow")).toBeVisible();
    await expect(page.locator("#toastFeelChoices")).toBeHidden();
    await expect(page.locator("#betaSixUpGrid .beta-six-up-cell")).toHaveCount(6);
    await expect(page.locator("#videoSourceMount")).toBeVisible();
    await expect(page.locator("#videoPantryWindow")).toBeVisible();
    await expect(page.locator("#slateToastFeel")).toHaveText("Six-Up field");
    await expect(page.locator("#slateToastFeel").locator("xpath=../dt")).toHaveText("Creative field");
    await expect(page.locator(".candidate-modal")).toHaveClass(/is-hidden/);

    if (state === "beta-history") {
      await expect(page.locator("#recentToastsWindow")).toBeVisible();
      await expect(page.locator("#recentToastsList .recent-toast-row")).toHaveCount(3);
      await expect(page.locator("#recentToastsList")).toContainText("Jubilee");
      await expect(page.locator("#recentToastsList")).toContainText("ice9");
    } else {
      await expect(page.locator("#recentToastsWindow")).toBeHidden();
    }

    // Home candidate is the same candidate: choosing it opens the focused #179 room.
    await page.locator("#betaSixUpGrid .beta-six-up-cell").first().click();
    await expect(page.locator(".candidate-modal")).not.toHaveClass(/is-hidden/);
    const surface = page.locator(".candidate-surface");
    const scrollRegion = page.locator("#candidateGrid");
    expect(await surface.evaluate((element) => getComputedStyle(element).overflowY)).toBe("hidden");
    expect(await scrollRegion.evaluate((element) => getComputedStyle(element).overflowY)).toBe("auto");
    await page.locator(".candidate-close").click();

    await page.locator("#buildInfoSummary").evaluate((element) => {
      element.style.visibility = "hidden";
    });
    await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: true,
      path: testInfo.outputPath(`${state}.png`),
    });
  });
}

test("beta Home remains horizontally usable at 1080x720", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1080, height: 720 });
  await page.goto("/?state=beta-home");
  await expect(page.locator("html")).toHaveAttribute("data-witness-ready", "true");
  expect(await page.evaluate(() => window.__consoleErrors)).toEqual([]);
  await expect(page.locator("#betaSixUpGrid .beta-six-up-cell")).toHaveCount(6);

  const geometry = await page.evaluate(() => {
    const workspace = document.querySelector(".workspace").getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      workspaceLeft: workspace.left,
      workspaceRight: workspace.right,
    };
  });
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.workspaceLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.workspaceRight).toBeLessThanOrEqual(geometry.viewportWidth);
  await expect(page.locator("#videoDrop")).toBeVisible();
  await expect(page.locator("#betaSixUpWindow")).toBeVisible();
  await expect(page.locator("#renderButton")).toBeAttached();

  await page.locator("#buildInfoSummary").evaluate((element) => {
    element.style.visibility = "hidden";
  });
  await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    path: testInfo.outputPath("beta-home-1080x720.png"),
  });
});
