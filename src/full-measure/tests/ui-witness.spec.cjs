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
    // Video/VSPantry is additive source furniture with dedicated beta/source witnesses below.
    // Keep the long-running alpha state baselines scoped to the pre-existing state machine.
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
  const switchTrack = page.locator(".video-pantry-track");
  await expect(source).toBeVisible();
  await expect(pantry).toBeVisible();
  await expect(addToPantry).toBeChecked();
  await expect(switchTrack).toBeVisible();

  const switchBox = await switchTrack.boundingBox();
  expect(switchBox.width).toBeLessThanOrEqual(28);
  expect(switchBox.height).toBeLessThanOrEqual(16);

  await page.locator("#videoDrop").click();
  await expect(page.locator("#videoDropTitle")).toHaveText("visual-specimen-1.mp4");
  await expect(page.locator("#videoDropHint")).toContainText("in VSPantry");
  await expect(page.locator("#videoPantryStatus")).toContainText("1 specimen");

  await page.locator("#videoFolderImport").click();
  await expect(page.locator("#videoPantryStatus")).toContainText("3 total");
  await expect(page.locator("#videoPantryStatus")).toContainText("2 admitted");
  await expect(page.locator("#videoPantryStatus")).toContainText("1 duplicates");

  await page.locator(".inputs-panel").screenshot({
    animations: "disabled",
    path: testInfo.outputPath("video-vspantry.png"),
  });

  await page.locator("#removeVideo").click();
  await expect(page.locator("#videoDropTitle")).toHaveText("Add one video");
});

for (const state of ["beta-home", "beta-history"]) {
  test(`witness ${state}`, async ({ page }) => {
    await page.goto(`/?state=${state}`);
    await expect(page.locator("html")).toHaveAttribute("data-witness-ready", "true");
    await expect(page.locator("body")).toHaveAttribute("data-ui-witness-commit", /.+/);
    expect(await page.evaluate(() => window.__consoleErrors)).toEqual([]);

    await expect(page.locator("#betaSixUpWindow")).toBeVisible();
    await expect(page.locator("#toastFeelChoices")).toBeHidden();
    await expect(page.locator("#betaSixUpGrid .beta-six-up-cell")).toHaveCount(6);
    await expect(page.locator("#videoSourceMount")).toBeVisible();
    await expect(page.locator("#videoPantryWindow")).toBeVisible();

    if (state === "beta-history") {
      await expect(page.locator("#recentToastsWindow")).toBeVisible();
      await expect(page.locator("#recentToastsList .recent-toast-row")).toHaveCount(3);
      await expect(page.locator("#recentToastsList")).toContainText("Jubilee");
      await expect(page.locator("#recentToastsList")).toContainText("ice9");
    } else {
      await expect(page.locator("#recentToastsWindow")).toBeHidden();
    }

    await page.locator("#buildInfoSummary").evaluate((element) => {
      element.style.visibility = "hidden";
    });
    await expect(page).toHaveScreenshot(`${state}.png`, {
      animations: "disabled",
      fullPage: true,
    });
  });
}

test("beta home remains horizontally usable at Electron minimum 1080x720", async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 720 });
  await page.goto("/?state=beta-home");
  await expect(page.locator("html")).toHaveAttribute("data-witness-ready", "true");
  expect(await page.evaluate(() => window.__consoleErrors)).toEqual([]);

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
  await expect(page.locator("#betaSixUpGrid .beta-six-up-cell")).toHaveCount(6);
  await expect(page.locator("#renderButton")).toBeAttached();

  await page.locator("#buildInfoSummary").evaluate((element) => {
    element.style.visibility = "hidden";
  });
  await expect(page).toHaveScreenshot("beta-home-compact.png", {
    animations: "disabled",
    fullPage: true,
  });
});
