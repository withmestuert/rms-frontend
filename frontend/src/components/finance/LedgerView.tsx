import React, { useState } from 'react';
import {
    Wallet,
    ArrowDownLeft,
    ArrowUpRight,
    Filter,
    Search,
    Download,
    Calendar,
    Building,
} from 'lucide-react';
import { Transaction } from '../../types';

interface LedgerViewProps {
    transactions: Transaction[];
}

export const LedgerView: React.FC<LedgerViewProps> = ({ transactions }) => {
    const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch =
            t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.tenantOrVendor.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || t.type === filterType;
        return matchesSearch && matchesType;
    });

    const currentBalance = transactions[0]?.runningBalance ?? 0;

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Action Bar */}
            <div className="flex items-center justify-end">
                <div className="bg-white border border-slate-200/80 shadow-xs px-4 py-2 rounded-xl flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        Settled Bank Balance
                    </span>
                    <span className="font-mono text-xl font-bold text-slate-900 font-display">
                        ₹{currentBalance.toLocaleString('en-IN')}
                    </span>
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
        </div>
    );
};
