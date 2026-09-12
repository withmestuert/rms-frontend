import { Tenant, Invoice } from '../types';
import { generateTenantPaymentHistory } from '../data/tenantPayments';

export interface MonthOption {
  key: string;
  label: string;
  year: number;
  monthIndex: number; // 1 to 12
  isCurrent?: boolean;
}

export interface MonthTenantPaymentStatus {
  tenantId: string;
  tenantName: string;
  roomNumber: string;
  monthlyRent: number;
  status: 'paid' | 'pending' | 'overdue';
  paidOn?: string;
  paymentMode?: string;
  receiptNumber?: string;
  invoiceId?: string;
  joinedDate: string;
}

export interface MonthlyRentSummary {
  monthKey: string;
  monthLabel: string;
  year: number;
  monthIndex: number;
  isCurrent: boolean;
  totalTenants: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  upiCount: number;
  cashCount: number;
  upiAmount: number;
  cashAmount: number;
  collectionPercentage: number;
  totalBilledAmount: number;
  totalCollectedAmount: number;
  totalPendingAmount: number;
  records: MonthTenantPaymentStatus[];
}

export const AVAILABLE_MONTHS: MonthOption[] = [
  { key: 'October 2024', label: 'October 2024 (Current Month)', year: 2024, monthIndex: 10, isCurrent: true },
  { key: 'September 2024', label: 'September 2024', year: 2024, monthIndex: 9 },
  { key: 'August 2024', label: 'August 2024', year: 2024, monthIndex: 8 },
  { key: 'July 2024', label: 'July 2024', year: 2024, monthIndex: 7 },
  { key: 'June 2024', label: 'June 2024', year: 2024, monthIndex: 6 },
  { key: 'May 2024', label: 'May 2024', year: 2024, monthIndex: 5 },
  { key: 'April 2024', label: 'April 2024', year: 2024, monthIndex: 4 },
  { key: 'March 2024', label: 'March 2024', year: 2024, monthIndex: 3 },
  { key: 'February 2024', label: 'February 2024', year: 2024, monthIndex: 2 },
  { key: 'January 2024', label: 'January 2024', year: 2024, monthIndex: 1 },
];

/**
 * Checks if a tenant had moved in before or during the specified year/month.
 */
export function isTenantActiveInMonth(tenant: Tenant, targetYear: number, targetMonth: number): boolean {
  if (!tenant.joinedDate) return true;

  const parts = tenant.joinedDate.trim().split(' ');
  const monthNames = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];

  let joinYear = 2024;
  let joinMonth = 1;

  if (parts.length === 3) {
    const mIdx = monthNames.findIndex(m => parts[1].toLowerCase().startsWith(m));
    if (mIdx !== -1) joinMonth = mIdx + 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(y)) joinYear = y;
  } else if (tenant.joinedDate.includes('-')) {
    const p = tenant.joinedDate.split('-');
    if (p.length === 3) {
      joinYear = parseInt(p[0], 10) || 2024;
      joinMonth = parseInt(p[1], 10) || 1;
    }
  }

  if (joinYear < targetYear) return true;
  if (joinYear === targetYear && joinMonth <= targetMonth) return true;
  return false;
}

/**
 * Fetches and aggregates monthly rent payment realization data for the chosen month.
 */
