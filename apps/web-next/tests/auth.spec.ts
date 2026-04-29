import { test, expect } from '@playwright/test';

test('Login page loads', async ({ page }) => {
    await page.goto('/auth/signin');

    // Verify login form is present
    await expect(page.getByText('Googleアカウントでログイン')).toBeVisible();
});
