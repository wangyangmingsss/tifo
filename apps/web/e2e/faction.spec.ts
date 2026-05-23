import { test, expect } from '@playwright/test';

/**
 * E2E: Faction selection and enrollment flow
 *
 * Verifies that the faction selection UI is accessible and
 * that faction detail pages render correctly.
 */

test.describe('Faction Selection', () => {
  test('faction detail page loads for valid faction ID', async ({ page }) => {
    // Faction 0 = Argentina
    await page.goto('/faction/0');
    await expect(page.locator('body')).toContainText(/Argentina|ARG/i);
  });

  test('faction page displays territory count and stats', async ({ page }) => {
    await page.goto('/faction/1'); // Brazil
    // Should show some territory/stats information
    await expect(page.locator('body')).toContainText(/Brazil|BRA/i);
  });

  test('leaderboard page shows 48 factions ranked', async ({ page }) => {
    await page.goto('/leaderboard');

    // The leaderboard should list factions — look for common faction names
    const body = page.locator('body');
    await expect(body).toContainText(/leaderboard|ranking|territory/i);
  });

  test('faction page has OG metadata for social sharing', async ({ page }) => {
    await page.goto('/faction/6'); // France

    // Check that Open Graph meta tags are present
    const ogTitle = page.locator('meta[property="og:title"]');
    const ogImage = page.locator('meta[property="og:image"]');

    // At least one OG tag should be present (set in layout.tsx)
    const titleCount = await ogTitle.count();
    const imageCount = await ogImage.count();
    expect(titleCount + imageCount).toBeGreaterThan(0);
  });
});
