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

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_ABBRS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

/**
 * Parses a month-year string like "October 2026", "Oct 2026", "2026-10" into structured components.
 */
export function parseMonthYear(str?: string): { year: number; monthIndex: number; monthName: string; key: string } | null {
  if (!str) return null;
  const cleaned = str.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;

  let mIdx = -1;
  let yr = -1;

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= 2000 && num <= 2100) {
      yr = num;
      continue;
    }
    const lower = part.toLowerCase();
    const foundIdx = MONTH_ABBRS.findIndex(abbr => lower.startsWith(abbr));
    if (foundIdx !== -1) {
      mIdx = foundIdx + 1;
    }
  }

  if (mIdx !== -1 && yr !== -1) {
    const monthName = MONTH_NAMES[mIdx - 1];
    return { year: yr, monthIndex: mIdx, monthName, key: `${monthName} ${yr}` };
  }
  return null;
}

/**
 * Robustly checks if two month-year strings refer to the same month and year
 * (e.g. "Oct 2026" and "October 2026").
 */
export function isSameMonthYear(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  const parsedA = parseMonthYear(a);
  const parsedB = parseMonthYear(b);
  if (parsedA && parsedB) {
    return parsedA.year === parsedB.year && parsedA.monthIndex === parsedB.monthIndex;
  }
  return false;
}

/**
 * Derives available months for the current year, including only:
 * 1. The current active calendar month
 * 2. Months that actually hold history of data (from verified invoices, payments, admissions)
 */
export function getAvailableMonths(
  invoices: Invoice[] = [],
  tenants: Tenant[] = []
): MonthOption[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIndex = now.getMonth() + 1; // 1-12
  const currentMonthName = MONTH_NAMES[currentMonthIndex - 1];
  const currentKey = `${currentMonthName} ${currentYear}`;

  // Map keyed by "year-monthIndex" to deduplicate
  const monthMap = new Map<string, MonthOption>();

  // 1. Current active month
  monthMap.set(`${currentYear}-${currentMonthIndex}`, {
    key: currentKey,
    label: `${currentKey} (Current Month)`,
    year: currentYear,
    monthIndex: currentMonthIndex,
    isCurrent: true,
  });

  // 2. Add months that hold history in invoices
  for (const inv of invoices) {
    const parsed = parseMonthYear(inv.monthYear);
    if (parsed) {
      const mapKey = `${parsed.year}-${parsed.monthIndex}`;
      if (!monthMap.has(mapKey)) {
        const isCur = parsed.year === currentYear && parsed.monthIndex === currentMonthIndex;
        monthMap.set(mapKey, {
          key: parsed.key,
          label: isCur ? `${parsed.key} (Current Month)` : parsed.key,
          year: parsed.year,
          monthIndex: parsed.monthIndex,
          isCurrent: isCur,
        });
      }
    }
  }

  // 3. Add months that hold history from tenant payments / join dates
  for (const tenant of tenants) {
    if (tenant.joinedDate) {
      const parsed = parseMonthYear(tenant.joinedDate);
      if (parsed) {
        const mapKey = `${parsed.year}-${parsed.monthIndex}`;
        if (!monthMap.has(mapKey)) {
          const isCur = parsed.year === currentYear && parsed.monthIndex === currentMonthIndex;
          monthMap.set(mapKey, {
            key: parsed.key,
            label: isCur ? `${parsed.key} (Current Month)` : parsed.key,
            year: parsed.year,
            monthIndex: parsed.monthIndex,
            isCurrent: isCur,
          });
        }
      }
    }
  }

  // Sort descending: highest year first, highest monthIndex first
  return Array.from(monthMap.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.monthIndex - a.monthIndex;
  });
}

// Fallback initial available months based on current year/month
export const AVAILABLE_MONTHS: MonthOption[] = getAvailableMonths();

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

  let joinYear = new Date().getFullYear();
  let joinMonth = 1;

  if (parts.length === 3) {
    const mIdx = monthNames.findIndex(m => parts[1].toLowerCase().startsWith(m));
    if (mIdx !== -1) joinMonth = mIdx + 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(y)) joinYear = y;
  } else if (tenant.joinedDate.includes('-')) {
    const p = tenant.joinedDate.split('-');
    if (p.length === 3) {
      joinYear = parseInt(p[0], 10) || joinYear;
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
  const dynamicMonths = getAvailableMonths(invoices, tenants);
  const monthOpt =
    dynamicMonths.find(m => isSameMonthYear(m.key, monthKey)) ||
    parseMonthYear(monthKey) ||
    dynamicMonths[0] || {
      key: monthKey,
      label: monthKey,
      year: new Date().getFullYear(),
      monthIndex: new Date().getMonth() + 1,
      isCurrent: true,
    };
  const { year, monthIndex } = monthOpt;
  const isCurrent = 'isCurrent' in monthOpt ? !!monthOpt.isCurrent : (year === new Date().getFullYear() && monthIndex === new Date().getMonth() + 1);

  // Filter tenants who were active in this property during this month
  const activeTenants = tenants.filter(t => isTenantActiveInMonth(t, year, monthIndex));

  const records: MonthTenantPaymentStatus[] = activeTenants.map(tenant => {
    // 1. Direct Invoice match with robust month-year normalization
    const matchingInvoice = invoices.find(
      inv =>
        (inv.tenantName.toLowerCase() === tenant.name.toLowerCase() ||
          inv.roomNumber === tenant.roomNumber ||
          (inv.tenantUid && inv.tenantUid === tenant.id)) &&
        isSameMonthYear(inv.monthYear, monthKey)
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
      const history = generateTenantPaymentHistory(tenant, invoices);
      const histRecord = history.find(
        h =>
          h.category === 'monthly_rent' &&
          isSameMonthYear(h.periodOrType, monthKey)
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
    const monthAbbr = MONTH_NAMES[monthIndex - 1]?.slice(0, 3) || 'Jan';
    const dynamicPaidDate = `05 ${monthAbbr} ${year}`;

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      roomNumber: tenant.roomNumber,
      monthlyRent: tenant.monthlyRent,
      status: isPaid ? 'paid' : 'pending',
      paidOn: isPaid ? dynamicPaidDate : undefined,
      paymentMode: isPaid ? mode : undefined,
      receiptNumber: isPaid ? `REC-${year}-${String(monthIndex).padStart(2, '0')}-${tenant.roomNumber}` : undefined,
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
