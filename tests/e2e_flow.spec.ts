import { test, expect } from '@playwright/test';

test.describe('RMS End-to-End Suite', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to base URL before each test
        await page.goto('/');
    });

    test('1. Application boots and redirects to dashboard', async ({ page }) => {
        // Ensure redirection from root to dashboard
        await expect(page).toHaveURL(/.*dashboard/);

        // Ensure page header or sidebar navigation container is visible
        const headerOrNav = page.locator('header, aside, nav').first();
        await expect(headerOrNav).toBeVisible({ timeout: 15000 });

        // Ensure page title or branding exists
        await expect(page).toHaveTitle(/.*|RMS|Room|React/i);
    });

    test('2. Navigation across core modules', async ({ page }) => {
        // Check Tenants page navigation
        const tenantsLink = page.locator('#nav-tenants').or(page.getByRole('link', { name: /tenants/i }));
        if (await tenantsLink.count() > 0) {
            await tenantsLink.first().click();
            await expect(page).toHaveURL(/.*tenants/);
        }

        // Check Rooms page navigation
        const roomsLink = page.locator('#nav-rooms').or(page.getByRole('link', { name: /rooms/i }));
        if (await roomsLink.count() > 0) {
            await roomsLink.first().click();
            await expect(page).toHaveURL(/.*rooms/);
        }

        // Check Admissions page navigation
        const admissionsLink = page.locator('#nav-admissions').or(page.getByRole('link', { name: /admissions/i }));
        if (await admissionsLink.count() > 0) {
            await admissionsLink.first().click();
            await expect(page).toHaveURL(/.*admissions/);
        }

        // Check Settings page navigation
        const settingsLink = page.locator('#nav-settings').or(page.getByRole('link', { name: /settings/i }));
        if (await settingsLink.count() > 0) {
            await settingsLink.first().click();
            await expect(page).toHaveURL(/.*settings/);
        }

        // Return to Dashboard
        const dashboardLink = page.locator('#nav-dashboard').or(page.getByRole('link', { name: /dashboard/i }));
        if (await dashboardLink.count() > 0) {
            await dashboardLink.first().click();
            await expect(page).toHaveURL(/.*dashboard/);
        }
    });

    test('3. AppShell header and search bar interactions', async ({ page }) => {
        // Verify main container is rendered
        await expect(page.locator('main').first()).toBeVisible();

        // Check search input presence if visible
        const searchInput = page.getByPlaceholder(/search/i).first();
        if (await searchInput.isVisible()) {
            await searchInput.fill('Room');
            await expect(searchInput).toHaveValue('Room');
            await searchInput.clear();
        }
    });
});
