import { test, expect, devices } from '@playwright/test';

/**
 * E2E: Mobile layout responsiveness
 *
 * Verifies that key pages render correctly on mobile viewports.
 * Uses iPhone 13 viewport (390×844).
 */

test.describe('Mobile Layout', () => {
  test.use({ ...devices['iPhone 13'] });

  test('landing page is responsive on mobile', async ({ page }) => {
    await page.goto('/');

    // Page should not have horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // allow small tolerance

    // TIFO branding should still be visible
    await expect(page.locator('body')).toContainText(/TIFO/i);
  });

  test('map page renders on mobile viewport', async ({ page }) => {
    await page.goto('/map');

    // SVG map should still render on mobile
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible({ timeout: 15_000 });

    // SVG should fit within the mobile viewport
    const svgBox = await svg.boundingBox();
    if (svgBox) {
      expect(svgBox.width).toBeLessThanOrEqual(420); // iPhone 13 width + margin
    }
  });

  test('navigation is accessible on mobile', async ({ page }) => {
    await page.goto('/');

    // Navbar should be visible (may be a hamburger menu on mobile)
    const nav = page.locator('nav, header, [class*="Navbar"], [class*="navbar"]').first();
    await expect(nav).toBeVisible();
  });

  test('rally page is usable on mobile', async ({ page }) => {
    await page.goto('/rally/0');

    // The rally interface should be visible and not overflow
    const body = page.locator('body');
    await expect(body).toContainText(/rally|region|power/i);

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('leaderboard is scrollable on mobile', async ({ page }) => {
    await page.goto('/leaderboard');

    const body = page.locator('body');
    await expect(body).toContainText(/leaderboard|ranking|territory/i);
  });
});
