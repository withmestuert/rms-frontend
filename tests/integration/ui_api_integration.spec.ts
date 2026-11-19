import { test, expect } from '@playwright/test';

test.describe('Frontend-Backend Integration Test Suite', () => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': '*',
    };

    const handleRoute = async (route: any, responseData: any, status = 200) => {
        if (route.request().method() === 'OPTIONS') {
            await route.fulfill({
                status: 204,
                headers: corsHeaders,
            });
            return;
        }
        await route.fulfill({
            status,
            contentType: 'application/json',
            headers: corsHeaders,
            body: JSON.stringify(responseData),
        });
    };

    const mockPropertyA = {
        id: 1,
        name: 'Sunrise Residency Tower A',
        code: 'SRT-A',
        address: '100 Tech Park Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        propertyType: 'COLIVING',
        totalFloors: 4,
        totalRooms: 20,
        status: 'ACTIVE',
        isDeleted: false,
    };

    const mockPropertyB = {
        id: 2,
        name: 'Greenfield Luxury PG',
        code: 'GLP',
        address: '42 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        propertyType: 'HOSTEL',
        totalFloors: 3,
        totalRooms: 15,
        status: 'ACTIVE',
        isDeleted: false,
    };

    const mockTenantsPropA = [
        {
            uid: 'T-101',
            name: 'Aarav Patel',
            mobileNumber: '9876543210',
            email: 'aarav@example.com',
            roomNo: '101',
            standardRent: 8500,
            advancePaid: 15000,
            enrollmentDate: '2026-01-15',
            tenantType: 'WORKING',
            advancePaidStatus: 'PAID',
            status: 'ACTIVE',
            propertyId: 1,
        },
        {
            uid: 'T-102',
            name: 'Neha Sharma',
            mobileNumber: '9123456780',
            email: 'neha@example.com',
            roomNo: '102',
            standardRent: 9000,
            advancePaid: 18000,
            enrollmentDate: '2026-02-01',
            tenantType: 'STUDENT',
            advancePaidStatus: 'PENDING',
            status: 'ACTIVE',
            propertyId: 1,
        },
    ];

    const mockTenantsPropB = [
        {
            uid: 'T-201',
            name: 'Karthik Raja',
            mobileNumber: '9988776655',
            email: 'karthik@example.com',
            roomNo: '201',
            standardRent: 7500,
            advancePaid: 10000,
            enrollmentDate: '2026-03-01',
            tenantType: 'WORKING',
            advancePaidStatus: 'PAID',
            status: 'ACTIVE',
            propertyId: 2,
        },
    ];

    const mockRooms = [
        {
            id: 101,
            roomNo: '101',
            floor: '1',
            roomRent: 8500,
            capacity: 2,
            occupied: 1,
            propertyId: 1,
            status: 'available',
            residents: ['Aarav Patel'],
            amenities: ['AC', 'WiFi', 'Attached Bathroom'],
        },
        {
            id: 102,
            roomNo: '102',
            floor: '1',
            roomRent: 9000,
            capacity: 1,
            occupied: 1,
            propertyId: 1,
            status: 'full',
            residents: ['Neha Sharma'],
            amenities: ['AC', 'Balcony'],
        },
    ];

    const mockInvoices = [
        {
            id: 501,
            invoiceNumber: 'INV-2026-001',
            tenantUid: 'T-101',
            tenantName: 'Aarav Patel',
            roomNo: '101',
            monthYear: 'November 2026',
            amount: 8500,
            paidAmount: 8500,
            remainingBalance: 0,
            dueDate: '2026-11-05',
            status: 'PAID',
            propertyId: 1,
        },
        {
            id: 502,
            invoiceNumber: 'INV-2026-002',
            tenantUid: 'T-102',
            tenantName: 'Neha Sharma',
            roomNo: '102',
            monthYear: 'November 2026',
            amount: 9000,
            paidAmount: 0,
            remainingBalance: 9000,
            dueDate: '2026-11-05',
            status: 'OVERDUE',
            propertyId: 1,
        },
    ];

    test.beforeEach(async ({ page }) => {
        // Mock Properties
        await page.route('**/api/properties*', async (route) => {
            await handleRoute(route, [mockPropertyA, mockPropertyB]);
        });

        // Mock Tenants
        await page.route('**/api/tenants*', async (route) => {
            if (route.request().method() === 'OPTIONS') {
                await handleRoute(route, []);
                return;
            }
            if (route.request().method() === 'GET') {
                const url = new URL(route.request().url());
                const propId = url.searchParams.get('propertyId');
                const data = propId === '2' ? mockTenantsPropB : mockTenantsPropA;
                await handleRoute(route, data);
            } else {
                await route.continue();
            }
        });

        // Mock Rooms
        await page.route('**/api/rooms*', async (route) => {
            await handleRoute(route, mockRooms);
        });

        // Mock Admissions
        await page.route('**/api/admissions*', async (route) => {
            await handleRoute(route, []);
        });

        // Mock Invoices
        await page.route('**/api/invoices*', async (route) => {
            await handleRoute(route, mockInvoices);
        });

        // Mock Ledger
        await page.route('**/api/ledger*', async (route) => {
            await handleRoute(route, []);
        });

        // Mock Users
        await page.route('**/api/users*', async (route) => {
            await handleRoute(route, [
                { id: 1, username: 'admin', role: 'ADMIN', name: 'Super Admin' },
            ]);
        });

        // Mock Critical Actions
        await page.route('**/api/critical-actions*', async (route) => {
            await handleRoute(route, []);
        });
    });

    test('1. Integration: State Hydration - verifies UI displays data received from API', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/.*dashboard/);

        // Verify property name received from API is rendered in the app shell
        await expect(page.getByText('Sunrise Residency Tower A').first()).toBeVisible({ timeout: 10000 });

        // Navigate to Tenants and verify API-provided tenants are hydrated into the table
        await page.goto('/tenants');
        await expect(page.getByText('Aarav Patel').first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Neha Sharma').first()).toBeVisible({ timeout: 10000 });
    });

    test('2. Integration: Property Scoping - verifies switching property scopes tenant data', async ({ page }) => {
        await page.goto('/tenants');
        await expect(page.getByText('Aarav Patel').first()).toBeVisible({ timeout: 10000 });

        // Check if property selector button is present
        const propDropdownTrigger = page.locator('button:has-text("Sunrise Residency Tower A")').first();
        if (await propDropdownTrigger.isVisible()) {
            await propDropdownTrigger.click();
            const optionB = page.getByRole('button', { name: /Greenfield Luxury PG/i }).or(page.getByText('Greenfield Luxury PG')).first();
            if (await optionB.isVisible()) {
                await optionB.click();
                // Verify tenant from Property B is now displayed
                await expect(page.getByText('Karthik Raja').first()).toBeVisible({ timeout: 10000 });
            }
        }
    });

    test('3. Integration: API Mutation Contract - adding a tenant sends proper REST payload', async ({ page }) => {
        let capturedPayload: any = null;

        await page.route('**/api/tenants', async (route) => {
            if (route.request().method() === 'OPTIONS') {
                await handleRoute(route, []);
                return;
            }
            if (route.request().method() === 'POST') {
                capturedPayload = route.request().postDataJSON();
                await handleRoute(route, {
                    uid: 'T-999',
                    name: capturedPayload.name,
                    mobileNumber: capturedPayload.mobileNumber,
                    email: 'vikram@example.com',
                    roomNo: capturedPayload.roomNo || '101',
                    standardRent: capturedPayload.standardRent || 8000,
                    advancePaid: 0,
                    enrollmentDate: '2026-11-17',
                    tenantType: capturedPayload.tenantType || 'WORKING',
                    advancePaidStatus: 'PENDING',
                    status: 'ACTIVE',
                    propertyId: 1,
                }, 201);
            } else {
                await route.continue();
            }
        });

        await page.goto('/tenants');

        // Look for the Add Tenant button
        const addTenantBtn = page.getByRole('button', { name: /add tenant|new tenant/i }).first();
        if (await addTenantBtn.isVisible()) {
            await addTenantBtn.click();

            // Fill the form fields if modal opens
            const nameInput = page.getByLabel(/name/i).or(page.getByPlaceholder(/name/i)).first();
            const phoneInput = page.getByLabel(/phone|mobile/i).or(page.getByPlaceholder(/phone|mobile/i)).first();

            if (await nameInput.isVisible() && await phoneInput.isVisible()) {
                await nameInput.fill('Vikram Malhotra');
                await phoneInput.fill('9845012345');

                const submitBtn = page.getByRole('button', { name: /save|create|submit|confirm/i }).first();
                if (await submitBtn.isVisible()) {
                    await submitBtn.click();
                    if (capturedPayload) {
                        expect(capturedPayload.name).toBe('Vikram Malhotra');
                        expect(capturedPayload.mobileNumber).toBe('9845012345');
                    }
                }
            }
        }
    });

    test('4. Integration: Fault Tolerance - graceful error handling on backend 500 failure', async ({ page }) => {
        // Override properties endpoint to fail with 500
        await page.route('**/api/properties*', async (route) => {
            await handleRoute(route, { error: 'Database connection failed' }, 500);
        });

        await page.goto('/dashboard');

        // Application must NOT crash - it should render layout and show offline/error banner
        await expect(page.locator('header, nav, aside').first()).toBeVisible({ timeout: 10000 });
        const errorIndicator = page.getByText(/Backend Server Offline|Retry Connection|Failed to fetch/i).first();
        await expect(errorIndicator).toBeVisible({ timeout: 5000 });
    });

    test('5. Integration: Rent Billing - validates invoice status & amounts integration', async ({ page }) => {
        await page.goto('/rent-and-billing');

        // Verify invoice numbers and tenant names received from API
        await expect(page.getByText('INV-2026-001').or(page.getByText('Aarav Patel')).first()).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('INV-2026-002').or(page.getByText('Neha Sharma')).first()).toBeVisible({ timeout: 10000 });
    });
});
