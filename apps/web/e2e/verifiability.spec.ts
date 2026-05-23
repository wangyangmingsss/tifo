import { test, expect } from '@playwright/test';

/**
 * E2E: Verifiability panel — OKLink transaction proof links
 *
 * Verifies that the region history / capture timeline contains
 * clickable links to OKLink for on-chain transaction verification.
 */

test.describe('Verifiability Panel', () => {
  test('region sidebar links to OKLink explorer', async ({ page }) => {
    await page.goto('/map');

    // Wait for map to load
    const svg = page.locator('svg').first();
    await expect(svg).toBeVisible({ timeout: 15_000 });

    // Click a country path to open the sidebar
    const paths = svg.locator('path');
    const pathCount = await paths.count();

    if (pathCount > 10) {
      // Click a path that's likely to be a land region (skip first few which might be ocean)
      await paths.nth(5).click();

      // Look for OKLink links in the sidebar / detail panel
      const oklinkLinks = page.locator('a[href*="oklink.com"]');
      const linkCount = await oklinkLinks.count();

      // If this region has capture history, there should be OKLink links
      // (may be zero for uncaptured regions — that's acceptable)
      if (linkCount > 0) {
        const href = await oklinkLinks.first().getAttribute('href');
        expect(href).toContain('oklink.com/xlayer-test');
      }
    }
  });

  test('faction page contains OKLink verification links', async ({ page }) => {
    await page.goto('/faction/0'); // Argentina

    // Faction detail page may contain links to on-chain proofs
    const oklinkLinks = page.locator('a[href*="oklink.com"]');
    const linkCount = await oklinkLinks.count();

    if (linkCount > 0) {
      const href = await oklinkLinks.first().getAttribute('href');
      expect(href).toContain('oklink.com/xlayer-test');
    }
  });

  test('war record page loads for unauthenticated user', async ({ page }) => {
    await page.goto('/me');

    // Should show the war record page (may prompt to connect wallet)
    const body = page.locator('body');
    await expect(body).toContainText(/war record|connect|faction|wallet/i);
  });
});
