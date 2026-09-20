import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    ArrowLeft,
    Receipt,
    Download,
    CheckCircle2,
    Calendar,
    CreditCard,
    Building2,
    DoorOpen,
    Phone,
    Mail,
    MapPin,
    Briefcase,
    ShieldCheck,
    Printer,
    ChevronDown,
    X,
    FileText,
    Search,
    SlidersHorizontal,
    RotateCcw,
    Check,
    User,
    Banknote,
    Smartphone,
} from 'lucide-react';
import { Tenant, TenantPaymentRecord, PageId, Room, Invoice } from '../../types';
import { generateTenantPaymentHistory } from '../../data/tenantPayments';
import { formatAadharDisplay } from '../../utils/formatters';

interface TenantPaymentHistoryViewProps {
    tenant: Tenant;
    allTenants: Tenant[];
    rooms?: Room[];
    invoices?: Invoice[];
    onSelectTenant: (tenant: Tenant) => void;
    onBack: () => void;
}

export const TenantPaymentHistoryView: React.FC<TenantPaymentHistoryViewProps> = ({
    tenant,
    allTenants,
    rooms = [],
    invoices = [],
    onSelectTenant,
    onBack,
}) => {
    const [filterType, setFilterType] = useState<'all' | 'monthly_rent' | 'advance_deposit'>('all');
    const [activeReceipt, setActiveReceipt] = useState<TenantPaymentRecord | null>(null);

    // Search Panel States (Floor, Room, Resident Search)
    const [selectedFloor, setSelectedFloor] = useState<string>('all');
    const [selectedRoom, setSelectedRoom] = useState<string>('all');
    const [residentSearchTerm, setResidentSearchTerm] = useState<string>('');
    const [isResidentDropdownOpen, setIsResidentDropdownOpen] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsResidentDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 1. Calculate Available Floors sorted ascending
    const availableFloors = useMemo(() => {
        const floorSet = new Set<number>();
        if (rooms && rooms.length > 0) {
            rooms.forEach(r => floorSet.add(r.floor));
        }
        // Also include floors inferred from tenants' rooms if any
        allTenants.forEach(t => {
            const parsed = parseInt(t.roomNumber[0], 10);
            if (!isNaN(parsed) && parsed > 0) floorSet.add(parsed);
        });
        return Array.from(floorSet).sort((a, b) => a - b);
    }, [rooms, allTenants]);

    // 2. Calculate Available Rooms filtered by Selected Floor and sorted numerically
    const availableRooms = useMemo(() => {
        const roomMap = new Map<string, number>();

        if (rooms && rooms.length > 0) {
            rooms.forEach(r => roomMap.set(r.roomNumber, r.floor));
        }
        allTenants.forEach(t => {
            if (!roomMap.has(t.roomNumber)) {
                const inferredFloor = parseInt(t.roomNumber[0], 10) || 1;
                roomMap.set(t.roomNumber, inferredFloor);
            }
        });

        let list = Array.from(roomMap.entries()).map(([roomNumber, floor]) => ({
            roomNumber,
            floor,
        }));

        // If floor is selected, strictly only show rooms on this floor
        if (selectedFloor !== 'all') {
            const floorNum = parseInt(selectedFloor, 10);
            list = list.filter(r => r.floor === floorNum);
        }

        // Sort numerically (e.g., 101, 102, 103, 201...)
        return list.sort((a, b) =>
            a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
        );
    }, [rooms, allTenants, selectedFloor]);

    // 3. Filter Residents based on Floor, Room, and Search Input
    const filteredTenants = useMemo(() => {
        return allTenants
            .filter(t => {
                // Floor Filter
                if (selectedFloor !== 'all') {
                    const floorNum = parseInt(selectedFloor, 10);
                    const rm = rooms.find(r => r.roomNumber === t.roomNumber);
                    const tenantFloor = rm ? rm.floor : parseInt(t.roomNumber[0], 10) || 1;
                    if (tenantFloor !== floorNum) return false;
                }

                // Room Filter
                if (selectedRoom !== 'all') {
                    if (t.roomNumber !== selectedRoom) return false;
                }

                // Search Query (matches name, roomNumber, phone)
                if (residentSearchTerm.trim()) {
                    const q = residentSearchTerm.toLowerCase();
                    const matchName = t.name.toLowerCase().includes(q);
                    const matchRoom = t.roomNumber.toLowerCase().includes(q);
                    const matchPhone = t.phone.toLowerCase().includes(q);
                    if (!matchName && !matchRoom && !matchPhone) return false;
                }

                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allTenants, rooms, selectedFloor, selectedRoom, residentSearchTerm]);

    // Handle Floor Change with Cascading Room Reset
    const handleFloorChange = (newFloor: string) => {
        setSelectedFloor(newFloor);
        // If current selectedRoom is not on this new floor, reset room to all
        if (newFloor !== 'all' && selectedRoom !== 'all') {
            const rm = rooms.find(r => r.roomNumber === selectedRoom);
            const roomFloor = rm ? rm.floor : parseInt(selectedRoom[0], 10);
            if (roomFloor !== parseInt(newFloor, 10)) {
                setSelectedRoom('all');
            }
        }
    };

    // Handle Room Change with Cascading Auto-Selection
    const handleRoomChange = (newRoom: string) => {
        setSelectedRoom(newRoom);
        if (newRoom !== 'all') {
            // Auto-set floor if currently all
            const rm = rooms.find(r => r.roomNumber === newRoom);
            const roomFloor = rm ? rm.floor : parseInt(newRoom[0], 10);
            if (roomFloor && selectedFloor === 'all') {
                setSelectedFloor(roomFloor.toString());
            }
            // If exactly one tenant lives in this room, auto-switch to them
            const roomTenants = allTenants.filter(t => t.roomNumber === newRoom);
            if (roomTenants.length === 1 && tenant.id !== roomTenants[0].id) {
                onSelectTenant(roomTenants[0]);
            }
        }
    };

    // Reset all filters
    const handleResetFilters = () => {
        setSelectedFloor('all');
        setSelectedRoom('all');
        setResidentSearchTerm('');
        setIsResidentDropdownOpen(false);
    };

    const hasActiveFilters =
        selectedFloor !== 'all' || selectedRoom !== 'all' || residentSearchTerm.trim() !== '';

    // Generate full payment records for current tenant
    const paymentRecords = useMemo(() => {
        return generateTenantPaymentHistory(tenant, invoices);
    }, [tenant, invoices]);

    // Find advance deposit record specifically
    const advanceRecord = useMemo(() => {
        return paymentRecords.find(p => p.category === 'advance_deposit');
    }, [paymentRecords]);

    // Filtered records
    const filteredRecords = useMemo(() => {
        if (filterType === 'all') return paymentRecords;
        return paymentRecords.filter(p => p.category === filterType);
    }, [paymentRecords, filterType]);

    // Calculations
    const totalRentPaid = useMemo(() => {
        return paymentRecords
            .filter(p => p.category === 'monthly_rent')
            .reduce((sum, p) => sum + p.amount, 0);
    }, [paymentRecords]);

    const advancePaid = advanceRecord ? advanceRecord.amount : (tenant.monthlyRent * 2);
    const totalPaidLifetime = totalRentPaid + advancePaid;

    const handlePrintStatement = () => {
        window.print();
    };

    return (
        <div className="flex flex-col w-full gap-5">
            {/* Top Navigation & Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Tenants</span>
                    </button>
                    <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                        Tenant Payment Ledger &amp; Security Deposit Desk
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrintStatement}
                        className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Ledger</span>
                    </button>
                    <button
                        onClick={() => alert(`Exporting complete payment statement for ${tenant.name}`)}
                        className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Statement</span>
                    </button>
                </div>
            </div>

            {/* DEDICATED SEARCH & FILTER PANEL FOR RESIDENTS (With Floor, Room & 10-Item Scrollable Dropdown) */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col gap-3">
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
                                Filter by Floor, narrow to Room, and search residents directly.
                            </p>
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={handleResetFilters}
                            className="self-start sm:self-auto h-7 px-2.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
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
                                    <option key={fl} value={fl.toString()}>
                                        {fl === 1 ? '1st Floor' : fl === 2 ? '2nd Floor' : fl === 3 ? '3rd Floor' : `Floor ${fl}`}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* 2. Room Selector (Filtered according to Floor) */}
                    <div className="sm:col-span-3 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <DoorOpen className="w-3 h-3 text-slate-400" />
                            <span>Room</span>
                            {selectedFloor !== 'all' && (
                                <span className="text-[9px] font-normal text-blue-600 bg-blue-50 px-1 rounded">
                                    Floor {selectedFloor}
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
                                    {selectedFloor !== 'all' ? `All Rooms on Fl ${selectedFloor}` : 'All Rooms'}
                                </option>
                                {availableRooms.map(rm => (
                                    <option key={rm.roomNumber} value={rm.roomNumber}>
                                        Room {rm.roomNumber} (Fl {rm.floor})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* 3. Search Resident / Tenant (Input with 10-Item Scrollable Dropdown) */}
                    <div className="sm:col-span-6 flex flex-col gap-1 relative" ref={dropdownRef}>
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>Search Resident / Tenant</span>
                            </label>
                            <span className="text-[10px] font-semibold text-slate-400">
                                {filteredTenants.length} Available
                            </span>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Search className="w-3.5 h-3.5" />
                            </div>
                            <input
                                type="text"
                                value={residentSearchTerm}
                                onFocus={() => setIsResidentDropdownOpen(true)}
                                onChange={e => {
                                    setResidentSearchTerm(e.target.value);
                                    setIsResidentDropdownOpen(true);
                                }}
                                placeholder={`Search resident/tenant (Current: ${tenant.name} - Rm ${tenant.roomNumber})`}
                                className="w-full h-9 pl-9 pr-8 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                            {residentSearchTerm ? (
                                <button
                                    onClick={() => setResidentSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsResidentDropdownOpen(prev => !prev)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Custom Interactive Dropdown List: Limited to 10 records per view (~380px) and then scrollable */}
                        {isResidentDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                                {/* Header count info */}
                                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                                    <span>
                                        Select Resident {selectedRoom !== 'all' ? `(Room ${selectedRoom})` : ''}
                                    </span>
                                    <span className="font-mono">{filteredTenants.length} records</span>
                                </div>

                                {/* Scrollable list bounded to ~10 items (approx 38px each -> 380px max-height) */}
                                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50 overscroll-contain">
                                    {filteredTenants.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            No residents found matching the criteria.
                                        </div>
                                    ) : (
                                        filteredTenants.map(t => {
                                            const isSelected = t.id === tenant.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => {
                                                        onSelectTenant(t);
                                                        setIsResidentDropdownOpen(false);
                                                        setResidentSearchTerm('');
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors hover:bg-slate-50 ${isSelected
                                                        ? 'bg-blue-50/70 text-blue-900 font-semibold'
                                                        : 'text-slate-800'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div
                                                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${isSelected
                                                                ? 'bg-blue-600 text-white'
                                                                : 'bg-slate-100 text-slate-700'
                                                                }`}
                                                        >
                                                            {t.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold truncate">{t.name}</span>
                                                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                                                    Room {t.roomNumber}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 font-mono truncate">
                                                                {t.phone} • ₹{t.monthlyRent.toLocaleString('en-IN')}/mo
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                                        {isSelected ? (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                                                <Check className="w-3 h-3" />
                                                                <span>Active</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-semibold text-slate-400 hover:text-slate-600">
                                                                Select
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Resident Identity & Profile Summary Banner */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#091426] text-white flex items-center justify-center font-display font-bold text-xl shadow-xs shrink-0">
                        {tenant.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold text-[#091426] font-display">
                                {tenant.name}
                            </h1>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Verified Resident
                            </span>
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                Room {tenant.roomNumber}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 flex-wrap">
                            <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-mono">{tenant.phone}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span>{tenant.email}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>Hometown: <strong>{tenant.hometown || 'Bangalore'}</strong></span>
                            </span>
                            <span className="flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                <span>{tenant.profession || 'Working Professional'}</span>
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Aadhar: <strong>{formatAadharDisplay(tenant.aadharNumber) || '5489 2104 9382'}</strong></span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Room & Rent Snapshot */}
                <div className="flex items-center gap-6 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 text-xs">
                    <div>
                        <span className="text-[11px] text-slate-400 block uppercase font-medium">Monthly Rent</span>
                        <span className="font-mono text-lg font-bold text-slate-900">
                            ₹{tenant.monthlyRent.toLocaleString('en-IN')}/mo
                        </span>
                        <span className="text-[10px] text-emerald-700 block font-medium">Auto-debited on 5th</span>
                    </div>
                    <div>
                        <span className="text-[11px] text-slate-400 block uppercase font-medium">Joined On</span>
                        <span className="font-mono text-lg font-bold text-slate-900">
                            {tenant.joinedDate}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-medium">Admission Verified</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards: Advance Paid, Total Rent Paid, Payment Health */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Advance Caution Deposit (Explicitly Requested) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            Advance Paid (Security)
                        </span>
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-emerald-700 font-display tabular-nums font-mono">
                            ₹{advancePaid.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                            Refundable Deposit Held
                        </span>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-600 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {advanceRecord ? advanceRecord.receiptNumber : 'Receipt Verified'}
                    </div>
                </div>

                {/* Total Rent Paid to Date */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            Total Rent Paid
                        </span>
                        <CreditCard className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-[#091426] font-display tabular-nums font-mono">
                            ₹{totalRentPaid.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                            From {tenant.joinedDate} to Present
                        </span>
                    </div>
                    <div className="mt-3 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold w-fit">
                        {paymentRecords.filter(p => p.category === 'monthly_rent').length} Monthly Cycles Cleared
                    </div>
                </div>

                {/* Total Lifetime Collection */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            Lifetime Total Transacted
                        </span>
                        <Receipt className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-[#091426] font-display tabular-nums font-mono">
                            ₹{totalPaidLifetime.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                            Advance + Monthly Rent
                        </span>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-600 font-medium">
                        {paymentRecords.length} Verified Entries
                    </div>
                </div>

                {/* Payment Discipline / Arrears */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            Account Status
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-emerald-700 font-display tabular-nums">
                            Zero Arrears
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                            Current Balance: ₹0.00
                        </span>
                    </div>
                    <div className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold w-fit flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>100% On-Time Record</span>
                    </div>
                </div>
            </div>

            {/* Advance Paid Highlight Card */}
            {advanceRecord && (
                <div className="bg-gradient-to-r from-emerald-50/80 via-white to-blue-50/50 p-5 rounded-xl border border-emerald-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-900">
                                    Initial Security Deposit &amp; Move-in Advance Paid
                                </h2>
                                <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                    Held in Custody
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Paid on <strong>{advanceRecord.date}</strong> at the time of room intake. Refundable upon notice period completion and exit clearance.
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 font-mono">
                                <span>Receipt: <strong>{advanceRecord.receiptNumber}</strong></span>
                                <span>•</span>
                                <span>Ref: <strong>{advanceRecord.referenceNumber}</strong></span>
                                <span>•</span>
                                <span>Mode: <strong>{advanceRecord.paymentMode}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                        <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Advance Amount</span>
                            <span className="text-xl font-bold font-mono text-emerald-700">
                                ₹{advanceRecord.amount.toLocaleString('en-IN')}
                            </span>
                        </div>
                        <button
                            onClick={() => setActiveReceipt(advanceRecord)}
                            className="h-8 px-3 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Deposit Receipt</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Chronological Payment History Ledger */}
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-blue-600" />
                            <h2 className="text-base font-bold text-[#091426]">
                                Complete Payment History (From Inception)
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Chronological log of all security deposits, monthly rent, and fees received for {tenant.name}.
                        </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${filterType === 'all'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            All ({paymentRecords.length})
                        </button>
                        <button
                            onClick={() => setFilterType('monthly_rent')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${filterType === 'monthly_rent'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Rent Only
                        </button>
                        <button
                            onClick={() => setFilterType('advance_deposit')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${filterType === 'advance_deposit'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Advance Paid
                        </button>
                    </div>
                </div>

                {/* Payment History Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                                <th className="py-3 px-3.5">Payment Date</th>
                                <th className="py-3 px-3.5">Description &amp; Period</th>
                                <th className="py-3 px-3.5">Category</th>
                                <th className="py-3 px-3.5 font-mono">Receipt #</th>
                                <th className="py-3 px-3.5">Mode</th>
                                <th className="py-3 px-3.5 font-mono text-right">Amount</th>
                                <th className="py-3 px-3.5">Verification</th>
                                <th className="py-3 px-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredRecords.map(record => {
                                const isAdvance = record.category === 'advance_deposit';

                                return (
                                    <tr
                                        key={record.id}
                                        className={`hover:bg-slate-50/80 transition-colors ${isAdvance ? 'bg-emerald-50/30' : ''
                                            }`}
                                    >
                                        <td className="py-3.5 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                                            {record.date}
                                        </td>

                                        <td className="py-3.5 px-3.5">
                                            <div className="font-semibold text-slate-900">
                                                {record.periodOrType}
                                            </div>
                                            <div className="font-mono text-[11px] text-slate-400">
                                                Ref: {record.referenceNumber}
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-3.5">
                                            {isAdvance ? (
                                                <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
                                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                                    <span>Advance Deposit</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                                                    Monthly Rent
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-3.5 font-mono font-medium text-slate-600">
                                            {record.receiptNumber}
                                        </td>

                                        <td className="py-3.5 px-3.5">
                                            {record.paymentMode.toUpperCase().includes('CASH') ? (
                                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded text-[11px]">
                                                    <Banknote className="w-3 h-3 text-emerald-600" />
                                                    <span>Cash Voucher</span>
                                                </span>
                                            ) : record.paymentMode.toUpperCase().includes('UPI') ? (
                                                <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded text-[11px]">
                                                    <Smartphone className="w-3 h-3 text-indigo-600" />
                                                    <span>UPI Settlement</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                    {record.paymentMode}
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                                            ₹{record.amount.toLocaleString('en-IN')}
                                        </td>

                                        <td className="py-3.5 px-3.5">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Auto-Verified</span>
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-3.5 text-right">
                                            <button
                                                onClick={() => setActiveReceipt(record)}
                                                className="px-2.5 py-1 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded text-xs font-semibold transition-colors"
                                            >
                                                View Receipt
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing {filteredRecords.length} recorded payments since {tenant.joinedDate}</span>
                    <span className="font-mono font-semibold text-slate-800">
                        Total Displayed: ₹{filteredRecords.reduce((acc, r) => acc + r.amount, 0).toLocaleString('en-IN')}
                    </span>
                </div>
            </div>

            {/* Official Receipt Modal */}
            {activeReceipt && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 relative">
                        <button
                            onClick={() => setActiveReceipt(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Receipt Header */}
                        <div className="border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#091426] text-white flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 font-display">
                                        Project RMS • Greenwood PG
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
                        <div className="flex flex-col gap-2.5 text-xs text-slate-700">
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Resident Name</span>
                                <span className="font-semibold text-slate-900">{tenant.name}</span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                <span className="text-slate-500">Room Assigned</span>
                                <span className="font-mono font-bold text-slate-900">Room {tenant.roomNumber}</span>
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
                                <span className="text-xl font-bold font-mono text-slate-900">
                                    ₹{activeReceipt.amount.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>

                        {/* Digital Stamp */}
                        <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Digitally verified by RMS Banking Reconciliation Engine.</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setActiveReceipt(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
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
