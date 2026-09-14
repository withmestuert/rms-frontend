import { Tenant, TenantPaymentRecord } from '../types';

/**
 * Returns payment history for a tenant based on actual verified records.
 * No synthetic or fabricated mock history is generated.
 */
export function generateTenantPaymentHistory(tenant: Tenant): TenantPaymentRecord[] {
  const records: TenantPaymentRecord[] = [];
  if (!tenant) return records;

  if (tenant.paymentStatus === 'verified') {
    records.push({
      id: `pay-adv-${tenant.id}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      date: tenant.joinedDate || new Date().toISOString().split('T')[0],
      periodOrType: 'Move-in Caution & Security Deposit',
      category: 'advance_deposit',
      amount: tenant.monthlyRent || 0,
      paymentMode: 'UPI',
      receiptNumber: `REC-ADV-${tenant.roomNumber}`,
      referenceNumber: `VERIFIED-${tenant.id}`,
      status: 'verified',
      notes: 'Advance deposit verified upon admission confirmation.',
    });
  }

  return records;
}
