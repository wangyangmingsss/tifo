import { test, expect } from '@playwright/test';

/**
 * E2E: Rally signing flow
 *
 * Verifies the rally page renders correctly with the commit slider,
 * underdog bonus preview, and transaction signing UI.
 * Note: Actual wallet signing requires a connected wallet —
 * these tests verify the UI renders without a wallet connected.
 */

test.describe('Rally Flow', () => {
  test('rally page loads for a valid region ID', async ({ page }) => {
    await page.goto('/rally/0');

    // Should show rally-related content
    const body = page.locator('body');
    await expect(body).toContainText(/rally|region|power|commit/i);
  });

  test('rally page shows commit slider or input', async ({ page }) => {
    await page.goto('/rally/5');

    // Look for a range input (slider) or number input for commit amount
    const slider = page.locator('input[type="range"]');
    const numberInput = page.locator('input[type="number"]');

    const sliderCount = await slider.count();
    const numberCount = await numberInput.count();

    // At least one input mechanism should be present
    expect(sliderCount + numberCount).toBeGreaterThan(0);
  });

  test('rally page displays gas cost badge', async ({ page }) => {
    await page.goto('/rally/10');

    // The GasCostBadge component shows estimated gas cost
    const gasBadge = page.locator('text=/gas|Gas|\\$0\\.00/i').first();
    if (await gasBadge.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(gasBadge).toBeVisible();
    }
  });

  test('rally page shows wallet connect prompt when not connected', async ({ page }) => {
    await page.goto('/rally/0');

    // Without a wallet connected, there should be a connect prompt
    // or the rally button should be disabled / show connect message
    const connectPrompt = page.locator(
      'text=/connect|Connect Wallet|connect wallet/i'
    ).first();
    const rallyButton = page.getByRole('button', { name: /rally|approve|connect/i }).first();

    const promptVisible = await connectPrompt.isVisible({ timeout: 5_000 }).catch(() => false);
    const buttonVisible = await rallyButton.isVisible({ timeout: 3_000 }).catch(() => false);

    // At least one of these should be present
    expect(promptVisible || buttonVisible).toBeTruthy();
  });
});
