import React, { useState, useMemo, useEffect } from 'react';
import {
    ArrowLeft,
    Receipt,
    Download,
    CheckCircle2,
    Clock,
    AlertCircle,
    Building2,
    DoorOpen,
    Phone,
    ShieldCheck,
    Printer,
    ChevronDown,
    X,
    FileText,
    Search,
    RotateCcw,
    User,
    Banknote,
    Smartphone,
    ExternalLink,
    Filter,
} from 'lucide-react';
import { Tenant, TenantPaymentRecord, Room, Invoice } from '../../types';
import { generateTenantPaymentHistory } from '../../data/tenantPayments';
import { isSameMonthYear } from '../../utils/monthlyRentTracker';

interface TenantPaymentHistoryViewProps {
    tenant?: Tenant;
    allTenants: Tenant[];
    rooms?: Room[];
    invoices?: Invoice[];
    onSelectTenant?: (tenant: Tenant) => void;
    onBack: () => void;
}

// Helpers for robust floor and room normalization
const normRoom = (r?: string): string => (r || '').trim().toUpperCase();

export const formatFloorName = (fl: string): string => {
    const trimmed = (fl || '').trim();
    if (!trimmed) return 'Floor 1';
    if (trimmed === '0' || trimmed.toLowerCase() === 'ground' || trimmed.toLowerCase() === 'g') {
        return 'Ground Floor';
    }
    if (trimmed === '1' || trimmed.toLowerCase() === 'f') return '1st Floor';
    if (trimmed === '2' || trimmed.toLowerCase() === 's') return '2nd Floor';
    if (trimmed === '3' || trimmed.toLowerCase() === 't') return '3rd Floor';

    const num = parseInt(trimmed, 10);
    if (!isNaN(num)) {
        if (num === 0) return 'Ground Floor';
        if (num === 1) return '1st Floor';
        if (num === 2) return '2nd Floor';
        if (num === 3) return '3rd Floor';
        return `${num}th Floor`;
    }
    return trimmed.toLowerCase().includes('floor') ? trimmed : `Floor ${trimmed}`;
};

