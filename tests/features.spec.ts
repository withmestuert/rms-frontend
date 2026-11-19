import { test, expect } from '@playwright/test';

test.describe('RMS Feature Modules & Direct Routing', () => {
    test('Direct URL routing to key features', async ({ page }) => {
        // Direct route to /rooms
        await page.goto('/rooms');
        await expect(page).toHaveURL(/.*rooms/);
        await expect(page.locator('main, header').first()).toBeVisible();

        // Direct route to /admissions
        await page.goto('/admissions');
        await expect(page).toHaveURL(/.*admissions/);
        await expect(page.locator('main, header').first()).toBeVisible();

        // Direct route to /reports
        await page.goto('/reports');
        await expect(page).toHaveURL(/.*reports/);
        await expect(page.locator('main, header').first()).toBeVisible();

        // Direct route to /settings
        await page.goto('/settings');
        await expect(page).toHaveURL(/.*settings/);
        await expect(page.locator('main, header').first()).toBeVisible();
    });

    test('Unknown route redirects to dashboard gracefully', async ({ page }) => {
        await page.goto('/non-existent-route-404');
        await expect(page).toHaveURL(/.*dashboard/);
    });
});
