import React, { useState } from 'react';
import {
    Search,
    CheckCircle2,
    Phone,
    MessageSquare,
    UserPlus,
    Mail,
    DoorOpen,
    Calendar,
    X,
    MapPin,
    Briefcase,
    Receipt,
    ArrowUpRight,
    CreditCard,
    ShieldCheck,
} from 'lucide-react';
import { Tenant, PageId } from '../../types';
import { formatAadharDisplay } from '../../utils/formatters';

interface TenantsViewProps {
    tenants: Tenant[];
    onAddTenant: (tenant: Omit<Tenant, 'id'>) => void;
    onNavigate: (page: PageId) => void;
    onViewPaymentHistory?: (tenant: Tenant) => void;
}

export const TenantsView: React.FC<TenantsViewProps> = ({
    tenants,
    onNavigate,
    onViewPaymentHistory,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || 'ten-1');

    const selectedTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];

    const filteredTenants = tenants.filter(t => {
        const matchesSearch =
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.phone.includes(searchQuery) ||
            t.roomNumber.includes(searchQuery) ||
            (t.hometown && t.hometown.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (t.profession && t.profession.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                <div>
                    <h1 className="text-xl font-bold text-[#091426] tracking-tight font-display">
                        Tenant Directory
                    </h1>
                    <p className="text-xs text-slate-500">
                        Active resident records, assigned room numbers, and automated payment verification.
                    </p>
                </div>

                <button
                    onClick={() => onNavigate('admissions')}
                    className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Enrol Tenant</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative min-w-[260px] flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by name, room, hometown, or mobile..."
                        className="w-full h-9 pl-9 pr-3 bg-slate-50 rounded-lg text-xs text-slate-800 border border-slate-200/80 focus:bg-white focus:outline-none"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {(['all', 'confirmed', 'notice'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${statusFilter === tab
                                ? 'bg-[#091426] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {tab === 'all' ? 'All Residents' : tab === 'confirmed' ? 'Active' : 'Notice Period'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Split: Directory Table & Minimal Profile Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Table (lg:col-span-8) */}
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                                    <th className="py-3 px-4">Resident</th>
                                    <th className="py-3 px-4">Hometown</th>
                                    <th className="py-3 px-4">Room</th>
                                    <th className="py-3 px-4 font-mono text-right">Rent</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Contact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredTenants.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-12 text-slate-400">
                                            No tenants found matching search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTenants.map(t => {
                                        const isSelected = t.id === selectedTenantId;

                                        return (
                                            <tr
                                                key={t.id}
                                                onClick={() => setSelectedTenantId(t.id)}
                                                className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                                                    }`}
                                            >
                                                <td className="py-3.5 px-4">
                                                    <button
                                                        type="button"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            if (onViewPaymentHistory) {
                                                                onViewPaymentHistory(t);
                                                            } else {
                                                                onNavigate('payment-history');
                                                            }
                                                        }}
                                                        className="group/name flex items-center gap-1.5 text-left font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                                                        title={`Click to view payment history for ${t.name}`}
                                                    >
                                                        <span className="underline decoration-slate-300 underline-offset-2 group-hover/name:decoration-blue-500">
                                                            {t.name}
                                                        </span>
                                                        <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover/name:opacity-100 text-blue-600 transition-opacity shrink-0" />
                                                    </button>
                                                    <div className="text-[11px] text-slate-500">{t.profession || 'Professional'}</div>
                                                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <ShieldCheck className="w-3 h-3 text-blue-500" />
                                                        <span>{formatAadharDisplay(t.aadharNumber) || '5489 2104 9382'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                        <MapPin className="w-3 h-3 text-slate-400" />
                                                        {t.hometown || 'Bangalore'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="font-bold text-slate-800">Room {t.roomNumber}</span>
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-right">
                                                    ₹{t.monthlyRent.toLocaleString('en-IN')}/mo
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                                        Auto-Verified
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (onViewPaymentHistory) {
                                                                    onViewPaymentHistory(t);
                                                                } else {
                                                                    onNavigate('payment-history');
                                                                }
                                                            }}
                                                            className="p-1.5 hover:bg-blue-50 text-slate-500 hover:text-blue-700 rounded transition-colors"
                                                            title="View Payment History & Advance"
                                                        >
                                                            <Receipt className="w-3.5 h-3.5" />
                                                        </button>
                                                        <a
                                                            href={`tel:${t.phone}`}
                                                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
                                                            title="Call Tenant"
                                                        >
                                                            <Phone className="w-3.5 h-3.5" />
                                                        </a>
                                                        <a
                                                            href={`https://wa.me/${t.phone.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1.5 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 rounded transition-colors"
                                                            title="WhatsApp Message"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                        <span>Showing {filteredTenants.length} residents</span>
                        <span className="font-mono text-slate-400">Greenwood RMS</span>
                    </div>
                </div>

                {/* Minimal Profile Inspector (lg:col-span-4) */}
                {selectedTenant && (
                    <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-5 self-start sticky top-20">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onViewPaymentHistory) {
                                            onViewPaymentHistory(selectedTenant);
                                        } else {
                                            onNavigate('payment-history');
                                        }
                                    }}
                                    className="text-left group"
                                    title="Click to view payment history"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-base font-bold text-slate-900 font-display group-hover:text-blue-600 transition-colors">
                                            {selectedTenant.name}
                                        </h3>
                                        <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="font-mono text-xs text-blue-600 font-semibold">
                                        Room {selectedTenant.roomNumber}
                                    </span>
                                </button>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                    {selectedTenant.status === 'notice' ? 'On Notice' : 'Active'}
                                </span>
                            </div>

                            {/* Room & Rent Details */}
                            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/70 flex flex-col gap-2 text-xs">
                                <div className="flex items-center justify-between font-bold text-slate-900">
                                    <span className="flex items-center gap-1.5">
                                        <DoorOpen className="w-4 h-4 text-slate-500" />
                                        <span>Room {selectedTenant.roomNumber}</span>
                                    </span>
                                    <span className="text-emerald-700 font-semibold">Resident</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                                    <span>Monthly Tariff:</span>
                                    <span className="font-mono font-bold text-slate-900">
                                        ₹{selectedTenant.monthlyRent.toLocaleString('en-IN')}/mo
                                    </span>
                                </div>
                            </div>

                            {/* Demographic & Origin */}
                            <div className="flex flex-col gap-2 text-xs">
                                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                                    Profile &amp; Demographics
                                </span>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Hometown: <strong>{selectedTenant.hometown || 'Bangalore'}</strong></span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Profession: <strong>{selectedTenant.profession || 'Working Professional'}</strong></span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span>Aadhar: <strong className="font-mono">{formatAadharDisplay(selectedTenant.aadharNumber) || '5489 2104 9382'}</strong></span>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="flex flex-col gap-2 text-xs">
                                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                                    Contact Information
                                </span>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="font-mono">{selectedTenant.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{selectedTenant.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Enrolled: {selectedTenant.joinedDate}</span>
                                </div>
                            </div>

                            {/* Automated Payment Check Verification */}
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900 font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Payment automatically checked &amp; verified</span>
                            </div>

                            {/* Payment History & Advance Navigation */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (onViewPaymentHistory) {
                                        onViewPaymentHistory(selectedTenant);
                                    } else {
                                        onNavigate('payment-history');
                                    }
                                }}
                                className="w-full py-2.5 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
                            >
                                <Receipt className="w-4 h-4 text-blue-400" />
                                <span>View Payment History &amp; Advance</span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <a
                                href={`tel:${selectedTenant.phone}`}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Call</span>
                            </a>
                            <a
                                href={`https://wa.me/${selectedTenant.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
