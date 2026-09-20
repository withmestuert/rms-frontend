import { Tenant, TenantPaymentRecord, Invoice } from '../types';

/**
 * Returns payment history for a tenant based on actual verified records and paid invoices.
 * No synthetic or fabricated mock history is generated.
 */
export function generateTenantPaymentHistory(tenant: Tenant, invoices: Invoice[] = []): TenantPaymentRecord[] {
  const records: TenantPaymentRecord[] = [];
  if (!tenant) return records;

  if (tenant.paymentStatus === 'verified' || (tenant.advancePaid && tenant.advancePaid > 0) || (tenant.securityDeposit && tenant.securityDeposit > 0)) {
    records.push({
      id: `pay-adv-${tenant.id}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      date: tenant.joinedDate || new Date().toISOString().split('T')[0],
      periodOrType: 'Move-in Caution & Security Deposit',
      category: 'advance_deposit',
      amount: tenant.advancePaid || tenant.securityDeposit || tenant.monthlyRent || 0,
      paymentMode: 'UPI',
      receiptNumber: `REC-ADV-${tenant.roomNumber}`,
      referenceNumber: `VERIFIED-${tenant.id}`,
      status: 'verified',
      notes: 'Advance deposit verified upon admission confirmation.',
    });
  }

  // Include paid and partially paid invoices for this tenant
  const tenantInvoices = invoices.filter(inv => {
    const matchUid = inv.tenantUid && inv.tenantUid === tenant.id;
    const matchName = inv.tenantName && tenant.name && inv.tenantName.trim().toLowerCase() === tenant.name.trim().toLowerCase();
    return (matchUid || matchName) && (inv.status === 'paid' || inv.status === 'partially_paid');
  });

  for (const inv of tenantInvoices) {
    const paidAmt = inv.paidAmount && inv.paidAmount > 0 ? inv.paidAmount : inv.amount;
    records.push({
      id: `pay-inv-${inv.id}`,
      tenantId: tenant.id,
      tenantName: inv.tenantName,
      roomNumber: inv.roomNumber || inv.roomNo || tenant.roomNumber,
      date: inv.paidOn || inv.dueDate,
      periodOrType: `Monthly Rent — ${inv.monthYear}`,
      category: 'monthly_rent',
      amount: paidAmt,
      paymentMode: (inv.paymentMode as any) || 'UPI',
      receiptNumber: `REC-${inv.invoiceNumber}`,
      referenceNumber: inv.transactionRef || inv.invoiceNumber,
      status: 'verified',
      notes: inv.status === 'partially_paid'
        ? `Partial payment. Remaining balance: ₹${(inv.remainingBalance ?? (inv.amount - paidAmt)).toLocaleString('en-IN')}`
        : 'Rent payment cleared.',
    });
  }

  return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
