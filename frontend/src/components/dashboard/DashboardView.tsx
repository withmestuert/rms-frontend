import React, { useState, useMemo, useEffect } from 'react';
import {
    DoorOpen,
    UserPlus,
    Eye,
    CheckCircle2,
    AlertTriangle,
    ChevronRight,
    Terminal,
    Calendar,
    CreditCard,
    Clock,
    Send,
    Check,
    Building,
    TrendingUp,
    ArrowRight,
    FileCheck,
    Banknote,
    Smartphone,
    ExternalLink,
} from 'lucide-react';
import { CriticalAction, Admission, Room, Tenant, Invoice, PageId, VacateRequest } from '../../types';
import { apiService } from '../../services/apiService';
import { VacateRequestsModal } from './VacateRequestsModal';
import {
    AVAILABLE_MONTHS,
    getAvailableMonths,
    getMonthlyRentSummary,
    MonthTenantPaymentStatus,
} from '../../utils/monthlyRentTracker';

interface DashboardViewProps {
    rooms: Room[];
    admissions: Admission[];
    tenants: Tenant[];
    invoices: Invoice[];
    criticalActions: CriticalAction[];
    onActionDismiss: (id: string) => void;
    onNavigate: (page: PageId) => void;
    onQuickAdmission: () => void;
    onRecordPayment?: (invoiceId: string, paymentMode: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
    rooms,
    admissions,
    tenants,
    invoices,
    criticalActions,
    onActionDismiss,
    onNavigate,
    onQuickAdmission,
    onRecordPayment,
}) => {
    const availableMonths = useMemo(() => {
        return getAvailableMonths(invoices, tenants);
    }, [invoices, tenants]);

    const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>(
        () => availableMonths[0]?.key || `${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()}`
    );
    const [statusFilter, setStatusFilter] = useState<'all' | 'upi' | 'cash' | 'pending'>('all');
    const [markedPaidLoading, setMarkedPaidLoading] = useState<string | null>(null);
    const [reminderSentTenant, setReminderSentTenant] = useState<string | null>(null);
    const [vacateRequests, setVacateRequests] = useState<VacateRequest[]>([]);
    const [isVacateModalOpen, setIsVacateModalOpen] = useState(false);

    // Keep selectedMonth aligned with available months that hold data
    useEffect(() => {
        if (availableMonths.length > 0 && !availableMonths.some(m => m.key.toLowerCase() === selectedMonth.toLowerCase())) {
            setSelectedMonth(availableMonths[0].key);
        }
    }, [availableMonths]);

    const loadVacateRequests = React.useCallback(async () => {
        try {
            const list = await apiService.getVacateRequests();
            setVacateRequests(list);
        } catch (err) {
            console.error('Failed to fetch vacate requests:', err);
        }
    }, []);

    React.useEffect(() => {
        loadVacateRequests();
    }, [loadVacateRequests]);

    // --- 1. Property Inventory Calculations for Compact Strip ---
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(
        r => r.occupied < r.capacity || r.status === 'vacate_notice'
    ).length;
    const totalOccupied = rooms.reduce((acc, r) => acc + r.occupied, 0);
    const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
    const totalVacant = Math.max(0, totalCapacity - totalOccupied);
    const occupancyPercentage =
        totalCapacity > 0 ? ((totalOccupied / totalCapacity) * 100).toFixed(1) : '0.0';

    // --- 2. Monthly Rent Payment Summary (Fetches data based on selected month) ---
    const rentSummary = useMemo(() => {
        return getMonthlyRentSummary(selectedMonth, tenants, invoices);
    }, [selectedMonth, tenants, invoices]);

    // Filter records within the selected month differentiating UPI vs Cash
    const filteredRentRecords = useMemo(() => {
        if (statusFilter === 'all') return rentSummary.records;
        if (statusFilter === 'upi') {
            return rentSummary.records.filter(
                r => r.status === 'paid' && (r.paymentMode || 'UPI').toUpperCase().includes('UPI')
            );
        }
        if (statusFilter === 'cash') {
            return rentSummary.records.filter(
                r => r.status === 'paid' && (r.paymentMode || '').toUpperCase().includes('CASH')
            );
        }
        return rentSummary.records.filter(r => r.status === 'pending' || r.status === 'overdue');
    }, [rentSummary, statusFilter]);

    // --- 3. Recent Enrolled Tenants with Active Status & Real-time Room Rent ---
    const recentEnrolledTenants = useMemo(() => {
        const activeTenants = (tenants || []).filter(
            t => t.status !== 'vacated' && t.status !== 'inactive'
        );

        if (activeTenants.length > 0) {
            return activeTenants.map(t => {
                const matchingAdm = (admissions || []).find(
                    a =>
                        (a.phone && a.phone === t.phone) ||
                        (a.residentName && a.residentName.toLowerCase() === t.name.toLowerCase()) ||
                        (a.roomNumber === t.roomNumber && (a as any).status !== 'VACATED')
                );
                return {
                    id: t.id,
                    residentName: t.name,
                    phone: t.phone,
                    roomNumber: t.roomNumber,
                    monthlyRent: t.monthlyRent,
                    moveInDate: matchingAdm?.moveInDate || t.joinedDate || 'Active Resident',
                    status: t.status === 'notice' ? 'Notice' : 'Active',
                    paymentStatus: t.paymentStatus === 'verified' ? 'Advance Paid' : 'Auto-Verified',
                };
            });
        }

        // Fallback: active admissions
        return (admissions || [])
            .filter(a => {
                const s = (a.status || '').toUpperCase();
                return s !== 'VACATED' && s !== 'CANCELLED';
            })
            .map(a => {
                const matchingTenant = (tenants || []).find(
                    t =>
                        (t.phone && t.phone === a.phone) ||
                        (t.name && t.name.toLowerCase() === a.residentName.toLowerCase()) ||
                        t.roomNumber === a.roomNumber
                );
                return {
                    id: a.id,
                    residentName: a.residentName,
                    phone: a.phone,
                    roomNumber: a.roomNumber,
                    monthlyRent: matchingTenant?.monthlyRent ?? a.monthlyRent,
                    moveInDate: a.moveInDate || 'Active Resident',
                    status: 'Active',
                    paymentStatus: 'Auto-Verified',
                };
            });
    }, [tenants, admissions]);

    // Handle marking rent as paid directly differentiating Cash and UPI
    const handleQuickMarkAsPaid = async (record: MonthTenantPaymentStatus, mode: 'UPI' | 'Cash') => {
        if (!onRecordPayment) return;
        setMarkedPaidLoading(`${record.tenantId}-${mode}`);

        // If there's an existing invoice ID, use it
        if (record.invoiceId) {
            await onRecordPayment(record.invoiceId, mode);
        } else {
            // Fallback: search by tenant name/room in invoices
            const inv = invoices.find(
                i =>
                    (i.tenantName.toLowerCase() === record.tenantName.toLowerCase() ||
                        i.roomNumber === record.roomNumber) &&
                    i.status !== 'paid'
            );
            if (inv) {
                await onRecordPayment(inv.id, mode);
            }
        }

        setTimeout(() => {
            setMarkedPaidLoading(null);
        }, 400);
    };

    const handleSendReminder = (tenantName: string) => {
        setReminderSentTenant(tenantName);
        setTimeout(() => {
            setReminderSentTenant(null);
        }, 2200);
    };

    return (
        <div className="flex flex-col w-full gap-5">
            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2.5">
                <button
                    onClick={() => onNavigate('rooms')}
                    className="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/80 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                    <DoorOpen className="w-4 h-4 text-slate-600" />
                    <span>View Rooms</span>
                </button>

                <button
                    onClick={onQuickAdmission}
                    className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>New Admission</span>
                </button>
            </div>

            {/* 2-COLUMN SECTION:
          - Left (col-span-7/8): Monthly Rent Paid Card with Dropdown (fetches previous months data)
          - Right (col-span-5/4): Vacate Requests Desk (Vertical Box on Top Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT: Monthly Rent Paid Card */}
                <div className="lg:col-span-7 xl:col-span-8 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
                    {/* Card Header with Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <h2 className="text-sm font-bold text-[#091426] tracking-tight">
                                    Tenant Rent Collection Status
                                </h2>
                            </div>
                        </div>

                        {/* Dropdown for Month Selection (Current & Previous Months) */}
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                </div>
                                <select
                                    value={selectedMonth}
                                    onChange={e => {
                                        setSelectedMonth(e.target.value);
                                        setStatusFilter('all');
                                    }}
                                    className="h-8.5 pl-8 pr-8 bg-slate-50 hover:bg-slate-100/80 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer appearance-none"
                                >
                                    {availableMonths.map(m => (
                                        <option key={m.key} value={m.key}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 text-[10px]">
                                    ▼
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Paid vs Total Highlight Row */}
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Monthly Rent ({selectedMonth})
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-extrabold text-[#091426] tracking-tight tabular-nums font-display">
                                    {rentSummary.paidCount}
                                </span>
                                <span className="text-slate-400 text-base font-semibold">
                                    / {rentSummary.totalTenants} Tenants Paid
                                </span>
                                <span
                                    className={`ml-1 text-xs font-bold px-2 py-0.5 rounded-full border ${rentSummary.collectionPercentage === 100
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : rentSummary.collectionPercentage >= 70
                                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                                            : 'bg-amber-100 text-amber-800 border-amber-200'
                                        }`}
                                >
                                    {rentSummary.collectionPercentage}% Cleared
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full md:w-64 bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${rentSummary.collectionPercentage === 100
                                        ? 'bg-emerald-600'
                                        : 'bg-blue-600'
                                        }`}
                                    style={{ width: `${rentSummary.collectionPercentage}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Financial Totals */}
                        <div className="grid grid-cols-3 gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-200/80 md:pl-5 text-right">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Collected</span>
                                <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
                                    ₹{rentSummary.totalCollectedAmount.toLocaleString('en-IN')}
                                </span>
                                <div className="text-[10px] font-mono text-slate-500 mt-0.5 space-y-0.5">
                                    <div className="text-indigo-700 font-semibold flex items-center justify-end gap-1">
                                        <Smartphone className="w-2.5 h-2.5 shrink-0" />
                                        <span>₹{rentSummary.upiAmount.toLocaleString('en-IN')} UPI ({rentSummary.upiCount})</span>
                                    </div>
                                    <div className="text-emerald-800 font-semibold flex items-center justify-end gap-1">
                                        <Banknote className="w-2.5 h-2.5 shrink-0" />
                                        <span>₹{rentSummary.cashAmount.toLocaleString('en-IN')} Cash ({rentSummary.cashCount})</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-amber-700 block">Pending</span>
                                <span className="text-sm font-bold text-amber-700 font-mono tabular-nums">
                                    ₹{rentSummary.totalPendingAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-slate-400 block">{rentSummary.pendingCount + rentSummary.overdueCount} due</span>
                                <span className="text-[9px] text-slate-400 block font-mono">No Grace Time</span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Billed</span>
                                <span className="text-sm font-bold text-slate-800 font-mono tabular-nums">
                                    ₹{rentSummary.totalBilledAmount.toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] text-slate-400 block">{rentSummary.totalTenants} active</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter Tabs & Notification */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold flex-wrap">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${statusFilter === 'all'
                                    ? 'bg-white text-slate-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                All ({rentSummary.totalTenants})
                            </button>
                            <button
                                onClick={() => setStatusFilter('upi')}
                                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${statusFilter === 'upi'
                                    ? 'bg-white text-indigo-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-indigo-700'
                                    }`}
                            >
                                <Smartphone className="w-3 h-3 text-indigo-600" />
                                <span>UPI Paid ({rentSummary.upiCount})</span>
                            </button>
                            <button
                                onClick={() => setStatusFilter('cash')}
                                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${statusFilter === 'cash'
                                    ? 'bg-white text-emerald-800 shadow-2xs'
                                    : 'text-slate-600 hover:text-emerald-800'
                                    }`}
                            >
                                <Banknote className="w-3 h-3 text-emerald-600" />
                                <span>Cash Paid ({rentSummary.cashCount})</span>
                            </button>
                            <button
                                onClick={() => setStatusFilter('pending')}
                                className={`px-2.5 py-1 rounded-md transition-colors ${statusFilter === 'pending'
                                    ? 'bg-white text-amber-700 shadow-2xs'
                                    : 'text-slate-600 hover:text-amber-700'
                                    }`}
                            >
                                Pending ({rentSummary.pendingCount + rentSummary.overdueCount})
                            </button>
                        </div>

                        <div className="text-[11px] text-slate-400 hidden sm:block">
                            {rentSummary.isCurrent
                                ? 'Strict Due Date: 5th of Month • No Grace Time'
                                : `Fetched from ${selectedMonth} banking ledger archive`}
                        </div>
                    </div>

                    {/* Tenant Ledger Table for Selected Month */}
                    <div className="border border-slate-200/80 rounded-lg overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80 sticky top-0 bg-slate-50 z-10">
                                        <th className="py-2.5 px-3">Resident &amp; Room</th>
                                        <th className="py-2.5 px-3 font-mono text-right">Rent Amount</th>
                                        <th className="py-2.5 px-3">Settlement / Mode</th>
                                        <th className="py-2.5 px-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRentRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                                                No tenants match the "{statusFilter}" filter for {selectedMonth}.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRentRecords.map(record => {
                                            const isPaid = record.status === 'paid';
                                            const isOverdue = record.status === 'overdue';
                                            const isCash = (record.paymentMode || '').toUpperCase().includes('CASH');

                                            return (
                                                <tr
                                                    key={record.tenantId}
                                                    className="hover:bg-slate-50/70 transition-colors"
                                                >
                                                    {/* Resident & Room */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="font-semibold text-slate-900">{record.tenantName}</div>
                                                        <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                                                            <span className="font-bold text-slate-700">Room {record.roomNumber}</span>
                                                            <span>• Joined {record.joinedDate}</span>
                                                        </div>
                                                    </td>

                                                    {/* Rent Amount */}
                                                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right">
                                                        ₹{record.monthlyRent.toLocaleString('en-IN')}
                                                    </td>

                                                    {/* Payment Status & Details */}
                                                    <td className="py-2.5 px-3">
                                                        {isPaid ? (
                                                            <div>
                                                                {isCash ? (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                                        <Banknote className="w-3 h-3 text-emerald-600" />
                                                                        <span>Paid • Cash Voucher</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                                                        <Smartphone className="w-3 h-3 text-indigo-600" />
                                                                        <span>Paid • UPI Direct</span>
                                                                    </span>
                                                                )}
                                                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                                                    {record.paidOn || `05 ${selectedMonth.slice(0, 3)} ${selectedMonth.slice(-4)}`} {record.receiptNumber ? `• ${record.receiptNumber}` : ''}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <span
                                                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${isOverdue
                                                                        ? 'text-rose-700 bg-rose-50 border-rose-200'
                                                                        : 'text-amber-700 bg-amber-50 border-amber-200'
                                                                        }`}
                                                                >
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{isOverdue ? 'Overdue' : 'Unpaid / Due'}</span>
                                                                </span>
                                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                                    Due 05th • No Grace Time
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Action Button: Differentiating Pay UPI and Pay Cash */}
                                                    <td className="py-2.5 px-3 text-right">
                                                        {isPaid ? (
                                                            <button
                                                                onClick={() => onNavigate('ledger')}
                                                                className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
                                                                title="View in financial ledger"
                                                            >
                                                                <span>Ledger</span>
                                                                <ArrowRight className="w-3 h-3" />
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    onClick={() => handleQuickMarkAsPaid(record, 'UPI')}
                                                                    disabled={markedPaidLoading === `${record.tenantId}-UPI`}
                                                                    className="h-7 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
                                                                    title="Record payment received via UPI"
                                                                >
                                                                    <Smartphone className="w-3 h-3" />
                                                                    <span>{markedPaidLoading === `${record.tenantId}-UPI` ? '...' : 'Pay UPI'}</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleQuickMarkAsPaid(record, 'Cash')}
                                                                    disabled={markedPaidLoading === `${record.tenantId}-Cash`}
                                                                    className="h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
                                                                    title="Record payment received in Cash at desk"
                                                                >
                                                                    <Banknote className="w-3 h-3" />
                                                                    <span>{markedPaidLoading === `${record.tenantId}-Cash` ? '...' : 'Pay Cash'}</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSendReminder(record.tenantName)}
                                                                    className="h-7 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                                                                    title="Send WhatsApp / SMS reminder"
                                                                >
                                                                    {reminderSentTenant === record.tenantName ? (
                                                                        <span className="text-emerald-700 font-bold">Sent!</span>
                                                                    ) : (
                                                                        <Send className="w-3 h-3" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-center justify-end text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <button
                            onClick={() => onNavigate('rent-and-billing')}
                            className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                        >
                            <span>Full Rent Desk &amp; Billing Invoices</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* RIGHT: Vacate Requests Desk */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[#091426] tracking-tight">
                                    Vacate Requests Desk
                                </h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsVacateModalOpen(true)}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                            >
                                Manage
                            </button>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 font-mono">
                                {vacateRequests.filter(r => r.status === 'PENDING' || r.status === 'APPROVED').length} Active
                            </span>
                        </div>
                    </div>

                    {/* Vertical Box of Vacate Action Cards */}
                    <div className="flex flex-col gap-2.5">
                        {vacateRequests.filter(r => r.status === 'PENDING' || r.status === 'APPROVED').length === 0 ? (
                            <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-slate-700">No Pending Vacate Requests</span>
                                <span className="text-[11px] text-slate-400 max-w-[220px]">
                                    All scheduled departures and move-out notices are clear.
                                </span>
                                <a
                                    href="/vacate-form.html"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                                >
                                    <span>Open External Vacate Form</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        ) : (
                            vacateRequests
                                .filter(r => r.status === 'PENDING' || r.status === 'APPROVED')
                                .slice(0, 4)
                                .map(req => (
                                    <div
                                        key={req.id}
                                        className="p-3 bg-amber-50/40 hover:bg-amber-50/70 rounded-lg border border-amber-200/80 flex flex-col justify-between gap-2 transition-all"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                                    req.status === 'PENDING'
                                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                                        : 'bg-blue-100 text-blue-900 border border-blue-200'
                                                }`}>
                                                    {req.status === 'PENDING' ? 'Notice Received' : 'Notice Approved'}
                                                </span>
                                                <span className="font-mono text-[10px] font-bold text-slate-400">
                                                    {req.requestId}
                                                </span>
                                            </div>
                                            <div className="text-xs font-bold text-slate-900 mt-1.5 flex items-center justify-between">
                                                <span>{req.tenantName} (Room {req.roomNo})</span>
                                                <span className="text-emerald-700 font-bold text-[11px]">
                                                    Refund: ₹{req.advanceRepayable.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                Vacating: <strong className="text-slate-700">{req.expectedLeavingDate}</strong> ({req.noticeDays} days notice)
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-amber-200/50 mt-0.5">
                                            <button
                                                onClick={() => setIsVacateModalOpen(true)}
                                                className="flex-1 py-1 px-2.5 bg-[#091426] hover:bg-slate-800 text-white rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                                            >
                                                <span>Review & Action</span>
                                            </button>
                                            <button
                                                onClick={() => onNavigate('rooms')}
                                                className="py-1 px-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-[11px] font-medium transition-colors"
                                            >
                                                Room {req.roomNo}
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </div>

            {/* Rooms Availability */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center">
                            <DoorOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[#091426]">
                                Rooms Availability
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span className="text-[11px] text-slate-600 font-medium">Available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                            <span className="text-[11px] text-slate-600 font-medium">Vacate Notice</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                            <span className="text-[11px] text-slate-600 font-medium">Full</span>
                        </div>
                    </div>
                </div>

                {/* Room Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {rooms.map(room => {
                        const isFull = room.occupied >= room.capacity;
                        const hasNotice = room.status === 'vacate_notice';

                        return (
                            <button
                                key={room.roomNumber}
                                onMouseEnter={() => setHoveredRoom(room.roomNumber)}
                                onMouseLeave={() => setHoveredRoom(null)}
                                onClick={() => onNavigate('rooms')}
                                className={`group relative p-3 rounded-xl text-left cursor-pointer transition-all duration-200 border shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${isFull
                                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                    : hasNotice
                                        ? 'bg-amber-50/70 text-amber-950 border-amber-200 hover:bg-amber-50 hover:border-amber-300'
                                        : 'bg-emerald-50/60 text-emerald-950 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                                        Room {room.roomNumber}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200/60">
                                        Fl {room.floor}
                                    </span>
                                </div>

                                <div className="text-xs font-semibold text-slate-800">
                                    ₹{room.rent.toLocaleString('en-IN')}/mo
                                </div>

                                <div className="text-[11px] mt-1.5 flex items-center justify-between text-slate-600 pt-1.5 border-t border-slate-200/60">
                                    <span>Occupancy</span>
                                    <span className="font-bold text-slate-900">
                                        {room.occupied}/{room.capacity}
                                    </span>
                                </div>

                                {/* Room hover tooltip */}
                                {hoveredRoom === room.roomNumber && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-slate-900 text-white rounded-lg shadow-xl z-50 text-[11px] pointer-events-none text-left border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
                                        <div className="font-bold text-white flex items-center justify-between pb-1 border-b border-slate-800">
                                            <span>Room {room.roomNumber}</span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isFull
                                                ? 'bg-slate-800 text-slate-300'
                                                : hasNotice
                                                    ? 'bg-amber-900/80 text-amber-300'
                                                    : 'bg-emerald-900/80 text-emerald-300'
                                                }`}>
                                                {isFull ? 'Full' : hasNotice ? 'Notice' : 'Available'}
                                            </span>
                                        </div>
                                        <div className="text-slate-300 text-[10px] mt-1.5 flex items-center justify-between">
                                            <span>Rent:</span>
                                            <span className="font-semibold text-white">₹{room.rent.toLocaleString('en-IN')}/mo</span>
                                        </div>
                                        <div className="text-slate-300 text-[10px] flex items-center justify-between">
                                            <span>Occupancy:</span>
                                            <span className="font-semibold text-white">{room.occupied} of {room.capacity} Beds</span>
                                        </div>
                                        {room.vacateDate && (
                                            <div className="text-amber-400 text-[10px] font-semibold mt-1 pt-1 border-t border-slate-800">
                                                Notice: Vacating {room.vacateDate}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Recent Enrolments (Clean, Full Width) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-[#091426]">
                            Recent Tenant Enrolments
                        </h2>
                        <p className="text-xs text-slate-500">
                            Allocated rooms and verified automated payment records
                        </p>
                    </div>
                    <button
                        onClick={() => onNavigate('tenants')}
                        className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                    >
                        <span>All Residents</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                                <th className="py-2.5 px-3">Tenant Name</th>
                                <th className="py-2.5 px-3">Room Assigned</th>
                                <th className="py-2.5 px-3 font-mono text-right">Rent</th>
                                <th className="py-2.5 px-3">Move-In</th>
                                <th className="py-2.5 px-3">Status</th>
                                <th className="py-2.5 px-3">Payment</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {recentEnrolledTenants.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-slate-400">
                                        No active tenant enrollments found.
                                    </td>
                                </tr>
                            ) : (
                                recentEnrolledTenants.map(item => (
                                    <tr
                                        key={item.id}
                                        onClick={() => onNavigate('tenants')}
                                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                    >
                                        <td className="py-3 px-3">
                                            <div className="font-semibold text-slate-900">{item.residentName}</div>
                                            <div className="font-mono text-[10px] text-slate-400">{item.phone}</div>
                                        </td>
                                        <td className="py-3 px-3 font-bold text-slate-800">
                                            Room {item.roomNumber}
                                        </td>
                                        <td className="py-3 px-3 font-mono font-bold text-slate-900 text-right">
                                            ₹{item.monthlyRent.toLocaleString('en-IN')}/mo
                                        </td>
                                        <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                                            {item.moveInDate}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                <span>{item.status}</span>
                                            </span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                <span>{item.paymentStatus}</span>
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    onNavigate('tenants');
                                                }}
                                                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Vacate Requests Desk Modal */}
            <VacateRequestsModal
                isOpen={isVacateModalOpen}
                onClose={() => setIsVacateModalOpen(false)}
                requests={vacateRequests}
                onRefresh={loadVacateRequests}
            />
        </div>
    );
};
