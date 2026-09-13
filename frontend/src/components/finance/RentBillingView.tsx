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
import { Invoice } from '../../types';

interface RentBillingViewProps {
    invoices: Invoice[];
    onRecordPayment: (invoiceId: string, paymentMode: string, transactionRef?: string) => Promise<void> | void;
    onGenerateCycle?: (monthYear: string, dueDate: string) => Promise<any>;
}

export const RentBillingView: React.FC<RentBillingViewProps> = ({
    invoices,
    onRecordPayment,
    onGenerateCycle,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'upi' | 'cash' | 'pending'>('all');
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
    const [selectedPaymentMode, setSelectedPaymentMode] = useState<'UPI' | 'Cash' | 'NEFT' | 'Credit Card'>('UPI');
    const [paymentReference, setPaymentReference] = useState('');

    // Cycle Generation Modal State
    const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
    const [cycleMonthYear, setCycleMonthYear] = useState('November 2024');
    const [cycleDueDate, setCycleDueDate] = useState('2024-11-05');
    const [isGeneratingCycle, setIsGeneratingCycle] = useState(false);
    const [cycleFeedback, setCycleFeedback] = useState<string | null>(null);

    const totalBilled = useMemo(() => invoices.reduce((acc, i) => acc + i.amount, 0), [invoices]);
    const paidInvoices = useMemo(() => invoices.filter(i => i.status === 'paid'), [invoices]);
    const totalCollected = useMemo(() => paidInvoices.reduce((acc, i) => acc + i.amount, 0), [paidInvoices]);
    const pendingCollection = totalBilled - totalCollected;

    const upiInvoices = useMemo(
        () => paidInvoices.filter(i => (i.paymentMode || 'UPI').toUpperCase().includes('UPI')),
        [paidInvoices]
    );
    const cashInvoices = useMemo(
        () => paidInvoices.filter(i => (i.paymentMode || '').toUpperCase().includes('CASH')),
        [paidInvoices]
    );
    const upiAmount = useMemo(() => upiInvoices.reduce((acc, i) => acc + i.amount, 0), [upiInvoices]);
    const cashAmount = useMemo(() => cashInvoices.reduce((acc, i) => acc + i.amount, 0), [cashInvoices]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch =
                inv.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter === 'all') return true;
            if (statusFilter === 'upi') {
                return inv.status === 'paid' && (inv.paymentMode || 'UPI').toUpperCase().includes('UPI');
            }
            if (statusFilter === 'cash') {
                return inv.status === 'paid' && (inv.paymentMode || '').toUpperCase().includes('CASH');
            }
            if (statusFilter === 'pending') {
                return inv.status === 'pending';
            }
            return true;
        });
    }, [invoices, searchQuery, statusFilter]);

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Action Bar */}
            <div className="flex items-center justify-end">
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
                        Total Billed (Oct 2024)
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#091426] font-display tabular-nums">
                            ₹{totalBilled.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Across 6 units billed</div>
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
                            <Smartphone className="w-3 h-3" /> ₹{upiAmount.toLocaleString('en-IN')} UPI ({upiInvoices.length})
                        </span>
                        <span>•</span>
                        <span className="text-emerald-800 font-semibold flex items-center gap-1">
                            <Banknote className="w-3 h-3" /> ₹{cashAmount.toLocaleString('en-IN')} Cash ({cashInvoices.length})
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
                        <span>Strict Due Date: 5th of Month • No Grace Time</span>
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
                            All Invoices ({invoices.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('upi')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${statusFilter === 'upi'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70'
                                }`}
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>UPI Paid ({upiInvoices.length})</span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('cash')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${statusFilter === 'cash'
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/70'
                                }`}
                        >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Cash Paid ({cashInvoices.length})</span>
                        </button>
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === 'pending'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/70'
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
                                    const isCash = (inv.paymentMode || '').toUpperCase().includes('CASH');

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
                                                ₹{inv.amount.toLocaleString('en-IN')}
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
                                                ) : (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                                            <Clock className="w-3 h-3" />
                                                            <span>Due (No Grace Time)</span>
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                                                            Strict Due: 05th
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                {inv.status === 'pending' ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => {
                                                                onRecordPayment(inv.id, 'UPI');
                                                            }}
                                                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                                                            title="Record payment received via UPI"
                                                        >
                                                            <Smartphone className="w-3 h-3" />
                                                            <span>Pay UPI</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                onRecordPayment(inv.id, 'Cash');
                                                            }}
                                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1"
                                                            title="Record cash received at desk"
                                                        >
                                                            <Banknote className="w-3 h-3" />
                                                            <span>Pay Cash</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedInvoiceForPayment(inv)}
                                                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                                                            title="More payment methods"
                                                        >
                                                            More...
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
            {selectedInvoiceForPayment && (
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

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                            <span className="text-slate-600">Total Invoice Amount:</span>
                            <span className="font-mono text-base font-bold text-slate-900">
                                ₹{selectedInvoiceForPayment.amount.toLocaleString('en-IN')}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2.5 text-xs">
                            <label className="font-semibold text-slate-700">Differentiate Settlement Mode</label>
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
                                        Physical receipt voucher issued
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
                            </div>

                            <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/70 text-[11px] text-amber-900 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>Notice: Payment will be atomically recorded in the double-entry financial ledger.</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedInvoiceForPayment(null);
                                    setPaymentReference('');
                                }}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await onRecordPayment(selectedInvoiceForPayment.id, selectedPaymentMode, paymentReference);
                                    setSelectedInvoiceForPayment(null);
                                    setPaymentReference('');
                                }}
                                className={`px-5 py-2 text-white rounded-lg text-xs font-bold shadow-xs transition-colors ${selectedPaymentMode === 'Cash'
                                        ? 'bg-emerald-700 hover:bg-emerald-800'
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                            >
                                Confirm {selectedPaymentMode} Payment
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
                                    placeholder="e.g. November 2024, December 2024"
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
