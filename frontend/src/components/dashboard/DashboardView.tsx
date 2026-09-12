import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { CriticalAction, Admission, Room, Tenant, Invoice, PageId } from '../../types';
import {
    AVAILABLE_MONTHS,
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
    const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>('October 2024');
    const [statusFilter, setStatusFilter] = useState<'all' | 'upi' | 'cash' | 'pending'>('all');
    const [markedPaidLoading, setMarkedPaidLoading] = useState<string | null>(null);
    const [reminderSentTenant, setReminderSentTenant] = useState<string | null>(null);

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
            {/* Property Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded uppercase tracking-wider">
                            Greenwood Residency
                        </span>
                        <span className="font-mono text-xs text-slate-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            Live Operations
                        </span>
                    </div>
                    <h1 className="text-xl font-bold text-[#091426] tracking-tight font-display">
                        Property Dashboard
                    </h1>
                    <p className="text-xs text-slate-500">
                        Unified inventory calculation, monthly rent realization, and urgent operations desk.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={() => onNavigate('rooms')}
                        className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                        <DoorOpen className="w-4 h-4 text-slate-600" />
                        <span>View All Rooms</span>
                    </button>

                    <button
                        onClick={onQuickAdmission}
                        className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Enrol Tenant</span>
                    </button>


                </div>
            </div>

            {/* MINIMALIZED DATA STRIP: Single Lengthy Card with Low Height Partitioned into 4 Interconnected Metrics */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-4 sm:px-6 py-3.5">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/90 -my-1 lg:my-0">
                    {/* Partition 1: Total Rooms */}
                    <div className="py-2.5 lg:py-0 lg:pr-6 flex flex-col justify-center">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Total Rooms
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 font-mono">100% Configured</span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-[#091426] tracking-tight tabular-nums font-display">
                                {totalRooms}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">Units Total</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                            <span>Across Floor 1, 2, 3</span>
                        </div>
                    </div>

                    {/* Partition 2: Available Rooms */}
                    <div className="py-2.5 lg:py-0 lg:px-6 flex flex-col justify-center">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                Available Rooms
                            </span>
                            <button
                                onClick={() => onNavigate('rooms')}
                                className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                                <span>Filter</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                            </button>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-emerald-700 tracking-tight tabular-nums font-display">
                                {availableRooms}
                            </span>
                            <span className="text-xs font-semibold text-emerald-600">Open Units</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>Rooms with vacant capacity</span>
                        </div>
                    </div>

                    {/* Partition 3: Occupancy Rate */}
                    <div className="py-2.5 lg:py-0 lg:px-6 flex flex-col justify-center">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Occupancy Rate
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                {occupancyPercentage}%
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-[#091426] tracking-tight tabular-nums font-display">
                                {totalOccupied}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">/ {totalCapacity} Beds</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, Math.max(0, parseFloat(occupancyPercentage)))}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Partition 4: Total Vacancies */}
                    <div className="py-2.5 lg:py-0 lg:pl-6 flex flex-col justify-center">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                                Vacancies
                            </span>
                            <button
                                onClick={onQuickAdmission}
                                className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                                <span>+ Enrol</span>
                            </button>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold text-blue-700 tracking-tight tabular-nums font-display">
                                {totalVacant}
                            </span>
                            <span className="text-xs font-semibold text-blue-600">Spots Ready</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span>Available for immediate check-in</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2-COLUMN SECTION:
          - Left (col-span-7/8): Monthly Rent Paid Card with Dropdown (fetches previous months data)
          - Right (col-span-5/4): Immediate Action Required (Vertical Box on Top Right) */}
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
                                {rentSummary.isCurrent && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                                        Live Month
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Real-time realization of resident rents, payment modes, and previous month records.
                            </p>
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
                                    {AVAILABLE_MONTHS.map(m => (
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
                                Monthly Rent Realization ({selectedMonth})
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
                                                                    {record.paidOn || '05 Oct 2024'} {record.receiptNumber ? `• ${record.receiptNumber}` : ''}
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

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>
                            Showing {filteredRentRecords.length} of {rentSummary.totalTenants} tenant records for{' '}
                            <strong className="text-slate-800">{selectedMonth}</strong>
                        </span>
                        <button
                            onClick={() => onNavigate('rent-and-billing')}
                            className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                        >
                            <span>Full Rent Desk &amp; Billing Invoices</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* RIGHT: Immediate Action Required - VERTICAL BOX ON TOP RIGHT */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-3.5">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                                <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[#091426] tracking-tight">
                                    Immediate Action Required
                                </h2>
                                <p className="text-[11px] text-slate-500">Urgent operational events</p>
                            </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 font-mono">
                            {criticalActions.length} Pending
                        </span>
                    </div>

                    {/* Vertical Box of Urgent Action Cards */}
                    <div className="flex flex-col gap-2.5">
                        {criticalActions.length === 0 ? (
                            <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-slate-700">All Urgent Actions Resolved</span>
                                <span className="text-[11px] text-slate-400 max-w-[200px]">
                                    No pending enrolments, unacknowledged notices, or critical blocks.
                                </span>
                            </div>
                        ) : (
                            criticalActions.map(action => {
                                const isEnrolment = action.badgeText.toLowerCase().includes('enrol');
                                const isVacate = action.badgeText.toLowerCase().includes('vacate');

                                return (
                                    <div
                                        key={action.id}
                                        className="p-3 bg-slate-50/90 hover:bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between gap-2 transition-all hover:border-slate-300"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${isEnrolment
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : isVacate
                                                            ? 'bg-amber-100 text-amber-900'
                                                            : 'bg-rose-100 text-rose-800'
                                                        }`}
                                                >
                                                    {action.badgeText}
                                                </span>
                                                <span className="font-mono text-[10px] font-bold text-slate-400">
                                                    {action.code}
                                                </span>
                                            </div>
                                            <div className="text-xs font-bold text-slate-900 mt-1.5">{action.title}</div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">{action.subtitle}</div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/70 mt-0.5">
                                            <button
                                                onClick={() => {
                                                    if (isEnrolment) onNavigate('admissions');
                                                    else if (isVacate) onNavigate('rooms');
                                                    else onActionDismiss(action.id);
                                                }}
                                                className="flex-1 py-1 px-2.5 bg-[#091426] hover:bg-slate-800 text-white rounded text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                                            >
                                                <span>{action.primaryActionText}</span>
                                            </button>
                                            <button
                                                onClick={() => onActionDismiss(action.id)}
                                                className="py-1 px-2.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-[11px] font-medium transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* Overdue Rent Notice Card in Action Required Box if current month has unpaid rents */}
                        {rentSummary.isCurrent && rentSummary.overdueCount > 0 && (
                            <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-200/80 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                                        Overdue Notice
                                    </span>
                                    <span className="text-[10px] font-mono text-rose-600 font-bold">
                                        {rentSummary.overdueCount} Overdue
                                    </span>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-900">
                                        Past-Due Monthly Rent Invoices
                                    </div>
                                    <div className="text-[11px] text-slate-600">
                                        ₹{rentSummary.totalPendingAmount.toLocaleString('en-IN')} pending realization for {selectedMonth}.
                                    </div>
                                </div>
                                <button
                                    onClick={() => onNavigate('rent-and-billing')}
                                    className="w-full py-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold transition-colors text-center"
                                >
                                    Review Invoices Desk
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Interactive Room Terminal Matrix */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-slate-900 text-cyan-400 flex items-center justify-center font-mono">
                            <Terminal className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[#091426]">
                                Interactive Room Terminal Matrix
                            </h2>
                            <p className="text-xs text-slate-500">
                                Hover to preview rent &amp; occupancy • Click any room to navigate directly into its unit controller
                            </p>
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
                                className={`group relative p-3 rounded-xl text-left cursor-pointer transition-all duration-150 border font-mono ${isFull
                                    ? 'bg-slate-900 text-slate-200 border-slate-800 hover:bg-black hover:text-cyan-300 hover:border-cyan-400 hover:ring-2 hover:ring-cyan-400/60 hover:shadow-lg'
                                    : hasNotice
                                        ? 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-slate-950 hover:text-amber-300 hover:border-amber-400 hover:ring-2 hover:ring-amber-400/60 hover:shadow-lg'
                                        : 'bg-emerald-50/80 text-emerald-950 border-emerald-300 hover:bg-slate-950 hover:text-cyan-300 hover:border-cyan-400 hover:ring-2 hover:ring-cyan-400/60 hover:shadow-lg'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-bold tracking-tight group-hover:scale-105 transition-transform">
                                        Room {room.roomNumber}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold opacity-80">
                                        Fl {room.floor}
                                    </span>
                                </div>

                                <div className="text-xs font-semibold opacity-90">
                                    ₹{room.rent.toLocaleString('en-IN')}/mo
                                </div>

                                <div className="text-[11px] mt-1.5 flex items-center justify-between opacity-80 pt-1.5 border-t border-current/20">
                                    <span>Occupancy</span>
                                    <span className="font-bold">
                                        {room.occupied}/{room.capacity}
                                    </span>
                                </div>

                                {/* Terminal hover tooltip */}
                                {hoveredRoom === room.roomNumber && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-[#091426] text-white rounded-lg shadow-xl z-50 text-[11px] pointer-events-none text-left border border-cyan-500/40">
                                        <div className="font-bold text-cyan-400 flex items-center justify-between">
                                            <span>ROOM {room.roomNumber}</span>
                                            <span className="text-[9px] text-cyan-200 bg-cyan-900/60 px-1 rounded">ENTER ↵</span>
                                        </div>
                                        <div className="text-slate-300 text-[10px] mt-1">
                                            Rent: ₹{room.rent.toLocaleString('en-IN')}/mo
                                        </div>
                                        <div className="text-slate-300 text-[10px]">
                                            Occupancy: {room.occupied} of {room.capacity} occupied
                                        </div>
                                        {room.vacateDate && (
                                            <div className="text-amber-400 text-[10px] font-semibold mt-0.5">
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
                                <th className="py-2.5 px-3">Payment</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {admissions.map(item => (
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
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            <span>Auto-Verified</span>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
