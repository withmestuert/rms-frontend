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
    PieChart,
    Building2,
    Layers,
    BedDouble,
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
    onRefreshData?: () => Promise<void> | void;
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
    onRefreshData,
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
    const [hoveredSlice, setHoveredSlice] = useState<'paid' | 'unpaid' | null>(null);
    const [dashboardFloorFilter, setDashboardFloorFilter] = useState<string>('all');

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

    const availableDashboardFloors = useMemo(() => {
        const set = new Set<string>();
        rooms.forEach(r => {
            if (r.floor !== undefined && r.floor !== null) set.add(String(r.floor));
        });
        if (set.size === 0) ['1', '2', '3', '4'].forEach(f => set.add(f));
        return Array.from(set).sort();
    }, [rooms]);

    const floorStats = useMemo(() => {
        return availableDashboardFloors.map(fl => {
            const floorRooms = rooms.filter(r => String(r.floor) === fl);
            const cap = floorRooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
            const occ = floorRooms.reduce((acc, r) => acc + (r.occupied || 0), 0);
            return {
                floor: fl,
                roomsCount: floorRooms.length,
                capacity: cap,
                occupied: occ,
                available: Math.max(0, cap - occ),
            };
        });
    }, [rooms, availableDashboardFloors]);

    const filteredDashboardRooms = useMemo(() => {
        if (dashboardFloorFilter === 'all') return rooms;
        return rooms.filter(r => String(r.floor) === dashboardFloorFilter);
    }, [rooms, dashboardFloorFilter]);

    // --- 2. Monthly Rent Payment Summary (Fetches data based on selected month) ---
    const rentSummary = useMemo(() => {
        return getMonthlyRentSummary(selectedMonth, tenants, invoices);
    }, [selectedMonth, tenants, invoices]);

    // Derived collections for the 2-column Paid vs Unpaid Table
    const paidTenants = useMemo(() => {
        return rentSummary.records
            .filter(r => r.status === 'paid')
            .sort((a, b) => a.tenantName.localeCompare(b.tenantName));
    }, [rentSummary]);

    const unpaidTenants = useMemo(() => {
        return rentSummary.records
            .filter(r => r.status === 'pending' || r.status === 'overdue' || r.status === 'partially_paid')
            .sort((a, b) => a.tenantName.localeCompare(b.tenantName));
    }, [rentSummary]);

    const maxTableRows = Math.max(paidTenants.length, unpaidTenants.length);

    const paidAmount = rentSummary.totalCollectedAmount;
    const unpaidAmount = rentSummary.totalPendingAmount;
    const totalAmount = rentSummary.totalBilledAmount || (paidAmount + unpaidAmount);
    const paidPct = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const unpaidPct = totalAmount > 0 ? (unpaidAmount / totalAmount) * 100 : 0;

    const activeVacates = useMemo(() => {
        return vacateRequests.filter(r => r.status === 'PENDING' || r.status === 'APPROVED');
    }, [vacateRequests]);

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
                    paymentStatus: t.paymentStatus === 'verified' ? 'Advance Paid' : 'Pending',
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
                    paymentStatus: (matchingTenant?.paymentStatus === 'verified') ? 'Advance Paid' : 'Pending',
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
                - Left (lg:col-span-8): Monthly Rent Pie Chart with month dropdown (Paid vs Unpaid) + 2-Column Table (Paid | Unpaid)
                - Right (lg:col-span-4): Vacate Requests (resized as small rectangle) + Property Occupancy Pulse
            */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT: Monthly Rent Paid Card */}
                <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
                    {/* Card Header with Month Dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
                                <PieChart className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[#091426] tracking-tight">
                                    Tenant Rent Collection Analysis
                                </h2>
                                <p className="text-[11px] text-slate-400">
                                    {rentSummary.isCurrent
                                        ? 'Active Cycle • Strict Due Date: 5th of Month'
                                        : `Ledger Record for ${selectedMonth}`}
                                </p>
                            </div>
                        </div>

                        {/* Dropdown with Months */}
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
                                    className="h-8.5 pl-8 pr-7 bg-slate-50 hover:bg-slate-100/80 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer appearance-none"
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

                    {/* Rent Chart: Pie Chart with Paid vs Unpaid Amount as Parameters */}
                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                        {/* Interactive SVG Donut / Pie Chart */}
                        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
                            <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
                                <svg
                                    viewBox="0 0 200 200"
                                    className="w-full h-full transform -rotate-90 drop-shadow-xs"
                                >
                                    {/* Background Track */}
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r="72"
                                        fill="none"
                                        stroke="#e2e8f0"
                                        strokeWidth="20"
                                    />
                                    {totalAmount > 0 ? (
                                        <>
                                            {/* Paid Amount Arc (Emerald) */}
                                            {paidPct > 0 && (
                                                <circle
                                                    cx="100"
                                                    cy="100"
                                                    r="72"
                                                    fill="none"
                                                    stroke="#10b981"
                                                    strokeWidth={hoveredSlice === 'paid' ? 24 : 20}
                                                    strokeDasharray={`${(paidAmount / totalAmount) * 452.389} 452.389`}
                                                    strokeDashoffset="0"
                                                    strokeLinecap="round"
                                                    className="transition-all duration-300 cursor-pointer"
                                                    onMouseEnter={() => setHoveredSlice('paid')}
                                                    onMouseLeave={() => setHoveredSlice(null)}
                                                />
                                            )}
                                            {/* Unpaid Amount Arc (Amber) */}
                                            {unpaidPct > 0 && (
                                                <circle
                                                    cx="100"
                                                    cy="100"
                                                    r="72"
                                                    fill="none"
                                                    stroke="#f59e0b"
                                                    strokeWidth={hoveredSlice === 'unpaid' ? 24 : 20}
                                                    strokeDasharray={`${(unpaidAmount / totalAmount) * 452.389} 452.389`}
                                                    strokeDashoffset={`-${(paidAmount / totalAmount) * 452.389}`}
                                                    strokeLinecap="round"
                                                    className="transition-all duration-300 cursor-pointer"
                                                    onMouseEnter={() => setHoveredSlice('unpaid')}
                                                    onMouseLeave={() => setHoveredSlice(null)}
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <circle
                                            cx="100"
                                            cy="100"
                                            r="72"
                                            fill="none"
                                            stroke="#cbd5e1"
                                            strokeWidth="20"
                                        />
                                    )}
                                </svg>

                                {/* Center Display of Donut */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 select-none pointer-events-none">
                                    {hoveredSlice === 'paid' ? (
                                        <>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                                Paid Amount
                                            </span>
                                            <span className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-tight">
                                                ₹{paidAmount.toLocaleString('en-IN')}
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-500">
                                                {paidPct.toFixed(1)}% ({rentSummary.paidCount} paid)
                                            </span>
                                        </>
                                    ) : hoveredSlice === 'unpaid' ? (
                                        <>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                                                Unpaid Amount
                                            </span>
                                            <span className="text-base sm:text-lg font-black text-slate-900 font-mono tracking-tight">
                                                ₹{unpaidAmount.toLocaleString('en-IN')}
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-500">
                                                {unpaidPct.toFixed(1)}% ({rentSummary.pendingCount + rentSummary.overdueCount} due)
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                Cleared
                                            </span>
                                            <span className="text-xl sm:text-2xl font-black text-[#091426] tracking-tight">
                                                {Math.round(paidPct)}%
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-500 font-mono">
                                                {rentSummary.paidCount}/{rentSummary.totalTenants} Tenants
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 sm:hidden">Tap slice to view breakdown</span>
                        </div>

                        {/* Breakdown Parameters & Compressed Add-ons */}
                        <div className="md:col-span-7 flex flex-col gap-2.5">
                            {/* Paid Parameter Box */}
                            <div
                                onMouseEnter={() => setHoveredSlice('paid')}
                                onMouseLeave={() => setHoveredSlice(null)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                    hoveredSlice === 'paid'
                                        ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                                        : 'bg-white border-slate-200/80 hover:border-emerald-200'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-xs font-bold text-slate-800">
                                            Paid Amount
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        {paidPct.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between mt-1">
                                    <span className="text-lg font-black text-emerald-700 font-mono">
                                        ₹{paidAmount.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-500">
                                        {rentSummary.paidCount} of {rentSummary.totalTenants} Residents
                                    </span>
                                </div>
                                {/* Compressed Add-ons: UPI vs Cash */}
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 flex-wrap">
                                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-md">
                                        <Smartphone className="w-3 h-3 text-indigo-600" />
                                        <span>UPI: ₹{rentSummary.upiAmount.toLocaleString('en-IN')} ({rentSummary.upiCount})</span>
                                    </div>
                                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                                        <Banknote className="w-3 h-3 text-emerald-600" />
                                        <span>Cash: ₹{rentSummary.cashAmount.toLocaleString('en-IN')} ({rentSummary.cashCount})</span>
                                    </div>
                                </div>
                            </div>

                            {/* Unpaid Parameter Box */}
                            <div
                                onMouseEnter={() => setHoveredSlice('unpaid')}
                                onMouseLeave={() => setHoveredSlice(null)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                    hoveredSlice === 'unpaid'
                                        ? 'bg-amber-50 border-amber-300 shadow-xs'
                                        : 'bg-white border-slate-200/80 hover:border-amber-200'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        <span className="text-xs font-bold text-slate-800">
                                            Unpaid / Pending Amount
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                        {unpaidPct.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between mt-1">
                                    <span className="text-lg font-black text-amber-700 font-mono">
                                        ₹{unpaidAmount.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-500">
                                        {rentSummary.pendingCount + rentSummary.overdueCount} Residents Due
                                    </span>
                                </div>
                                {/* Compressed Add-on: Due Date */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                                    <span className="inline-flex items-center gap-1 text-amber-800 font-semibold">
                                        <Clock className="w-3 h-3 text-amber-600" />
                                        <span>Due by 5th • No Grace Time</span>
                                    </span>
                                    <span className="text-slate-400">Total Billed: ₹{totalAmount.toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Precise View of Paid and Unpaid Tenants (2 Columns: Paid | Unpaid with Tenant Name & Room Number) */}
                    <div className="flex flex-col gap-2 mt-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                                Resident Payment Breakdown ({selectedMonth})
                            </span>
                            <span className="text-[11px] text-slate-400">
                                {paidTenants.length} Paid • {unpaidTenants.length} Unpaid
                            </span>
                        </div>

                        <div className="border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
                            {/* Table Header: 2 Columns */}
                            <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                                <div className="py-2.5 px-3 sm:px-4 flex items-center justify-between border-r border-slate-200">
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Paid ({paidTenants.length})</span>
                                    </div>
                                    <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                                        ₹{paidAmount.toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="py-2.5 px-3 sm:px-4 flex items-center justify-between bg-amber-50/30">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Unpaid ({unpaidTenants.length})</span>
                                    </div>
                                    <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70">
                                        ₹{unpaidAmount.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>

                            {/* Table Body: 2 Columns with Tenant Name and Room Number */}
                            <div className="max-h-60 sm:max-h-68 overflow-y-auto divide-y divide-slate-100 bg-white">
                                {maxTableRows === 0 ? (
                                    <div className="py-8 text-center text-xs text-slate-400">
                                        No resident records found for {selectedMonth}.
                                    </div>
                                ) : (
                                    Array.from({ length: maxTableRows }).map((_, idx) => {
                                        const paid = paidTenants[idx];
                                        const unpaid = unpaidTenants[idx];

                                        return (
                                            <div
                                                key={idx}
                                                className="grid grid-cols-2 text-xs divide-x divide-slate-100 hover:bg-slate-50/60 transition-colors"
                                            >
                                                {/* Paid Column: Just with tenant name and room number */}
                                                <div className="py-2 px-3 sm:px-4 flex items-center justify-between gap-1.5 min-w-0">
                                                    {paid ? (
                                                        <>
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                                <span className="font-semibold text-slate-900 truncate">
                                                                    {paid.tenantName}
                                                                </span>
                                                            </div>
                                                            <span className="shrink-0 text-[10px] sm:text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                                                                Room {paid.roomNumber}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-300 text-center w-full italic text-[11px]">—</span>
                                                    )}
                                                </div>

                                                {/* Unpaid Column: Just with tenant name and room number */}
                                                <div className="py-2 px-3 sm:px-4 flex items-center justify-between gap-1.5 min-w-0 bg-amber-50/15">
                                                    {unpaid ? (
                                                        <>
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                                <span className="font-semibold text-slate-900 truncate">
                                                                    {unpaid.tenantName}
                                                                </span>
                                                            </div>
                                                            <span className="shrink-0 text-[10px] sm:text-[11px] font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70">
                                                                Room {unpaid.roomNumber}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-300 text-center w-full italic text-[11px]">—</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Navigation */}
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

                {/* RIGHT: Same Position - Resized as a Small Rectangle */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    {/* Vacate Requests Card (Small Rectangle) */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                                    <Calendar className="w-3.5 h-3.5" />
                                </div>
                                <h2 className="text-sm font-bold text-[#091426] tracking-tight">
                                    Vacate Requests
                                </h2>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 font-mono">
                                    {activeVacates.length} Active
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsVacateModalOpen(true)}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                >
                                    Manage
                                </button>
                            </div>
                        </div>

                        {/* Small Rectangle Body */}
                        {activeVacates.length === 0 ? (
                            <div className="py-4 px-3 text-center flex flex-col items-center justify-center gap-1.5 bg-slate-50/70 rounded-lg border border-dashed border-slate-200">
                                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-700">No Pending Vacate Requests</span>
                                <span className="text-[10px] text-slate-400">
                                    All scheduled departures are clear.
                                </span>
                                <a
                                    href="/vacate-form.html"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:underline mt-0.5"
                                >
                                    <span>External Vacate Form</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/80 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-xs text-slate-900 truncate">
                                            {activeVacates[0].tenantName}
                                        </div>
                                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                                            Room {activeVacates[0].roomNo}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                                        <span>Vacating: <strong className="text-slate-800">{activeVacates[0].expectedLeavingDate}</strong></span>
                                        <span className="text-emerald-700 font-bold font-mono">
                                            ₹{activeVacates[0].advanceRepayable.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1 border-t border-amber-200/50">
                                        <button
                                            type="button"
                                            onClick={() => setIsVacateModalOpen(true)}
                                            className="flex-1 py-1 px-2 bg-[#091426] hover:bg-slate-800 text-white rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                                        >
                                            <span>Review & Action</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onNavigate('rooms')}
                                            className="py-1 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-semibold transition-colors"
                                        >
                                            Room {activeVacates[0].roomNo}
                                        </button>
                                    </div>
                                </div>
                                {activeVacates.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setIsVacateModalOpen(true)}
                                        className="text-[10px] font-semibold text-blue-600 hover:underline text-center"
                                    >
                                        +{activeVacates.length - 1} more pending notice(s) • View all
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Small Rectangle: Property Capacity Glance */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                                    <Building className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-xs font-bold text-slate-900">
                                    Property Occupancy Pulse
                                </h3>
                            </div>
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                {occupancyPercentage}%
                            </span>
                        </div>

                        {/* Progress Bar & Hierarchy Breakdown */}
                        <div className="flex flex-col gap-2">
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, Number(occupancyPercentage))}%` }}
                                />
                            </div>

                            {/* 4-Item Hierarchy Metric Grid */}
                            <div className="grid grid-cols-4 gap-1.5 text-center pt-0.5">
                                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Blocks</span>
                                    <span className="text-xs font-extrabold text-slate-800 font-mono">1</span>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Floors</span>
                                    <span className="text-xs font-extrabold text-slate-800 font-mono">{availableDashboardFloors.length}</span>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Rooms</span>
                                    <span className="text-xs font-extrabold text-slate-800 font-mono">{totalRooms}</span>
                                </div>
                                <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Beds</span>
                                    <span className="text-xs font-extrabold text-blue-700 font-mono">{totalCapacity}</span>
                                </div>
                            </div>

                            {/* Floor-wise Mini Occupancy Bars */}
                            <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-100 text-[11px]">
                                <div className="flex justify-between items-center text-slate-500 font-medium">
                                    <span className="flex items-center gap-1">
                                        <Layers className="w-3 h-3 text-slate-400" />
                                        <span>Floor Distribution:</span>
                                    </span>
                                    <span className="font-mono text-[10px]">{totalOccupied}/{totalCapacity} Beds Occupied</span>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                                    {floorStats.map(fs => (
                                        <div key={fs.floor} className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 text-center">
                                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Fl {fs.floor}</span>
                                            <span className="text-[11px] font-bold text-slate-800 font-mono">{fs.occupied}/{fs.capacity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => onNavigate('rooms')}
                            className="w-full py-1 text-center text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline pt-1 border-t border-slate-100"
                        >
                            View Floor &amp; Bed Matrix →
                        </button>
                    </div>
                </div>
            </div>

            {/* Rooms Availability */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/70 text-blue-600 flex items-center justify-center">
                                <DoorOpen className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[#091426]">
                                    Rooms Availability
                                </h2>
                                <p className="text-[11px] text-slate-400">Click any room to open inventory management</p>
                            </div>
                        </div>

                        {/* Floor Quick Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                                <Layers className="w-3.5 h-3.5 text-slate-500" /> Floor:
                            </span>
                            <button
                                type="button"
                                onClick={() => setDashboardFloorFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                                    dashboardFloorFilter === 'all'
                                        ? 'bg-blue-600 text-white shadow-2xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                All ({rooms.length})
                            </button>
                            {availableDashboardFloors.map(fl => {
                                const count = rooms.filter(r => String(r.floor) === fl).length;
                                return (
                                    <button
                                        key={fl}
                                        type="button"
                                        onClick={() => setDashboardFloorFilter(fl)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                                            dashboardFloorFilter === fl
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        Floor {fl} ({count})
                                    </button>
                                );
                            })}
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
                    {filteredDashboardRooms.length === 0 ? (
                        <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                            No rooms match the selected floor filter.
                        </div>
                    ) : (
                        filteredDashboardRooms.map(room => {
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
                    }))}
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
                onRefresh={async () => {
                    await loadVacateRequests();
                    if (onRefreshData) await onRefreshData();
                }}
            />
        </div>
    );
};
