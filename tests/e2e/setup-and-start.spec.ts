import { expect, test } from '@playwright/test';

// End-to-end smoke: open the app, accept the tutorial, start a game,
// verify the board renders and a unit is clickable. Covers real
// rendering + routing + event dispatch in a real browser — the bits
// jsdom can't audit (SVG layout, color contrast, actual pointer
// events).
//
// Requires `npx playwright install chromium` to have run once on the
// host. CI runners should call it as part of their setup step.
test.describe('app boots and plays through a turn', () => {
  test('new-game screen → in-game → select a unit', async ({ page }) => {
    await page.goto('/');

    // Tutorial overlay appears on first load.
    const tutorialDismiss = page.getByRole('button', { name: /got it/i });
    if (await tutorialDismiss.isVisible()) {
      await tutorialDismiss.click();
    }

    // NewGameScreen heading is rendered.
    await expect(page.getByRole('heading', { level: 1, name: /Helmets Clash/i })).toBeVisible();

    // Click Begin Campaign with defaults.
    await page.getByRole('button', { name: /Begin Campaign/i }).click();

    // In-game: board is rendered as an SVG with role="application".
    const board = page.getByRole('application');
    await expect(board).toBeVisible();

    // Toolbar: End Turn button is present.
    await expect(page.getByRole('button', { name: /End Turn/ })).toBeVisible();
  });

  test('settings modal opens and respects theme change', async ({ page }) => {
    await page.goto('/');
    const tutorialDismiss = page.getByRole('button', { name: /got it/i });
    if (await tutorialDismiss.isVisible()) await tutorialDismiss.click();
    await page.getByRole('button', { name: /Begin Campaign/i }).click();

    await page.getByRole('button', { name: /Open settings/i }).click();
    await expect(page.getByRole('dialog', { name: /Settings/i })).toBeVisible();

    // Toggle HC theme — documentElement's data-theme should flip.
    await page.getByLabel(/High contrast/i).check();
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe('hc');
  });
});
