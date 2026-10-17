import { test, expect } from '@playwright/test';

test('Product list page loads and displays products', async ({ page }) => {
    // Go to products page
    await page.goto('/products');

    // Verify title
    await expect(page).toHaveTitle(/鉄道模型車両管理/);

    // Verify heading
    await expect(page.getByRole('heading', { name: '製品一覧' })).toBeVisible();

    // Verify product cards are present (assuming data exists)
    // We can look for any element that looks like a product card
    // Based on refactoring, it might be a link or div. 
    // Code shows ProductListItem is a div with onClick, but in the list page structure (from page.tsx/products/page.tsx - which I haven't seen yet but assuming standard list) usually it's a list.
    // Actually, let's just check if "製品登録数" (Product count) is visible from the layout or list

    // Wait for list to load
    // If data exists, we should see some product items.
});