export const TenantPaymentHistoryView: React.FC<TenantPaymentHistoryViewProps> = ({
    tenant: initialTenant,
    allTenants = [],
    rooms = [],
    invoices = [],
    onSelectTenant,
    onBack,
}) => {
    // Filter & Search States
    const [selectedFloor, setSelectedFloor] = useState<string>('all');
    const [selectedRoom, setSelectedRoom] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [rentStatusFilter, setRentStatusFilter] = useState<'all' | 'rent_paid' | 'rent_pending' | 'advance_pending'>('all');

    // Drawer / Modal states for detailed ledger of a specific tenant
    const [selectedLedgerTenant, setSelectedLedgerTenant] = useState<Tenant | null>(null);
    const [activeReceipt, setActiveReceipt] = useState<TenantPaymentRecord | null>(null);
    const [ledgerFilterType, setLedgerFilterType] = useState<'all' | 'monthly_rent' | 'advance_deposit'>('all');

    // Build a room-to-floor lookup map from rooms prop
    const roomFloorMap = useMemo(() => {
        const map = new Map<string, string>();
        rooms.forEach(r => {
            if (r.roomNumber) {
                const fl = String(r.floor ?? '').trim();
                if (fl) map.set(normRoom(r.roomNumber), fl);
            }
        });
        return map;
    }, [rooms]);

    // Helper to get floor for any room or tenant
    const getFloorForRoom = useMemo(() => {
        return (roomNumber?: string): string => {
            if (!roomNumber) return '1';
            const normalized = normRoom(roomNumber);
            if (roomFloorMap.has(normalized)) {
                return roomFloorMap.get(normalized)!;
            }
            if (normalized.startsWith('G')) return '0';
            if (normalized.startsWith('F')) return '1';
            if (normalized.startsWith('S')) return '2';
            if (normalized.startsWith('T')) return '3';
            const num = parseInt(normalized, 10);
            if (!isNaN(num)) {
                if (num >= 1000) return String(Math.floor(num / 1000));
                if (num >= 100) return String(Math.floor(num / 100));
            }
            return '1';
        };
    }, [roomFloorMap]);

    // Active Tenants: only residents who have completed admission & verified advance payment
    const activeTenants = useMemo(() => {
        return allTenants.filter(t => {
            const s = (t.status || '').toLowerCase();
            return s !== 'vacated' && s !== 'inactive' && s !== 'cancelled' && s !== 'pending';
        });
    }, [allTenants]);

    // 1. Available Floors: derived dynamically and sorted
    const availableFloors = useMemo(() => {
        const floorSet = new Set<string>();
        rooms.forEach(r => {
            const fl = String(r.floor ?? '').trim();
            if (fl) floorSet.add(fl);
        });
        activeTenants.forEach(t => {
            const fl = getFloorForRoom(t.roomNumber);
            if (fl) floorSet.add(fl);
        });

        return Array.from(floorSet).sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
    }, [rooms, activeTenants, getFloorForRoom]);

    // 2. Available Rooms: filtered strictly by chosen floor if selected
    const availableRooms = useMemo(() => {
        const roomMap = new Map<string, { roomNumber: string; floor: string }>();

        rooms.forEach(r => {
            if (r.roomNumber) {
                const fl = String(r.floor ?? getFloorForRoom(r.roomNumber)).trim();
                roomMap.set(normRoom(r.roomNumber), {
                    roomNumber: r.roomNumber,
                    floor: fl,
                });
            }
        });

        activeTenants.forEach(t => {
            const key = normRoom(t.roomNumber);
            if (key && !roomMap.has(key)) {
                roomMap.set(key, {
                    roomNumber: t.roomNumber,
                    floor: getFloorForRoom(t.roomNumber),
                });
            }
        });

        let list = Array.from(roomMap.values());

        if (selectedFloor !== 'all') {
            list = list.filter(r => r.floor === selectedFloor);
        }

        return list.sort((a, b) =>
            a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true, sensitivity: 'base' })
        );
    }, [rooms, activeTenants, selectedFloor, getFloorForRoom]);

    // Handle Floor Change with Cascading Room Reset
    const handleFloorChange = (newFloor: string) => {
        setSelectedFloor(newFloor);
        if (newFloor !== 'all' && selectedRoom !== 'all') {
            const currentRoomFloor = getFloorForRoom(selectedRoom);
            if (currentRoomFloor !== newFloor) {
                setSelectedRoom('all');
            }
        }
    };

    // Handle Room Change with Cascading Auto-Floor setting
    const handleRoomChange = (newRoom: string) => {
        setSelectedRoom(newRoom);
        if (newRoom !== 'all') {
            const roomFloor = getFloorForRoom(newRoom);
            if (roomFloor && selectedFloor === 'all') {
                setSelectedFloor(roomFloor);
            }
        }
    };

    // Reset all filters
    const handleResetFilters = () => {
        setSelectedFloor('all');
        setSelectedRoom('all');
        setSearchTerm('');
        setRentStatusFilter('all');
    };

    const hasActiveFilters =
        selectedFloor !== 'all' ||
        selectedRoom !== 'all' ||
        searchTerm.trim() !== '' ||
        rentStatusFilter !== 'all';

    // Helper: Calculate billing status for any given tenant
    const getTenantFinancials = (t: Tenant) => {
        // Advance Paid
        const isAdvancePaid = t.paymentStatus === 'verified' || (t.advancePaid !== undefined && t.advancePaid > 0);
        const advanceAmount = (t.advancePaid && t.advancePaid > 0)
            ? t.advancePaid
            : (t.securityDeposit && t.securityDeposit > 0)
                ? t.securityDeposit
                : t.monthlyRent || 8000;

        // Current Month Rent Status
        const now = new Date();
        const currMonthLong = now.toLocaleString('en-US', { month: 'long' });
        const currYear = now.getFullYear();
        const currentCalendarMonthKey = `${currMonthLong} ${currYear}`;

        const tenantInvoices = invoices.filter(inv => {
            const matchUid = Boolean(inv.tenantUid && inv.tenantUid === t.id);
            const matchName = Boolean(inv.tenantName && t.name && inv.tenantName.trim().toLowerCase() === t.name.trim().toLowerCase());
            return matchUid || matchName;
        });

        // Check if there is an invoice matching the current calendar month
        let currInv = tenantInvoices.find(inv => isSameMonthYear(inv.monthYear, currentCalendarMonthKey));

        // If no invoice for current month, check upcoming month (advance rent collection e.g. Oct for Sep)
        if (!currInv) {
            const nextMonthDate = new Date(currYear, now.getMonth() + 1, 1);
            const nextMonthKey = `${nextMonthDate.toLocaleString('en-US', { month: 'long' })} ${nextMonthDate.getFullYear()}`;
            currInv = tenantInvoices.find(inv => isSameMonthYear(inv.monthYear, nextMonthKey));
        }

        // If still no invoice, check the latest invoice for this resident
        if (!currInv && tenantInvoices.length > 0) {
            const sortedInvs = [...tenantInvoices].sort((a, b) => (b.id || 0) - (a.id || 0));
            currInv = sortedInvs[0];
        }

        let rentStatus: 'paid' | 'pending' | 'partially_paid' = 'pending';
        let rentAmount = t.monthlyRent || 8000;
        let cycleName = currentCalendarMonthKey;
        let paymentMode: string | undefined;
        let paymentDate: string | undefined;

        if (currInv) {
            cycleName = currInv.monthYear || currentCalendarMonthKey;
            rentAmount = currInv.amount || t.monthlyRent || 8000;
            paymentMode = currInv.paymentMode || undefined;
            paymentDate = currInv.paidOn || undefined;

            if (currInv.status === 'paid' || (currInv.paidAmount && currInv.paidAmount >= currInv.amount)) {
                rentStatus = 'paid';
            } else if (currInv.status === 'partially_paid' || (currInv.paidAmount && currInv.paidAmount > 0)) {
                rentStatus = 'partially_paid';
            } else {
                rentStatus = 'pending';
            }
        }

        return {
            isAdvancePaid,
            advanceAmount,
            advanceReceiptNo: `REC-ADV-${t.roomNumber}`,
            rentStatus,
            rentAmount,
            cycleName,
            paymentMode,
            paymentDate,
            floor: getFloorForRoom(t.roomNumber),
        };
    };

    // Filtered Tenants List (Active Residents Only)
    const filteredTenants = useMemo(() => {
        return activeTenants
            .filter(t => {
                const fin = getTenantFinancials(t);

                // Floor Filter
                if (selectedFloor !== 'all') {
                    if (fin.floor !== selectedFloor) return false;
                }

                // Room Filter
                if (selectedRoom !== 'all') {
                    if (normRoom(t.roomNumber) !== normRoom(selectedRoom)) return false;
                }

                // Search Filter (Name, Room, Phone)
                if (searchTerm.trim()) {
                    const q = searchTerm.toLowerCase().trim();
                    const matchName = (t.name || '').toLowerCase().includes(q);
                    const matchRoom = (t.roomNumber || '').toLowerCase().includes(q);
                    const matchPhone = (t.phone || '').includes(q);
                    if (!matchName && !matchRoom && !matchPhone) return false;
                }

                // Status Filter Tab
                if (rentStatusFilter === 'rent_paid' && fin.rentStatus !== 'paid') return false;
                if (rentStatusFilter === 'rent_pending' && fin.rentStatus === 'paid') return false;
                if (rentStatusFilter === 'advance_pending' && fin.isAdvancePaid) return false;

                return true;
            })
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [activeTenants, selectedFloor, selectedRoom, searchTerm, rentStatusFilter, invoices, getFloorForRoom]);

    // Financial KPI Summary for active tenants
    const summaryStats = useMemo(() => {
        let totalResidents = activeTenants.length;
        let advancePaidCount = 0;
        let advancePendingCount = 0;
        let rentPaidCount = 0;
        let rentPendingCount = 0;

        activeTenants.forEach(t => {
            const fin = getTenantFinancials(t);
            if (fin.isAdvancePaid) advancePaidCount++;
            else advancePendingCount++;

            if (fin.rentStatus === 'paid') rentPaidCount++;
            else rentPendingCount++;
        });

        return {
            totalResidents,
            advancePaidCount,
            advancePendingCount,
            rentPaidCount,
            rentPendingCount,
        };
    }, [activeTenants, invoices]);

    // Ledger details for drawer/modal
    const drawerPaymentRecords = useMemo(() => {
        if (!selectedLedgerTenant) return [];
        return generateTenantPaymentHistory(selectedLedgerTenant, invoices);
    }, [selectedLedgerTenant, invoices]);

    const drawerAdvanceRecord = useMemo(() => {
        return drawerPaymentRecords.find(p => p.category === 'advance_deposit');
    }, [drawerPaymentRecords]);

    const filteredDrawerRecords = useMemo(() => {
        if (ledgerFilterType === 'all') return drawerPaymentRecords;
        return drawerPaymentRecords.filter(p => p.category === ledgerFilterType);
    }, [drawerPaymentRecords, ledgerFilterType]);

    const drawerTotalRentPaid = useMemo(() => {
        return drawerPaymentRecords
            .filter(p => p.category === 'monthly_rent')
            .reduce((sum, p) => sum + p.amount, 0);
    }, [drawerPaymentRecords]);

    const drawerAdvancePaidAmount = drawerAdvanceRecord
        ? drawerAdvanceRecord.amount
        : (selectedLedgerTenant ? selectedLedgerTenant.monthlyRent : 0);

    return (
        <div className="flex flex-col w-full gap-5">
            {/* Top Navigation & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Tenants</span>
                    </button>
                    <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                    <div>
                        <h1 className="text-xs sm:text-sm font-bold text-slate-900">
                            Tenant Payment Ledger &amp; Security Deposit Desk
                        </h1>
                        <p className="text-[11px] text-slate-500 hidden sm:block">
                            Track advance security deposits and current month rent clearance across all tenants.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Overview</span>
                    </button>
                </div>
            </div>

            {/* Quick KPI Financial Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Total Residents
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold font-mono text-[#091426]">
                                {summaryStats.totalResidents}
                            </span>
                            <span className="text-xs text-slate-500">Active Records</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <User className="w-4 h-4" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Advance Deposits
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold font-mono text-emerald-600">
                                {summaryStats.advancePaidCount} Paid
                            </span>
                            {summaryStats.advancePendingCount > 0 && (
                                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                    {summaryStats.advancePendingCount} Pending
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Current Month Rent Status
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl font-bold font-mono text-emerald-600">
                                {summaryStats.rentPaidCount} Paid
                            </span>
                            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                {summaryStats.rentPendingCount} Pending
                            </span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Receipt className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* DEDICATED SEARCH & FILTER PANEL (Corrected Floor & Room Dropdowns) */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col gap-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                            <Search className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-[#091426] uppercase tracking-wider">
                                Resident Search &amp; Room Navigator
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Filter tenants by floor, narrow down to room, and search by resident name.
                            </p>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={handleResetFilters}
                            className="self-start sm:self-auto h-7 px-2.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Filters</span>
                        </button>
                    )}
                </div>

                {/* 3 Interconnected Dropdown / Input Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* 1. Floor Selector */}
                    <div className="sm:col-span-3 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>Floor</span>
                        </label>
                        <div className="relative">
                            <select
                                value={selectedFloor}
                                onChange={e => handleFloorChange(e.target.value)}
                                className="w-full h-9 pl-3 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer appearance-none"
                            >
                                <option value="all">All Floors</option>
                                {availableFloors.map(fl => (
                                    <option key={fl} value={fl}>
                                        {formatFloorName(fl)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* 2. Room Selector (Filtered strictly according to Selected Floor) */}
                    <div className="sm:col-span-3 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <DoorOpen className="w-3 h-3 text-slate-400" />
                            <span>Room</span>
                            {selectedFloor !== 'all' && (
                                <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1 rounded">
                                    {formatFloorName(selectedFloor)}
                                </span>
                            )}
                        </label>
                        <div className="relative">
                            <select
                                value={selectedRoom}
                                onChange={e => handleRoomChange(e.target.value)}
                                className="w-full h-9 pl-3 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer appearance-none"
                            >
                                <option value="all">
                                    {selectedFloor !== 'all'
                                        ? `All Rooms on ${formatFloorName(selectedFloor)}`
                                        : 'All Rooms'}
                                </option>
                                {availableRooms.map(rm => (
                                    <option key={rm.roomNumber} value={rm.roomNumber}>
                                        Room {rm.roomNumber} ({formatFloorName(rm.floor)})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* 3. Search Resident / Tenant */}
                    <div className="sm:col-span-6 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>Search Resident</span>
                            </label>
                            <span className="text-[10px] font-semibold text-slate-400">
                                {filteredTenants.length} of {activeTenants.length} Residents
                            </span>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Search className="w-3.5 h-3.5" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by name, room, or phone number..."
                                className="w-full h-9 pl-9 pr-8 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Status Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Quick Filter:
                    </span>
                    <button
                        onClick={() => setRentStatusFilter('all')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${rentStatusFilter === 'all'
                            ? 'bg-[#091426] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        All Residents ({activeTenants.length})
                    </button>
                    <button
                        onClick={() => setRentStatusFilter('rent_paid')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${rentStatusFilter === 'rent_paid'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Rent Paid ({summaryStats.rentPaidCount})
                    </button>
                    <button
                        onClick={() => setRentStatusFilter('rent_pending')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${rentStatusFilter === 'rent_pending'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Rent Pending ({summaryStats.rentPendingCount})
                    </button>
                    <button
                        onClick={() => setRentStatusFilter('advance_pending')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${rentStatusFilter === 'advance_pending'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Advance Pending ({summaryStats.advancePendingCount})
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT: ALL TENANT DETAILS IN LIST VIEW */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Resident Payment &amp; Deposit Roster
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Essential financial status (Advance Security Deposit and Current Month Rent) for all residents.
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        Showing {filteredTenants.length} Resident{filteredTenants.length === 1 ? '' : 's'}
                    </span>
                </div>

                {filteredTenants.length === 0 ? (
                    <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <Search className="w-6 h-6" />
                        </div>
                        <div className="text-sm font-bold text-slate-800">No residents match your filters</div>
                        <p className="text-xs text-slate-500 max-w-sm">
                            Try adjusting the floor, room, or search terms to view resident payment status.
                        </p>
                        <button
                            onClick={handleResetFilters}
                            className="h-8 px-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        >
                            Clear All Filters
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                                    <th className="py-3.5 px-4">Resident</th>
                                    <th className="py-3.5 px-4">Room &amp; Floor</th>
                                    <th className="py-3.5 px-4 font-mono">Monthly Rent</th>
                                    <th className="py-3.5 px-4">Advance Paid</th>
                                    <th className="py-3.5 px-4">Current Month Rent</th>
                                    <th className="py-3.5 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredTenants.map(t => {
                                    const fin = getTenantFinancials(t);

                                    return (
                                        <tr
                                            key={t.id}
                                            className="hover:bg-slate-50/80 transition-colors"
                                        >
                                            {/* Resident Info: Minimal and Clean (Name, Phone, Initials) */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-[#091426] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                                        {t.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-900 text-sm">
                                                            {t.name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                                            <Phone className="w-3 h-3 text-slate-400" />
                                                            <span>{t.phone}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Room & Floor */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                                        Room {t.roomNumber}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                        {formatFloorName(fin.floor)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Standard Monthly Rent */}
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                ₹{(t.monthlyRent || 8000).toLocaleString('en-IN')}
                                                <span className="text-[10px] text-slate-400 font-sans font-normal block">
                                                    per month
                                                </span>
                                            </td>

                                            {/* Advance Paid Details */}
                                            <td className="py-3.5 px-4">
                                                {fin.isAdvancePaid ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-[11px] w-fit">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            <span>Paid • ₹{fin.advanceAmount.toLocaleString('en-IN')}</span>
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {fin.advanceReceiptNo}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded text-[11px] w-fit">
                                                            <Clock className="w-3 h-3 text-amber-600" />
                                                            <span>Pending</span>
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            ₹{fin.advanceAmount.toLocaleString('en-IN')} due
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Current Month Rent Status */}
                                            <td className="py-3.5 px-4">
                                                {fin.rentStatus === 'paid' ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded text-[11px] w-fit">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            <span>Paid • ₹{fin.rentAmount.toLocaleString('en-IN')}</span>
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            {fin.cycleName}
                                                            {fin.paymentMode && ` • ${fin.paymentMode}`}
                                                        </span>
                                                    </div>
                                                ) : fin.rentStatus === 'partially_paid' ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded text-[11px] w-fit">
                                                            <Clock className="w-3 h-3 text-blue-600" />
                                                            <span>Partially Paid</span>
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            {fin.cycleName}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded text-[11px] w-fit">
                                                            <AlertCircle className="w-3 h-3 text-rose-600" />
                                                            <span>Pending</span>
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            {fin.cycleName} • ₹{fin.rentAmount.toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Action Button: View Detailed Ledger Drawer */}
                                            <td className="py-3.5 px-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedLedgerTenant(t);
                                                        if (onSelectTenant) onSelectTenant(t);
                                                    }}
                                                    className="h-8 px-3 bg-slate-100 hover:bg-[#091426] hover:text-white text-slate-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <Receipt className="w-3.5 h-3.5" />
                                                    <span>View Ledger</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SLIDE-OVER DRAWER: DETAILED PAYMENT LEDGER & RECEIPTS FOR SELECTED TENANT */}
            {selectedLedgerTenant && (
                <div className="fixed inset-0 z-50 bg-black/40 flex justify-end animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200 border-l border-slate-200">
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#091426] text-white flex items-center justify-center font-bold text-sm">
                                    {selectedLedgerTenant.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-slate-900">
                                            {selectedLedgerTenant.name}
                                        </h2>
                                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                            Room {selectedLedgerTenant.roomNumber}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                                        {selectedLedgerTenant.phone} • ₹{(selectedLedgerTenant.monthlyRent || 8000).toLocaleString('en-IN')}/mo
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedLedgerTenant(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
                            {/* Financial Summary Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                                        Advance Deposit
                                    </span>
                                    <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
                                        ₹{drawerAdvancePaidAmount.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[11px] text-emerald-800 font-medium block mt-0.5">
                                        {drawerAdvanceRecord ? 'Verified & Held in Custody' : 'Standard Deposit Pending'}
                                    </span>
                                </div>

                                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
                                    <span className="text-[10px] uppercase font-bold text-blue-800 block">
                                        Total Rent Cleared
                                    </span>
                                    <span className="text-xl font-bold font-mono text-blue-700 block mt-1">
                                        ₹{drawerTotalRentPaid.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[11px] text-blue-800 font-medium block mt-0.5">
                                        {drawerPaymentRecords.filter(p => p.category === 'monthly_rent').length} Monthly Cycles Cleared
                                    </span>
                                </div>
                            </div>

                            {/* Ledger Filter Tabs */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Payment Records</span>
                                </h3>

                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                                    <button
                                        onClick={() => setLedgerFilterType('all')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${ledgerFilterType === 'all'
                                            ? 'bg-white text-slate-900 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        All ({drawerPaymentRecords.length})
                                    </button>
                                    <button
                                        onClick={() => setLedgerFilterType('monthly_rent')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${ledgerFilterType === 'monthly_rent'
                                            ? 'bg-white text-slate-900 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        Rent Only
                                    </button>
                                    <button
                                        onClick={() => setLedgerFilterType('advance_deposit')}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${ledgerFilterType === 'advance_deposit'
                                            ? 'bg-white text-slate-900 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        Advance
                                    </button>
                                </div>
                            </div>

                            {/* Ledger Entries List */}
                            {filteredDrawerRecords.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                                    No transaction records found for this resident.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2.5">
                                    {filteredDrawerRecords.map(record => {
                                        const isAdvance = record.category === 'advance_deposit';

                                        return (
                                            <div
                                                key={record.id}
                                                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${isAdvance
                                                    ? 'bg-emerald-50/40 border-emerald-200/80'
                                                    : 'bg-white hover:bg-slate-50/70 border-slate-200/80 shadow-2xs'
                                                    }`}
                                            >
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-slate-900 text-xs">
                                                            {record.periodOrType}
                                                        </span>
                                                        {isAdvance ? (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                                                Advance
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
                                                                Rent
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                                                        <span>{record.date}</span>
                                                        <span>•</span>
                                                        <span>{record.receiptNumber}</span>
                                                        <span>•</span>
                                                        <span>{record.paymentMode}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right font-mono">
                                                        <span className="text-sm font-bold text-slate-900 block">
                                                            ₹{record.amount.toLocaleString('en-IN')}
                                                        </span>
                                                        <span className="text-[10px] text-emerald-600 font-sans font-semibold">
                                                            Verified
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => setActiveReceipt(record)}
                                                        className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                                        title="View Receipt"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Receipt</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-mono">
                                {filteredDrawerRecords.length} records displayed
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="h-8 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Print Statement</span>
                                </button>
                                <button
                                    onClick={() => setSelectedLedgerTenant(null)}
                                    className="h-8 px-3.5 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* OFFICIAL RECEIPT POPUP MODAL */}
            {activeReceipt && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 relative">
                        <button
                            onClick={() => setActiveReceipt(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Receipt Header */}
                        <div className="border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#091426] text-white flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 font-display">
                                        Property Operations Ledger
                                    </h3>
                                    <p className="text-[10px] text-slate-400">Official Payment Receipt &amp; Voucher</p>
                                </div>
                            </div>
                        </div>

                        {/* Receipt Meta */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                            <div>
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Receipt Number</span>
                                <div className="font-mono font-bold text-slate-900">{activeReceipt.receiptNumber}</div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold">Date of Payment</span>
                                <div className="font-mono font-bold text-slate-900">{activeReceipt.date}</div>
                            </div>
                        </div>

                        {/* Resident & Payment Details */}
                        <div className="flex flex-col gap-2 text-xs text-slate-700">
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Resident Name</span>
                                <span className="font-semibold text-slate-900">
                                    {activeReceipt.tenantName || (selectedLedgerTenant ? selectedLedgerTenant.name : '')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Room Number</span>
                                <span className="font-mono font-bold text-slate-900">Room {activeReceipt.roomNumber}</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Payment Nature</span>
                                <span className="font-medium text-slate-900">{activeReceipt.periodOrType}</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Payment Mode</span>
                                <span className="font-mono font-bold text-slate-800">{activeReceipt.paymentMode}</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Reference / UTR</span>
                                <span className="font-mono text-slate-600">{activeReceipt.referenceNumber}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-200">
                                <span className="text-sm font-bold text-slate-900">Amount Paid</span>
                                <span className="text-xl font-bold font-mono text-emerald-700">
                                    ₹{activeReceipt.amount.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {/* Digital Verification Stamp */}
                        <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Digitally verified by RMS Banking Reconciliation Engine.</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                onClick={() => setActiveReceipt(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Receipt</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
