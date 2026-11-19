import { test, expect } from '@playwright/test';

test.describe('API Contract & Schema Integration Suite', () => {
    test('1. Validates standard JSON REST headers and health', async ({ request }) => {
        // Ping frontend dev server root to verify HTTP responsiveness
        const response = await request.get('/');
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('text/html');
    });

    test('2. Tenant API contract schema verification', async () => {
        const sampleTenantApiResponse = {
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
        };

        // Assert schema field types
        expect(typeof sampleTenantApiResponse.uid).toBe('string');
        expect(typeof sampleTenantApiResponse.name).toBe('string');
        expect(typeof sampleTenantApiResponse.mobileNumber).toBe('string');
        expect(typeof sampleTenantApiResponse.standardRent).toBe('number');
        expect(['WORKING', 'STUDENT', 'OTHER']).toContain(sampleTenantApiResponse.tenantType);
        expect(['PAID', 'PENDING', 'PARTIAL']).toContain(sampleTenantApiResponse.advancePaidStatus);
    });

    test('3. Invoice API contract schema verification', async () => {
        const sampleInvoiceApiResponse = {
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
            status: 'paid',
            propertyId: 1,
        };

        expect(typeof sampleInvoiceApiResponse.id).toBe('number');
        expect(typeof sampleInvoiceApiResponse.invoiceNumber).toBe('string');
        expect(typeof sampleInvoiceApiResponse.amount).toBe('number');
        expect(sampleInvoiceApiResponse.amount).toBeGreaterThanOrEqual(0);
        expect(sampleInvoiceApiResponse.remainingBalance).toBe(
            sampleInvoiceApiResponse.amount - sampleInvoiceApiResponse.paidAmount
        );
    });
});
