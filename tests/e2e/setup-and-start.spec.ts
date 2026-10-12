import { expect, test, type Page } from '@playwright/test';

// End-to-end smoke: open the app, start a game, get past the tutorial,
// and check the board is playable. Covers real rendering + routing + event
// dispatch in a real browser — the bits jsdom can't audit (SVG layout,
// color contrast, actual pointer events).
//
// Requires `npm run test:e2e:install` to have run once on the host (or
// PLAYWRIGHT_CHROMIUM_EXECUTABLE pointing at a Chromium the host ships).
// No step here is conditional: each waits for what it expects, so a dialog
// that appears late fails the test instead of being skipped.

const PREFS_KEY = 'helmets-clash:prefs:v1';

// Seed the UI prefs before the app reads them, so the tutorial never opens
// (and, where a test ends turns, the unmoved-units warning stays off).
const seedPrefs = (page: Page, prefs: Record<string, unknown>) =>
  page.addInitScript(([key, value]) => {
    window.localStorage.setItem(key, value);
  }, [PREFS_KEY, JSON.stringify({ tutorial: 'dismissed', ...prefs })] as const);

test.describe('app boots and plays through a turn', () => {
  test('new-game screen → tutorial → in-game board', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Helmets Clash/i })).toBeVisible();

    // Begin Campaign with defaults (seat 1 Human, seat 2 AI).
    await page.getByRole('button', { name: /Begin Campaign/i }).click();

    // The tutorial opens over the board on a first game; close it.
    const tutorial = page.getByRole('dialog', { name: /Welcome to Helmets Clash/i });
    await expect(tutorial).toBeVisible();
    await tutorial.getByRole('button', { name: /got it/i }).click();
    await expect(tutorial).toBeHidden();

    // In-game: board is rendered as an SVG with role="application".
    await expect(page.getByRole('application')).toBeVisible();
    await expect(page.getByRole('button', { name: /End Turn/ })).toBeEnabled();
  });

  test('settings modal opens and respects theme change', async ({ page }) => {
    await seedPrefs(page, {});
    await page.goto('/');
    await page.getByRole('button', { name: /Begin Campaign/i }).click();

    await page.getByRole('button', { name: /Open settings/i }).click();
    const settings = page.getByRole('dialog', { name: /Settings/i });
    await expect(settings).toBeVisible();

    // Toggle HC theme — documentElement's data-theme should flip. The radio
    // itself is visually hidden; a player clicks its label.
    await settings.locator('label', { hasText: 'High contrast' }).click();
    await expect(settings.getByRole('radio', { name: /High contrast/i })).toBeChecked();
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe('hc');
  });

  test('a game whose first seat is AI opens on the human, with End Turn enabled', async ({ page }) => {
    await seedPrefs(page, { confirmEndTurnWithActions: false });
    await page.goto('/');
    await page.getByLabel(/Change seat 1 kind; currently Human/i).click(); // human -> ai
    await page.getByLabel(/Change seat 2 kind; currently AI/i).click(); // ai -> empty
    await page.getByLabel(/Change seat 2 kind; currently Empty/i).click(); // empty -> human
    await page.getByRole('button', { name: /Begin Campaign/i }).click();

    await expect(page.getByText(/^Turn 1 · /)).not.toContainText('(waiting)');
    await page.getByRole('button', { name: /End Turn/ }).click();
    await expect(page.getByText(/^Turn 2 · /)).toBeVisible();
  });
});
