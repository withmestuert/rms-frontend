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
    Copy,
    Check,
    Loader2,
    Share2,
    Calendar,
} from 'lucide-react';
import { Tenant, Room, Invoice, TenantMonthlyPayItem } from '../../types';
import { apiService } from '../../services/apiService';

interface TenantPaymentHistoryViewProps {
    tenant?: Tenant;
    allTenants: Tenant[];
    rooms?: Room[];
    invoices?: Invoice[];
    onSelectTenant?: (tenant: Tenant) => void;
    onBack: () => void;
}

export const TenantPaymentHistoryView: React.FC<TenantPaymentHistoryViewProps> = ({
    tenant: initialTenant,
    allTenants = [],
    rooms = [],
    onSelectTenant,
    onBack,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTenantUid, setSelectedTenantUid] = useState<string>(initialTenant?.id || 'all');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'upi'>('all');
    const [loading, setLoading] = useState(true);
    const [ledgerItems, setLedgerItems] = useState<TenantMonthlyPayItem[]>([]);
    const [copiedRef, setCopiedRef] = useState<string | null>(null);
    const [copiedPayLink, setCopiedPayLink] = useState<string | null>(null);
    const [selectedReceipt, setSelectedReceipt] = useState<TenantMonthlyPayItem | null>(null);

    // Fetch monthly ledger from real backend endpoint
    const fetchLedger = async () => {
        setLoading(true);
        try {
            const data = await apiService.getTenantMonthlyLedger({
                tenantUid: selectedTenantUid !== 'all' ? selectedTenantUid : undefined,
                search: searchTerm.trim() || undefined,
                monthYear: selectedMonth !== 'all' ? selectedMonth : undefined,
            });
            setLedgerItems(data);
        } catch (err) {
            console.error('Failed to fetch monthly ledger:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setSelectedTenantUid(initialTenant?.id || 'all');
    }, [initialTenant]);

    useEffect(() => {
        fetchLedger();
    }, [selectedTenantUid, selectedMonth]);

    // Debounced search trigger
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLedger();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Available unique months
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        ledgerItems.forEach(item => {
            if (item.monthYear) months.add(item.monthYear);
        });
        return Array.from(months);
    }, [ledgerItems]);

    // Filtered by status tab
    const filteredItems = useMemo(() => {
        return ledgerItems.filter(item => {
            if (statusFilter === 'paid') return item.pendingAmount === 0 || item.status === 'PAID';
            if (statusFilter === 'pending') return item.pendingAmount > 0 || item.status !== 'PAID';
            if (statusFilter === 'upi') return (item.paymentMode || '').toUpperCase().includes('UPI');
            return true;
        });
    }, [ledgerItems, statusFilter]);

    // Summary KPIs
    const summary = useMemo(() => {
        let totalBilled = 0;
        let totalPaid = 0;
        let totalPending = 0;
        let upiCount = 0;

        filteredItems.forEach(item => {
            totalBilled += item.billedAmount || 0;
            totalPaid += item.paidAmount || 0;
            totalPending += item.pendingAmount || 0;
            if ((item.paymentMode || '').toUpperCase().includes('UPI')) upiCount++;
        });

        return {
            totalRecords: filteredItems.length,
            totalBilled,
            totalPaid,
            totalPending,
            upiCount,
        };
    }, [filteredItems]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedRef(text);
        setTimeout(() => setCopiedRef(null), 2000);
    };

    const handleCopyPayLink = (invNum: string) => {
        const link = `${window.location.origin}/pay/${invNum}`;
        navigator.clipboard.writeText(link);
        setCopiedPayLink(invNum);
        setTimeout(() => setCopiedPayLink(null), 2000);
    };

    const handleExportCsv = () => {
        if (!filteredItems.length) return;
        const headers = ['Tenant Name', 'Room No', 'Bed', 'Month', 'Paid On', 'Billed Amount (INR)', 'Paid Amount (INR)', 'Pending (INR)', 'Paid Through', 'UPI Details / Reference', 'Status'];
        const rows = filteredItems.map(i => [
            `"${(i.tenantName || '').replace(/"/g, '""')}"`,
            `"${(i.roomNo || '').replace(/"/g, '""')}"`,
            `"${(i.bedNumber || '-').replace(/"/g, '""')}"`,
            `"${(i.monthYear || '').replace(/"/g, '""')}"`,
            `"${(i.paidOn || '-').replace(/"/g, '""')}"`,
            i.billedAmount || 0,
            i.paidAmount || 0,
            i.pendingAmount || 0,
            `"${(i.paymentMode || '-').replace(/"/g, '""')}"`,
            `"${(i.upiDetails || i.transactionRef || '-').replace(/"/g, '""')}"`,
            `"${(i.status || 'PENDING').replace(/"/g, '""')}"`,
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `tenant_monthly_pay_list_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <div className="flex flex-col w-full gap-5">
            {/* Top Navigation & Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>
                    <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                    <div>
                        <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-indigo-600" />
                            Tenant Monthly Pay List &amp; Statement
                        </h1>
                        <p className="text-xs text-slate-500 hidden sm:block">
                            Lookup monthly rent clearance, pending amounts, and UPI transaction reference specifics for any resident.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCsv}
                        disabled={filteredItems.length === 0}
                        className="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Statement</span>
                    </button>
                </div>
            </div>

            {/* KPI Metrics Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Monthly Invoices
                    </span>
                    <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                        {summary.totalRecords}
                    </div>
                    <span className="text-[11px] text-slate-500">Statements displayed</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Collected
                    </span>
                    <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                        ₹{summary.totalPaid.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-slate-500">Cleared rent payments</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Pending
                    </span>
                    <div className={`text-xl font-bold font-mono mt-1 ${summary.totalPending > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        ₹{summary.totalPending.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-slate-500">Unsettled balance</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        UPI Transactions
                    </span>
                    <div className="text-xl font-bold font-mono text-indigo-600 mt-1">
                        {summary.upiCount}
                    </div>
                    <span className="text-[11px] text-slate-500">Paid via UPI / QR / Net</span>
                </div>
            </div>

            {/* SEARCH & FILTER CONTROLS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* 1. Universal Search Input */}
                    <div className="sm:col-span-5 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Search className="w-3 h-3 text-slate-400" />
                            <span>Search Tenant / Room</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search tenant name, room number, or mobile..."
                                className="w-full h-9 pl-9 pr-8 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 2. Tenant Dropdown Selector */}
                    <div className="sm:col-span-4 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Select Specific Tenant</span>
                        </label>
                        <div className="relative">
                            <select
                                value={selectedTenantUid}
                                onChange={e => {
                                    const val = e.target.value;
                                    setSelectedTenantUid(val);
                                    if (onSelectTenant) {
                                        const found = allTenants.find(t => t.id === val);
                                        onSelectTenant(found || (null as any));
                                    }
                                }}
                                className="w-full h-9 pl-3 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer appearance-none"
                            >
                                <option value="all">All Tenants ({allTenants.length})</option>
                                {allTenants.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} (Room {t.roomNumber})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* 3. Month Filter */}
                    <div className="sm:col-span-3 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Billing Month</span>
                        </label>
                        <div className="relative">
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="w-full h-9 pl-3 pr-8 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer appearance-none"
                            >
                                <option value="all">All Months</option>
                                {availableMonths.map(m => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Quick Status Pill Filters */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Filter By:
                    </span>
                    {[
                        { id: 'all', label: 'All Statements' },
                        { id: 'paid', label: 'Paid / Cleared' },
                        { id: 'pending', label: 'Pending / Due' },
                        { id: 'upi', label: 'UPI Payments Only' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id as any)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                statusFilter === tab.id
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}

                    {(searchTerm || selectedTenantUid !== 'all' || selectedMonth !== 'all' || statusFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedTenantUid('all');
                                setSelectedMonth('all');
                                setStatusFilter('all');
                            }}
                            className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* CLEAN MONTHLY PAY LIST TABLE (Exact Specification) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Monthly Tenant Pay List
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Clean tabular breakdown of resident rent payments, clearance dates, pending balances, and UPI references.
                        </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        Showing {filteredItems.length} Statement{filteredItems.length === 1 ? '' : 's'}
                    </span>
                </div>

                {loading ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                        <span className="text-xs font-medium">Loading tenant payment statements...</span>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <Search className="w-6 h-6" />
                        </div>
                        <div className="text-sm font-bold text-slate-800">No payment records found</div>
                        <p className="text-xs text-slate-500 max-w-sm">
                            Try adjusting the tenant search, room number, or billing month filters.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200">
                                    <th className="py-3 px-4">Tenant Name</th>
                                    <th className="py-3 px-4">Room No</th>
                                    <th className="py-3 px-4">Months</th>
                                    <th className="py-3 px-4">Paid On</th>
                                    <th className="py-3 px-4 text-right">Pending</th>
                                    <th className="py-3 px-4">Paid Through (with Details)</th>
                                    <th className="py-3 px-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map(item => {
                                    const isPaid = item.pendingAmount === 0 || item.status === 'PAID';
                                    const isUpi = (item.paymentMode || '').toUpperCase().includes('UPI');
                                    const upiRef = item.upiDetails || item.transactionRef;

                                    const cleanPhone = (item.mobileNumber || '').replace(/\D/g, '');
                                    const payLink = `${window.location.origin}/pay/${item.invoiceNumber}`;
                                    const waMsg = encodeURIComponent(
                                        isPaid
                                            ? `Hello ${item.tenantName}, your rent payment for Room ${item.roomNo} (${item.monthYear}) has been cleared. View official receipt here: ${payLink}. Reference: ${upiRef || 'Cleared'}. Thank you!`
                                            : `Hello ${item.tenantName}, your rent invoice of Rs. ${(item.pendingAmount || 0).toLocaleString('en-IN')} for Room ${item.roomNo} (${item.monthYear}) is ready. You can pay securely online via UPI / Cards here: ${payLink}`
                                    );
                                    const waUrl = cleanPhone ? `https://wa.me/91${cleanPhone}?text=${waMsg}` : null;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                            {/* Column 1: Tenant Name */}
                                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                                                        {(item.tenantName || 'T').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 block">
                                                            {item.tenantName}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 font-normal">
                                                            {item.mobileNumber || item.tenantUid}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Column 2: Room No */}
                                            <td className="py-3.5 px-4">
                                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-mono font-semibold">
                                                    <span>Room {item.roomNo}</span>
                                                    {item.bedNumber && item.bedNumber !== '-' && (
                                                        <span className="text-slate-500 font-normal">({item.bedNumber})</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Column 3: Months */}
                                            <td className="py-3.5 px-4">
                                                <span className="font-semibold text-slate-900 block">
                                                    {item.monthYear}
                                                </span>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {item.invoiceNumber}
                                                </span>
                                            </td>

                                            {/* Column 4: Paid On */}
                                            <td className="py-3.5 px-4">
                                                {isPaid && item.paidOn && item.paidOn !== '-' ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                        <span>{item.paidOn}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                                                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                        <span>Pending</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Column 5: Pending */}
                                            <td className="py-3.5 px-4 text-right">
                                                {item.pendingAmount === 0 ? (
                                                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        ₹0 (Cleared)
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-bold text-rose-600 text-sm">
                                                            ₹{item.pendingAmount.toLocaleString('en-IN')}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            of ₹{item.billedAmount.toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Column 6: Paid Through (with UPI Details) */}
                                            <td className="py-3.5 px-4">
                                                {isUpi ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px] w-fit">
                                                            <Smartphone className="w-3 h-3 text-indigo-600" />
                                                            <span>UPI</span>
                                                        </div>
                                                        {upiRef && upiRef !== '-' ? (
                                                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 w-fit">
                                                                <span className="text-slate-400 font-sans">UTR:</span>
                                                                <span className="font-semibold text-slate-800">{upiRef}</span>
                                                                <button
                                                                    onClick={() => handleCopy(upiRef)}
                                                                    className="p-0.5 hover:text-indigo-600 text-slate-400 ml-1 cursor-pointer"
                                                                    title="Copy UPI UTR Reference"
                                                                >
                                                                    {copiedRef === upiRef ? (
                                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                                    ) : (
                                                                        <Copy className="w-3 h-3" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic">UPI clearance recorded</span>
                                                        )}
                                                    </div>
                                                ) : item.paymentMode && item.paymentMode !== '-' ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                                                        <Banknote className="w-3 h-3 text-slate-500" />
                                                        <span>{item.paymentMode}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">-</span>
                                                )}
                                            </td>

                                            {/* Column 7: Action */}
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {waUrl && (
                                                        <a
                                                            href={waUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                                                                isPaid
                                                                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                                            }`}
                                                            title={isPaid ? 'Send receipt link via WhatsApp' : 'Send payment link via WhatsApp'}
                                                        >
                                                            <Share2 className="w-3 h-3" />
                                                            <span>WhatsApp</span>
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleCopyPayLink(item.invoiceNumber)}
                                                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition-colors"
                                                        title="Copy Public Payment Link"
                                                    >
                                                        {copiedPayLink === item.invoiceNumber ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                    <a
                                                        href={`/pay/${item.invoiceNumber}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition-colors"
                                                        title="Open Tenant Payment Portal"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                    <button
                                                        onClick={() => setSelectedReceipt(item)}
                                                        className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                                                        title="View Slip"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* RECEIPT / STATEMENT MODAL */}
            {selectedReceipt && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Payment Statement Slip</h3>
                                <p className="text-[11px] font-mono text-slate-400">{selectedReceipt.invoiceNumber}</p>
                            </div>
                            <button
                                onClick={() => setSelectedReceipt(null)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Resident Name:</span>
                                <span className="font-bold text-slate-900">{selectedReceipt.tenantName}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Room &amp; Bed:</span>
                                <span className="font-semibold text-slate-800">Room {selectedReceipt.roomNo} ({selectedReceipt.bedNumber})</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Billing Month:</span>
                                <span className="font-semibold text-slate-800">{selectedReceipt.monthYear}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Billed Amount:</span>
                                <span className="font-bold text-slate-900">₹{selectedReceipt.billedAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Amount Paid:</span>
                                <span className="font-bold text-emerald-600">₹{selectedReceipt.paidAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Pending Balance:</span>
                                <span className={`font-bold ${selectedReceipt.pendingAmount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                                    ₹{selectedReceipt.pendingAmount.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-50">
                                <span className="text-slate-500">Payment Mode:</span>
                                <span className="font-semibold text-slate-800">{selectedReceipt.paymentMode || '-'}</span>
                            </div>
                            {selectedReceipt.upiDetails && (
                                <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                                    <span className="text-[10px] font-bold uppercase text-indigo-700 block">UPI Transaction Reference / UTR</span>
                                    <span className="font-mono text-xs font-bold text-slate-800">{selectedReceipt.upiDetails}</span>
                                </div>
                            )}
                            <div className="flex justify-between py-1">
                                <span className="text-slate-500">Paid On:</span>
                                <span className="font-medium text-slate-800">{selectedReceipt.paidOn}</span>
                            </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                            <button
                                onClick={() => window.print()}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                Print
                            </button>
                            <button
                                onClick={() => setSelectedReceipt(null)}
                                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
