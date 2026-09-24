import React, { useState, useMemo } from 'react';
import {
    Receipt,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Download,
    CreditCard,
    Check,
    Plus,
    ArrowUpRight,
    TrendingUp,
    Banknote,
    Smartphone,
    X,
} from 'lucide-react';
import { Invoice, Tenant } from '../../types';

interface RentBillingViewProps {
    invoices: Invoice[];
    tenants?: Tenant[];
    onRecordPayment: (invoiceId: string, paymentMode: string, transactionRef?: string, paidOn?: string, amount?: number) => Promise<void> | void;
    onGenerateCycle?: (monthYear: string, dueDate: string) => Promise<any>;
    onCreateInvoice?: (dto: { tenantUid: string; monthYear: string; amount: number; dueDate: string; paymentMode?: string; }) => Promise<any>;
}

export const RentBillingView: React.FC<RentBillingViewProps> = ({
    invoices,
    tenants = [],
    onRecordPayment,
    onGenerateCycle,
    onCreateInvoice,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partially_paid' | 'pending' | 'upi' | 'cash'>('all');
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
    const [selectedPaymentMode, setSelectedPaymentMode] = useState<'UPI' | 'Cash' | 'NEFT' | 'Credit Card'>('UPI');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    const currentNow = new Date();
    const currentYearNum = currentNow.getFullYear();
    const currentMonthLong = currentNow.toLocaleString('en-US', { month: 'long' });
    const defaultCurrentMonthYear = `${currentMonthLong} ${currentYearNum}`;
    const defaultCurrentDueDate = `${currentYearNum}-${String(currentNow.getMonth() + 1).padStart(2, '0')}-05`;

    // Single Invoice Creation State
    const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
    const [newInvoiceTenantUid, setNewInvoiceTenantUid] = useState('');
    const [newInvoiceMonthYear, setNewInvoiceMonthYear] = useState(defaultCurrentMonthYear);
    const [newInvoiceAmount, setNewInvoiceAmount] = useState<number | ''>('');
    const [newInvoiceDueDate, setNewInvoiceDueDate] = useState(defaultCurrentDueDate);
    const [isCreatingSingle, setIsCreatingSingle] = useState(false);
    const [singleFeedback, setSingleFeedback] = useState<string | null>(null);

    // Cycle Generation Modal State
    const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
    const [cycleMonthYear, setCycleMonthYear] = useState(defaultCurrentMonthYear);
    const [cycleDueDate, setCycleDueDate] = useState(defaultCurrentDueDate);
    const [isGeneratingCycle, setIsGeneratingCycle] = useState(false);
    const [cycleFeedback, setCycleFeedback] = useState<string | null>(null);

    const totalBilled = useMemo(() => invoices.reduce((acc, i) => acc + i.amount, 0), [invoices]);
    const totalCollected = useMemo(() => invoices.reduce((acc, i) => acc + (i.paidAmount ?? (i.status === 'paid' ? i.amount : 0)), 0), [invoices]);
    const pendingCollection = Math.max(0, totalBilled - totalCollected);

    const paidInvoices = useMemo(() => invoices.filter(i => i.status === 'paid' || i.status === 'partially_paid'), [invoices]);
    const upiInvoices = useMemo(
        () => paidInvoices.filter(i => (i.paymentMode || 'UPI').toUpperCase().includes('UPI')),
        [paidInvoices]
    );
    const cashInvoices = useMemo(
        () => paidInvoices.filter(i => (i.paymentMode || '').toUpperCase().includes('CASH')),
        [paidInvoices]
    );
    const upiAmount = useMemo(() => upiInvoices.reduce((acc, i) => acc + (i.paidAmount ?? (i.status === 'paid' ? i.amount : 0)), 0), [upiInvoices]);
    const cashAmount = useMemo(() => cashInvoices.reduce((acc, i) => acc + (i.paidAmount ?? (i.status === 'paid' ? i.amount : 0)), 0), [cashInvoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch =
                inv.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter === 'all') return true;
            if (statusFilter === 'paid') return inv.status === 'paid';
            if (statusFilter === 'partially_paid') return inv.status === 'partially_paid';
            if (statusFilter === 'pending') return inv.status === 'pending';
            if (statusFilter === 'upi') {
                return (inv.status === 'paid' || inv.status === 'partially_paid') && (inv.paymentMode || 'UPI').toUpperCase().includes('UPI');
            }
            if (statusFilter === 'cash') {
                return (inv.status === 'paid' || inv.status === 'partially_paid') && (inv.paymentMode || '').toUpperCase().includes('CASH');
            }
            return true;
        });
    }, [invoices, searchQuery, statusFilter]);

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2">
                {onCreateInvoice && (
                    <button
                        type="button"
                        onClick={() => {
                            setSingleFeedback(null);
                            setIsSingleModalOpen(true);
                        }}
                        className="h-9 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                        <Plus className="w-4 h-4 text-slate-600" />
                        <span>Create Single Invoice</span>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => {
                        setCycleFeedback(null);
                        setIsCycleModalOpen(true);
                    }}
                    className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                    <Plus className="w-4 h-4" />
                    <span>Generate Next Cycle Invoices</span>
                </button>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Total Billed
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#091426] font-display tabular-nums">
                            ₹{totalBilled.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Across {invoices.length} active invoices</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Total Realized / Collected
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-700 font-display tabular-nums">
                            ₹{totalCollected.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                            {Math.round((totalCollected / (totalBilled || 1)) * 100)}% Collected
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono">
                        <span className="text-indigo-700 font-semibold flex items-center gap-1">
                            <Smartphone className="w-3 h-3" /> ₹{upiAmount.toLocaleString('en-IN')} UPI
                        </span>
                        <span>•</span>
                        <span className="text-emerald-800 font-semibold flex items-center gap-1">
                            <Banknote className="w-3 h-3" /> ₹{cashAmount.toLocaleString('en-IN')} Cash
                        </span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Outstanding Due
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-700 font-display tabular-nums">
                            ₹{pendingCollection.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Live PostgreSQL ledger &amp; billing status</span>
                    </div>
                </div>
            </div>

            {/* Filter and Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative max-w-sm flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search by resident name, room, or invoice #..."
                            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === 'all'
                                    ? 'bg-[#091426] text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            All ({invoices.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('paid')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === 'paid'
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/70'
                                }`}
                        >
                            Paid ({invoices.filter(i => i.status === 'paid').length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('partially_paid')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === 'partially_paid'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/70'
                                }`}
                        >
                            Partial ({invoices.filter(i => i.status === 'partially_paid').length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === 'pending'
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                }`}
                        >
                            Pending ({invoices.filter(i => i.status === 'pending').length})
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                                <th className="py-3 px-4">Invoice Number</th>
                                <th className="py-3 px-4">Resident</th>
                                <th className="py-3 px-4">Assigned Unit</th>
                                <th className="py-3 px-4">Billing Month</th>
                                <th className="py-3 px-4 font-mono text-right">Tariff Due</th>
                                <th className="py-3 px-4">Settlement &amp; Status</th>
                                <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400">
                                        No invoices found matching "{searchQuery}" with filter "{statusFilter}".
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map(inv => {
                                    const isPaid = inv.status === 'paid';
                                    const isPartial = inv.status === 'partially_paid';
                                    const isCash = (inv.paymentMode || '').toUpperCase().includes('CASH');
                                    const remaining = inv.remainingBalance ?? Math.max(0, inv.amount - (inv.paidAmount ?? 0));

                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                                                {inv.invoiceNumber}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="font-semibold text-slate-900">{inv.tenantName}</div>
                                                <div className="font-mono text-[10px] text-slate-400">{inv.tenantUid}</div>
                                            </td>
                                            <td className="py-3.5 px-4 font-medium text-slate-800">
                                                {inv.roomNumber}
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                                                {inv.monthYear}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-right">
                                                <div>₹{inv.amount.toLocaleString('en-IN')}</div>
                                                {isPartial && (
                                                    <div className="text-[10px] text-amber-700 font-semibold">
                                                        Rem: ₹{remaining.toLocaleString('en-IN')}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {isPaid ? (
                                                    <div>
                                                        {isCash ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                                <Banknote className="w-3 h-3 text-emerald-600" />
                                                                <span>Paid • Cash Voucher</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                                                                <Smartphone className="w-3 h-3 text-indigo-600" />
                                                                <span>Paid • UPI Direct</span>
                                                            </span>
                                                        )}
                                                        {inv.paidOn && (
                                                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                                                                Paid on {inv.paidOn}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : isPartial ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-300">
                                                            <Clock className="w-3 h-3 text-amber-600" />
                                                            <span>Partially Paid</span>
                                                        </span>
                                                        <span className="text-[10px] text-amber-700 block font-mono font-semibold mt-0.5">
                                                            Paid ₹{(inv.paidAmount ?? 0).toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Due</span>
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                                                            Due: {inv.dueDate}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                {inv.status !== 'paid' ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                onRecordPayment(inv.id, 'UPI', undefined, undefined, remaining);
                                                            }}
                                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                                                            title="Pay full remaining balance via UPI"
                                                        >
                                                            <Smartphone className="w-3 h-3" />
                                                            <span>Pay UPI</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onRecordPayment(inv.id, 'Cash', undefined, undefined, remaining);
                                                            }}
                                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                                                            title="Pay full remaining balance in Cash"
                                                        >
                                                            <Banknote className="w-3 h-3" />
                                                            <span>Pay Cash</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedInvoiceForPayment(inv);
                                                                setPaymentAmount(remaining);
                                                            }}
                                                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                                                            title="Partial payment or other modes"
                                                        >
                                                            Custom...
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => alert(`Receipt downloaded for ${inv.invoiceNumber}`)}
                                                        className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-800 rounded transition-colors"
                                                        title="Download Receipt"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
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

            {/* Record Payment Modal */}
            {selectedInvoiceForPayment && (() => {
                const currentPaid = selectedInvoiceForPayment.paidAmount ?? 0;
                const remaining = Math.max(0, selectedInvoiceForPayment.amount - currentPaid);
                const payAmt = paymentAmount === '' ? remaining : Number(paymentAmount);
                const isOverpaying = payAmt > remaining;
                const isInvalid = payAmt <= 0 || isOverpaying;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091426]/50 backdrop-blur-xs">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-200 flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 font-display">
                                        Record Inward Rent Payment
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        {selectedInvoiceForPayment.tenantName} ({selectedInvoiceForPayment.roomNumber})
                                    </p>
                                </div>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                                    {selectedInvoiceForPayment.invoiceNumber}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                                <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Bill</span>
                                    <span className="font-mono font-bold text-slate-800">
                                        ₹{selectedInvoiceForPayment.amount.toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Paid So Far</span>
                                    <span className="font-mono font-bold text-emerald-700">
                                        ₹{currentPaid.toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Balance Due</span>
                                    <span className="font-mono font-bold text-amber-700">
                                        ₹{remaining.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="flex flex-col gap-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                    <label className="font-semibold text-slate-700">Payment Amount (₹)</label>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentAmount(remaining)}
                                        className="text-[10px] text-blue-600 font-semibold hover:underline"
                                    >
                                        Pay Full Balance (₹{remaining.toLocaleString('en-IN')})
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max={remaining}
                                    value={paymentAmount}
                                    onChange={e => {
                                        const v = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                                        setPaymentAmount(v);
                                    }}
                                    placeholder={`Enter amount up to ₹${remaining}`}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                {isOverpaying && (
                                    <span className="text-[11px] text-red-600 font-semibold">
                                        Payment cannot exceed outstanding balance of ₹{remaining.toLocaleString('en-IN')}.
                                    </span>
                                )}
                                {paymentAmount !== '' && payAmt > 0 && payAmt < remaining && (
                                    <span className="text-[11px] text-amber-700 font-medium">
                                        Partial payment: ₹{(remaining - payAmt).toLocaleString('en-IN')} will remain outstanding.
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2.5 text-xs">
                                <label className="font-semibold text-slate-700">Settlement Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* UPI Option */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPaymentMode('UPI')}
                                        className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${selectedPaymentMode === 'UPI'
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500'
                                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <Smartphone className="w-4 h-4 text-indigo-600" />
                                            <span>UPI Transfer</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">
                                            Instant VPA / QR settlement
                                        </span>
                                    </button>

                                    {/* Cash Option */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPaymentMode('Cash')}
                                        className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${selectedPaymentMode === 'Cash'
                                                ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600'
                                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <Banknote className="w-4 h-4 text-emerald-600" />
                                            <span>Desk Cash</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500">
                                            Physical receipt voucher
                                        </span>
                                    </button>

                                    {/* NEFT Option */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPaymentMode('NEFT')}
                                        className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${selectedPaymentMode === 'NEFT'
                                                ? 'bg-slate-900 border-slate-900 text-white'
                                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                            }`}
                                    >
                                        <span className="font-semibold text-xs">NEFT / RTGS</span>
                                        <span className="text-[10px] opacity-70">Direct Bank</span>
                                    </button>

                                    {/* Card Option */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPaymentMode('Credit Card')}
                                        className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${selectedPaymentMode === 'Credit Card'
                                                ? 'bg-slate-900 border-slate-900 text-white'
                                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                            }`}
                                    >
                                        <span className="font-semibold text-xs">Credit Card</span>
                                        <CreditCard className="w-3.5 h-3.5 opacity-70" />
                                    </button>
                                </div>

                                {/* Reference / UTR Number */}
                                <div className="flex flex-col gap-1 mt-1">
                                    <label className="text-xs font-semibold text-slate-700">Transaction Reference / UTR (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. UPI-984128, Cash Voucher #12"
                                        value={paymentReference}
                                        onChange={e => setPaymentReference(e.target.value)}
                                        className="h-8.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                 {paymentError && (
                                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                        {paymentError}
                                    </div>
                                )}

                                <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/70 text-[11px] text-amber-900 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                    <span>Authoritative transaction with idempotency protection atomically recorded.</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    disabled={isSubmittingPayment}
                                    onClick={() => {
                                        setSelectedInvoiceForPayment(null);
                                        setPaymentReference('');
                                        setPaymentAmount('');
                                        setPaymentError(null);
                                    }}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isInvalid || isSubmittingPayment}
                                    onClick={async () => {
                                        if (isInvalid || isSubmittingPayment) return;
                                        setIsSubmittingPayment(true);
                                        setPaymentError(null);
                                        try {
                                            await onRecordPayment(selectedInvoiceForPayment.id, selectedPaymentMode, paymentReference, undefined, payAmt);
                                            setSelectedInvoiceForPayment(null);
                                            setPaymentReference('');
                                            setPaymentAmount('');
                                        } catch (err: any) {
                                            setPaymentError(err?.message || 'Failed to record payment');
                                        } finally {
                                            setIsSubmittingPayment(false);
                                        }
                                    }}
                                    className={`px-5 py-2 text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50 ${selectedPaymentMode === 'Cash'
                                            ? 'bg-emerald-700 hover:bg-emerald-800'
                                            : 'bg-indigo-600 hover:bg-indigo-700'
                                        }`}
                                >
                                    {isSubmittingPayment ? 'Processing...' : `Confirm ₹${payAmt.toLocaleString('en-IN')} (${selectedPaymentMode})`}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Single Invoice Creation Modal */}
            {isSingleModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Create Single Invoice
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Bill an individual resident.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSingleModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 flex flex-col gap-4">
                            {singleFeedback && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>{singleFeedback}</span>
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Select Resident</label>
                                <select
                                    value={newInvoiceTenantUid}
                                    onChange={e => {
                                        const uid = e.target.value;
                                        setNewInvoiceTenantUid(uid);
                                        const t = tenants.find(item => item.id === uid);
                                        if (t && (t.monthlyRent || t.rentAmount)) {
                                            setNewInvoiceAmount(t.monthlyRent || t.rentAmount);
                                        }
                                    }}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">-- Choose Resident --</option>
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} (Room {t.roomNumber})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Billing Period (Month &amp; Year)</label>
                                <input
                                    type="text"
                                    value={newInvoiceMonthYear}
                                    onChange={e => setNewInvoiceMonthYear(e.target.value)}
                                    placeholder={`e.g. ${defaultCurrentMonthYear}`}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Invoice Amount (₹)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newInvoiceAmount}
                                    onChange={e => setNewInvoiceAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Amount in ₹"
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Payment Due Date</label>
                                <input
                                    type="date"
                                    value={newInvoiceDueDate}
                                    onChange={e => setNewInvoiceDueDate(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setIsSingleModalOpen(false)}
                                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isCreatingSingle || !newInvoiceTenantUid || !newInvoiceAmount || !newInvoiceMonthYear || !newInvoiceDueDate}
                                onClick={async () => {
                                    if (!onCreateInvoice || !newInvoiceTenantUid || !newInvoiceAmount) return;
                                    setIsCreatingSingle(true);
                                    try {
                                        await onCreateInvoice({
                                            tenantUid: newInvoiceTenantUid,
                                            monthYear: newInvoiceMonthYear.trim(),
                                            amount: Number(newInvoiceAmount),
                                            dueDate: newInvoiceDueDate.trim(),
                                        });
                                        setSingleFeedback('Invoice created successfully in PostgreSQL!');
                                        setTimeout(() => {
                                            setIsSingleModalOpen(false);
                                            setSingleFeedback(null);
                                        }, 1400);
                                    } catch (err: any) {
                                        alert(`Failed to create invoice: ${err.message || 'Check backend'}`);
                                    } finally {
                                        setIsCreatingSingle(false);
                                    }
                                }}
                                className="px-4 py-2 bg-[#091426] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                                <Plus className="w-4 h-4" />
                                <span>{isCreatingSingle ? 'Creating...' : 'Create Invoice'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cycle Invoicing Modal */}
            {isCycleModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                    <Receipt className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Generate Billing Cycle
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Batch auto-generate invoices for all active residents.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCycleModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form Body */}
                        <div className="p-5 flex flex-col gap-4">
                            {cycleFeedback && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>{cycleFeedback}</span>
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Billing Month &amp; Year</label>
                                <input
                                    type="text"
                                    value={cycleMonthYear}
                                    onChange={e => setCycleMonthYear(e.target.value)}
                                    placeholder={`e.g. ${defaultCurrentMonthYear}`}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Payment Due Date</label>
                                <input
                                    type="date"
                                    value={cycleDueDate}
                                    onChange={e => setCycleDueDate(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex flex-col gap-1">
                                <span className="font-semibold text-slate-800">What happens next:</span>
                                <span>• An invoice is generated for every active resident with their standard room tariff.</span>
                                <span>• Residents already billed for this month will be safely skipped.</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setIsCycleModalOpen(false)}
                                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                disabled={isGeneratingCycle || !cycleMonthYear.trim() || !cycleDueDate.trim()}
                                onClick={async () => {
                                    if (!onGenerateCycle) return;
                                    setIsGeneratingCycle(true);
                                    try {
                                        const res = await onGenerateCycle(cycleMonthYear.trim(), cycleDueDate.trim());
                                        setCycleFeedback(
                                            `Generated ${res?.generatedCount ?? 0} invoices (₹${(res?.totalAmount ?? 0).toLocaleString('en-IN')}). Skipped ${res?.skippedCount ?? 0} existing.`
                                        );
                                        setTimeout(() => {
                                            setIsCycleModalOpen(false);
                                        }, 1800);
                                    } catch (err: any) {
                                        alert(`Cycle generation failed: ${err.message || 'Check backend'}`);
                                    } finally {
                                        setIsGeneratingCycle(false);
                                    }
                                }}
                                className="px-4 py-2 bg-[#091426] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                                <Plus className="w-4 h-4" />
                                <span>{isGeneratingCycle ? 'Generating...' : 'Generate Cycle Invoices'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