export function getMonthlyRentSummary(
  monthKey: string,
  tenants: Tenant[],
  invoices: Invoice[]
): MonthlyRentSummary {
  const monthOpt =
    AVAILABLE_MONTHS.find(m => m.key === monthKey) || AVAILABLE_MONTHS[0];
  const { year, monthIndex, isCurrent } = monthOpt;

  // Filter tenants who were active in this property during this month
  const activeTenants = tenants.filter(t => isTenantActiveInMonth(t, year, monthIndex));

  const records: MonthTenantPaymentStatus[] = activeTenants.map(tenant => {
    // 1. Direct Invoice match
    const matchingInvoice = invoices.find(
      inv =>
        (inv.tenantName.toLowerCase() === tenant.name.toLowerCase() ||
          inv.roomNumber === tenant.roomNumber) &&
        inv.monthYear.toLowerCase() === monthKey.toLowerCase()
    );

    if (matchingInvoice) {
      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        roomNumber: tenant.roomNumber,
        monthlyRent: matchingInvoice.amount || tenant.monthlyRent,
        status: matchingInvoice.status,
        paidOn: matchingInvoice.paidOn,
        paymentMode: matchingInvoice.paymentMode,
        receiptNumber: matchingInvoice.invoiceNumber,
        invoiceId: matchingInvoice.id,
        joinedDate: tenant.joinedDate,
      };
    }

    // 2. Historical Month lookup from tenant payment records
    if (!isCurrent) {
      const history = generateTenantPaymentHistory(tenant);
      const histRecord = history.find(
        h =>
          h.category === 'monthly_rent' &&
          h.periodOrType.toLowerCase().includes(monthKey.toLowerCase())
      );

      if (histRecord) {
        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          roomNumber: tenant.roomNumber,
          monthlyRent: histRecord.amount,
          status: 'paid',
          paidOn: histRecord.date,
          paymentMode: histRecord.paymentMode,
          receiptNumber: histRecord.receiptNumber,
          joinedDate: tenant.joinedDate,
        };
      }
    }

    // 3. Current month default fallback: check tenant paymentStatus
    const isPaid = tenant.paymentStatus === 'verified';
    const parsedRoom = parseInt(tenant.roomNumber.replace(/\D/g, '') || '1', 10);
    const mode = parsedRoom % 3 === 0 ? 'Cash' : 'UPI';

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      monthlyRent: tenant.monthlyRent,
      status: isPaid ? 'paid' : 'pending',
      paidOn: isPaid ? '05 Oct 2024' : undefined,
      paymentMode: isPaid ? mode : undefined,
      receiptNumber: isPaid ? `REC-2024-10-${tenant.roomNumber}` : undefined,
      joinedDate: tenant.joinedDate,
    };
  });

  const totalTenants = records.length;
  const paidRecords = records.filter(r => r.status === 'paid');
  const paidCount = paidRecords.length;
  const pendingCount = records.filter(r => r.status === 'pending').length;
  const overdueCount = records.filter(r => r.status === 'overdue').length;
  const collectionPercentage =
    totalTenants > 0 ? parseFloat(((paidCount / totalTenants) * 100).toFixed(1)) : 0;

  // Differentiate UPI vs Cash
  const upiRecords = paidRecords.filter(r => (r.paymentMode || 'UPI').toUpperCase().includes('UPI'));
  const cashRecords = paidRecords.filter(r => (r.paymentMode || '').toUpperCase().includes('CASH'));
  // Any other methods (NEFT/Card) bucketed or count
  const upiCount = upiRecords.length;
  const cashCount = cashRecords.length;
  const upiAmount = upiRecords.reduce((acc, r) => acc + r.monthlyRent, 0);
  const cashAmount = cashRecords.reduce((acc, r) => acc + r.monthlyRent, 0);

  const totalBilledAmount = records.reduce((acc, r) => acc + r.monthlyRent, 0);
  const totalCollectedAmount = paidRecords.reduce((acc, r) => acc + r.monthlyRent, 0);
  const totalPendingAmount = totalBilledAmount - totalCollectedAmount;

  return {
    monthKey: monthOpt.key,
    monthLabel: monthOpt.label,
    year,
    monthIndex,
    isCurrent: !!isCurrent,
    totalTenants,
    paidCount,
    pendingCount,
    overdueCount,
    upiCount,
    cashCount,
    upiAmount,
    cashAmount,
    collectionPercentage,
    totalBilledAmount,
    totalCollectedAmount,
    totalPendingAmount,
    records,
  };
}
