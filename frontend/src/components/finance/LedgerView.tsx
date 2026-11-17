import React, { useState } from 'react';
import {
    Wallet,
    Search,
    Plus,
    X,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { Transaction } from '../../types';

interface LedgerViewProps {
    transactions: Transaction[];
    onRecordTransaction?: (dto: {
        type: 'credit' | 'debit';
        accountHead: string;
        description: string;
        tenantOrVendor: string;
        amount: number;
        paymentMode: string;
        date?: string;
    }) => Promise<void>;
}

export const LedgerView: React.FC<LedgerViewProps> = ({ transactions, onRecordTransaction }) => {
    const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state for recording transactions / expenses
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [entryType, setEntryType] = useState<'debit' | 'credit'>('debit');
    const [accountHead, setAccountHead] = useState('Maintenance & Repairs');
    const [description, setDescription] = useState('');
    const [partyName, setPartyName] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [paymentMode, setPaymentMode] = useState('UPI');
    const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch =
            (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.tenantOrVendor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.accountHead || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || t.type === filterType;
        return matchesSearch && matchesType;
    });

    const currentBalance = transactions[0]?.runningBalance ?? 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onRecordTransaction) return;
        if (!description.trim() || !partyName.trim() || !amount || Number(amount) <= 0) {
            setSubmitError('Please fill out all required fields with a valid amount.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        try {
            await onRecordTransaction({
                type: entryType,
                accountHead: accountHead.trim(),
                description: description.trim(),
                tenantOrVendor: partyName.trim(),
                amount: Number(amount),
                paymentMode,
                date: entryDate,
            });
            setIsModalOpen(false);
            setDescription('');
            setPartyName('');
            setAmount('');
        } catch (err: any) {
            setSubmitError(err?.message || 'Failed to record transaction in database.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-base font-bold text-slate-900">Financial Ledger &amp; Cash Flow</h1>
                    <p className="text-xs text-slate-500">Live PostgreSQL double-entry audit trail</p>
                </div>
                <div className="flex items-center gap-3">
                    {onRecordTransaction && (
                        <button
                            onClick={() => {
                                setSubmitError(null);
                                setIsModalOpen(true);
                            }}
                            className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Record Entry / Expense</span>
                        </button>
                    )}
                    <div className="bg-white border border-slate-200/80 shadow-xs px-4 py-1.5 rounded-xl flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            Settled Bank Balance
                        </span>
                        <span className="font-mono text-lg font-bold text-slate-900 font-display">
                            ₹{currentBalance.toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter and Ledger Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="relative max-w-sm flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search reference #, description, resident..."
                            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {(['all', 'credit', 'debit'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filterType === type
                                        ? 'bg-[#091426] text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {type === 'all' ? 'All Journal Entries' : type === 'credit' ? 'Inward Credits' : 'Outward Debits'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                                <th className="py-3 px-4">Date &amp; Ref #</th>
                                <th className="py-3 px-4">Account Head</th>
                                <th className="py-3 px-4">Transaction Details</th>
                                <th className="py-3 px-4">Settlement Mode</th>
                                <th className="py-3 px-4 font-mono text-right">Debit (-)</th>
                                <th className="py-3 px-4 font-mono text-right">Credit (+)</th>
                                <th className="py-3 px-4 font-mono text-right">Running Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        <Wallet className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm font-semibold text-slate-600">No journal transactions recorded</p>
                                        <p className="text-xs text-slate-400 mt-1">Inward rent payments and ledger entries for this property will appear here.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="font-semibold text-slate-900">{tx.date}</div>
                                            <div className="font-mono text-[10px] text-slate-400">{tx.referenceNumber}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                {tx.accountHead}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-medium text-slate-900">{tx.description}</div>
                                            <div className="text-[11px] text-slate-500">{tx.tenantOrVendor}</div>
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                                            {tx.paymentMode}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-right text-red-600 font-semibold">
                                            {tx.type === 'debit' ? `₹${tx.amount.toLocaleString('en-IN')}` : '—'}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-right text-emerald-700 font-bold">
                                            {tx.type === 'credit' ? `₹${tx.amount.toLocaleString('en-IN')}` : '—'}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono text-right font-bold text-slate-900">
                                            ₹{tx.runningBalance.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Transaction Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                            <h3 className="text-sm font-bold text-slate-900">Record Real Ledger Transaction</h3>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 hover:bg-slate-200/60 rounded text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                            {submitError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                                    {submitError}
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Transaction Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEntryType('debit')}
                                        className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            entryType === 'debit'
                                                ? 'bg-rose-50 border-rose-500 text-rose-800 ring-1 ring-rose-500'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Expense (Debit)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEntryType('credit')}
                                        className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                            entryType === 'credit'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Income (Credit)</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Account Head</label>
                                <select
                                    value={accountHead}
                                    onChange={e => setAccountHead(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                                >
                                    {entryType === 'debit' ? (
                                        <>
                                            <option value="Maintenance & Repairs">Maintenance &amp; Repairs</option>
                                            <option value="Electricity Bill">Electricity Bill</option>
                                            <option value="Water Utility">Water Utility</option>
                                            <option value="Internet / WiFi">Internet / WiFi</option>
                                            <option value="Housekeeping Supplies">Housekeeping Supplies</option>
                                            <option value="Security Services">Security Services</option>
                                            <option value="Vendor Payout">Vendor Payout</option>
                                            <option value="Miscellaneous Expense">Miscellaneous Expense</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="Rent Payment">Rent Payment</option>
                                            <option value="Security Deposit">Security Deposit</option>
                                            <option value="Amenity Charge">Amenity Charge</option>
                                            <option value="Other Income">Other Income</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Description</label>
                                <input
                                    type="text"
                                    required
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder={entryType === 'debit' ? 'e.g. Electrical wiring replacement in Floor 2' : 'e.g. Parking space reservation fee'}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">
                                    {entryType === 'debit' ? 'Vendor / Payee' : 'Tenant / Payer'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={partyName}
                                    onChange={e => setPartyName(e.target.value)}
                                    placeholder={entryType === 'debit' ? 'e.g. BESCOM / Apex Hardware' : 'e.g. Rahul Sharma'}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Amount (₹)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={amount}
                                        onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder="0"
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Payment Mode</label>
                                    <select
                                        value={paymentMode}
                                        onChange={e => setPaymentMode(e.target.value)}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                                    >
                                        <option value="UPI">UPI</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Cheque">Cheque</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={entryDate}
                                    onChange={e => setEntryDate(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-[#091426] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                                >
                                    {isSubmitting ? 'Recording...' : 'Save to PostgreSQL'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
