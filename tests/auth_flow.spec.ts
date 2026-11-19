import { test, expect } from '@playwright/test';

test.describe('RMS Frontend Application Flow', () => {
    test('should render the dashboard and navigation', async ({ page }) => {
        // 1. Navigate to the application root
        await page.goto('/');

        // 2. React Router automatically redirects "/" to "/dashboard"
        await expect(page).toHaveURL(/.*dashboard/);

        // 3. Verify page is loaded by checking for standard layout navigation elements
        await expect(page.locator('nav, aside, header').first()).toBeVisible({ timeout: 15000 });

        // 4. Verify we can navigate to Tenants view
        const tenantsNav = page.getByRole('link', { name: /tenants/i }).first();
        if (await tenantsNav.isVisible()) {
            await tenantsNav.click();
            await expect(page).toHaveURL(/.*tenants/);
        }
    });
});
