import { test, expect } from '@playwright/test';

test.describe('Unauthenticated experience', () => {
  test('shows login prompt on root', async ({ page }) => {
    await page.goto('/');

    const heading = page.getByRole('heading', { name: /authentification process/i });
    await expect(heading).toBeVisible();

    await expect(
      page.getByText(/please log in with your google account/i)
    ).toBeVisible();

    await expect(
      page.locator('a[href$="/api/auth/google"]')
    ).toBeVisible();
  });

  test('shows login prompt on dashboard route', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(
      page.getByRole('heading', { name: /authentification process/i })
    ).toBeVisible();
  });
});
