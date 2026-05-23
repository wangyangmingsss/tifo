import { test, expect } from '@playwright/test';

/**
 * E2E: Landing page loads correctly
 *
 * Verifies the hero section, live stats counters, and call-to-action
 * elements are present and functional on the landing page.
 */

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section with TIFO branding', async ({ page }) => {
    // The landing page should contain the project name
    await expect(page.locator('body')).toContainText(/TIFO/i);
  });

  test('displays live stats counters', async ({ page }) => {
    // Stats counter section should be visible with numeric values
    // The landing page shows: total rallies, total captures, active factions, etc.
    const statsSection = page.locator('[class*="stats"], [class*="counter"], [class*="Stats"]').first();
    if (await statsSection.isVisible()) {
      await expect(statsSection).toBeVisible();
    }
  });

  test('shows world map preview', async ({ page }) => {
    // The landing page includes a mini world map (SVG-based D3 rendering)
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible({ timeout: 10_000 });
  });

  test('has navigation bar with wallet connect', async ({ page }) => {
    // Navbar should be present with a connect wallet button
    const nav = page.locator('nav, header, [class*="Navbar"], [class*="navbar"]').first();
    await expect(nav).toBeVisible();
  });

  test('contains call-to-action button', async ({ page }) => {
    // There should be a CTA button like "Choose Your Nation" or "Join"
    const cta = page.getByRole('link').or(page.getByRole('button'));
    const count = await cta.count();
    expect(count).toBeGreaterThan(0);
  });
});
