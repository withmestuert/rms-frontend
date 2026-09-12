import { Tenant, TenantPaymentRecord } from '../types';

// Helper to generate full chronological payment history for any tenant from the beginning
export function generateTenantPaymentHistory(tenant: Tenant): TenantPaymentRecord[] {
  const records: TenantPaymentRecord[] = [];
  const rent = tenant.monthlyRent || 8000;
  const advanceAmount = rent * 2; // Standard 2-month refundable caution/security deposit

  // Parse joined date (e.g., "12 Jan 2024", "01 Nov 2023", "2024-10-25")
  let startYear = 2024;
  let startMonth = 1; // 1 = Jan

  if (tenant.joinedDate) {
    const parts = tenant.joinedDate.split(' ');
    if (parts.length === 3) {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const mIdx = monthNames.findIndex(m => parts[1].toLowerCase().startsWith(m.toLowerCase()));
      if (mIdx !== -1) startMonth = mIdx + 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(y)) startYear = y;
    } else if (tenant.joinedDate.includes('-')) {
      const p = tenant.joinedDate.split('-');
      if (p.length === 3) {
        startYear = parseInt(p[0], 10) || 2024;
        startMonth = parseInt(p[1], 10) || 10;
      }
    }
  }

  // 1. Initial Advance / Security Caution Deposit (Always at the beginning)
  const depositDateFormatted = `05 ${getMonthName(startMonth)} ${startYear}`;
  records.push({
    id: `pay-adv-${tenant.id}`,
    tenantId: tenant.id,
    tenantName: tenant.name,
    roomNumber: tenant.roomNumber,
    date: depositDateFormatted,
    periodOrType: 'Move-in Caution & Security Deposit (Refundable)',
    category: 'advance_deposit',
    amount: advanceAmount,
    paymentMode: 'NEFT',
    receiptNumber: `REC-ADV-${startYear}-${tenant.roomNumber.padStart(3, '0')}`,
    referenceNumber: `NEFT/B${startYear}0981${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'verified',
    notes: '2-Month Security Deposit received at admission. Refundable on notice settlement.',
  });

  // 2. Monthly Rent Payments from Move-in Date through October 2024
  const currentYear = 2024;
  const currentMonth = 10; // Oct 2024

  let curY = startYear;
  let curM = startMonth;

  while (curY < currentYear || (curY === currentYear && curM <= currentMonth)) {
    const monthName = getMonthName(curM);
    const day = Math.min(2 + (curM % 4), 6);
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateStr = `${dayStr} ${monthName} ${curY}`;

    // Differentiate primarily between UPI (Instant digital) and Cash (Desk physical voucher)
    const modes: Array<'UPI' | 'Cash'> = ['UPI', 'UPI', 'Cash', 'UPI', 'UPI'];
    const mode = modes[(curM + (parseInt(tenant.roomNumber.replace(/\D/g, '') || '1', 10))) % modes.length];
    const isUpi = mode === 'UPI';

    records.push({
      id: `pay-rent-${tenant.id}-${curY}-${curM}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      date: dateStr,
      periodOrType: `Monthly Rent — ${monthName} ${curY}`,
      category: 'monthly_rent',
      amount: rent,
      paymentMode: mode,
      receiptNumber: `REC-${curY}-${String(curM).padStart(2, '0')}-${tenant.roomNumber}`,
      referenceNumber: isUpi
        ? `UPI/UTR${curY}${String(curM).padStart(2, '0')}${Math.floor(100000 + Math.random() * 900000)}`
        : `CSH/VCHR-${curY}${String(curM).padStart(2, '0')}-${tenant.roomNumber}`,
      status: 'verified',
      notes: isUpi
        ? 'Instant digital settlement via UPI QR / VPA. Automated verification.'
        : 'Physical cash received at manager desk; physical cash receipt voucher issued.',
    });

    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }

  // Reverse so newest is first in the list, or keep chronological
  // Usually users want either newest-first or chronological with advance clearly flagged
  return records.reverse();
}

function getMonthName(monthNum: number): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return months[(monthNum - 1 + 12) % 12];
}
