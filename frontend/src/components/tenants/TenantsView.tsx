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
    Trash2,
    Edit2,
} from 'lucide-react';
import { Tenant, PageId } from '../../types';
import { formatAadharDisplay } from '../../utils/formatters';

interface TenantsViewProps {
    tenants: Tenant[];
    onAddTenant: (tenant: Omit<Tenant, 'id'>) => void;
    onUpdateTenant?: (uid: string, tenant: Partial<Tenant>) => Promise<Tenant>;
    onDeleteTenant?: (uid: string) => Promise<void>;
    onVerifyAdvance?: (uid: string, amount?: number) => Promise<void>;
    onNavigate: (page: PageId) => void;
    onViewPaymentHistory?: (tenant: Tenant) => void;
}

export const TenantsView: React.FC<TenantsViewProps> = ({
    tenants,
    onUpdateTenant,
    onDeleteTenant,
    onVerifyAdvance,
    onNavigate,
    onViewPaymentHistory,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || 'ten-1');

    // Advance verification modal state
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
    const [verifyAmount, setVerifyAmount] = useState<number>(8000);
    const [verifyPaymentMode, setVerifyPaymentMode] = useState<string>('UPI');
    const [verifyReference, setVerifyReference] = useState<string>('');
    const [isVerifying, setIsVerifying] = useState<boolean>(false);

    // Edit tenant modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editRoom, setEditRoom] = useState('');
    const [editCategory, setEditCategory] = useState<'working' | 'student'>('working');
    const [editProfession, setEditProfession] = useState('');
    const [editRent, setEditRent] = useState<number>(8000);
    const [isUpdatingTenant, setIsUpdatingTenant] = useState(false);

    const selectedTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];

    const openEditModal = (t: Tenant) => {
        setEditName(t.name);
        setEditPhone(t.phone);
        setEditRoom(t.roomNumber);
        setEditCategory(t.category === 'student' ? 'student' : 'working');
        setEditProfession(t.profession || 'Working');
        setEditRent(t.monthlyRent || 8000);
        setIsEditModalOpen(true);
    };

    const handleSaveEditTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTenant || !onUpdateTenant) return;
        setIsUpdatingTenant(true);
        try {
            await onUpdateTenant(selectedTenant.id, {
                name: editName.trim(),
                phone: editPhone.trim(),
                roomNumber: editRoom.trim(),
                category: editCategory,
                profession: editProfession.trim(),
                monthlyRent: Number(editRent),
            });
            setIsEditModalOpen(false);
        } catch (err: any) {
            console.error('Failed to update tenant:', err);
            alert(`Failed to update tenant: ${err.message || 'Check backend logs'}`);
        } finally {
            setIsUpdatingTenant(false);
        }
    };

    const openVerifyModal = (tenant: Tenant) => {
        setVerifyAmount(tenant.monthlyRent || 8000);
        setVerifyPaymentMode('UPI');
        setVerifyReference('');
        setIsVerifyModalOpen(true);
    };

    const handleConfirmVerifyAdvance = async () => {
        if (!selectedTenant || !onVerifyAdvance) return;
        setIsVerifying(true);
        try {
            await onVerifyAdvance(selectedTenant.id, verifyAmount);
            setIsVerifyModalOpen(false);
        } catch (err) {
            console.error('Failed to verify advance payment:', err);
            alert('Failed to verify advance payment. Please check backend.');
        } finally {
            setIsVerifying(false);
        }
    };

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

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative min-w-[260px] flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by Name or Room number..."
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

                        {/* Advance Payment Status */}
                        {selectedTenant.paymentStatus === 'verified' ? (
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900 font-medium">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Advance: <strong>Verified</strong> — Payment confirmed</span>
                            </div>
                        ) : (
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-xs text-amber-900 font-medium">
                                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>Advance: <strong>Pending Verification</strong></span>
                                </div>
                                {onVerifyAdvance && (
                                    <button
                                        type="button"
                                        onClick={() => openVerifyModal(selectedTenant)}
                                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                                    >
                                        <ShieldCheck className="w-4 h-4" />
                                        <span>Verify Advance Payment</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        {onViewPaymentHistory && (
                            <button
                                onClick={() => onViewPaymentHistory(selectedTenant)}
                                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>Payment History</span>
                            </button>
                        )}

                        {/* Contact Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                            <a
                                href={`tel:${selectedTenant.phone}`}
                                className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Call</span>
                            </a>
                            <a
                                href={`https://wa.me/${selectedTenant.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="py-2 px-3 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                            </a>
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => openEditModal(selectedTenant)}
                                className="py-2 px-3 border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit Details</span>
                            </button>
                            {onDeleteTenant && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (window.confirm(`Are you sure you want to delete ${selectedTenant.name}? This will remove their record from the system.`)) {
                                            await onDeleteTenant(selectedTenant.id);
                                        }
                                    }}
                                    className="py-2 px-3 border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

            {/* Advance Payment Verification Modal */}
            {isVerifyModalOpen && selectedTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    {/* Modal Header */}
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Verify Advance Payment</h3>
                                <p className="text-xs text-slate-500">{selectedTenant.name} &bull; Room {selectedTenant.roomNumber}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsVerifyModalOpen(false)}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-5 flex flex-col gap-4">
                        <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 leading-relaxed">
                            Verifying the advance payment marks this tenant as a confirmed resident and updates their backend financial status to verified.
                        </div>

                        {/* Advance Amount Input */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700">Advance Amount Received (₹)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={verifyAmount}
                                    onChange={e => setVerifyAmount(Number(e.target.value))}
                                    className="w-full h-9 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        {/* Payment Mode Selector */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">Payment Mode</label>
                            <div className="grid grid-cols-4 gap-2">
                                {['UPI', 'Cash', 'Bank Transfer', 'Card'].map(mode => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setVerifyPaymentMode(mode)}
                                        className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border transition-all ${verifyPaymentMode === mode
                                                ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xs'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reference Number Input */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700">Transaction Ref / UTR / Receipt No. (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. UPI-998231, Receipt #104"
                                value={verifyReference}
                                onChange={e => setVerifyReference(e.target.value)}
                                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                        <button
                            type="button"
                            onClick={() => setIsVerifyModalOpen(false)}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isVerifying}
                            onClick={handleConfirmVerifyAdvance}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isVerifying ? 'Verifying...' : 'Confirm Payment & Verify'}</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

            {/* Edit Tenant Modal */}
            {isEditModalOpen && selectedTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                            <Edit2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Edit Tenant Details</h3>
                            <p className="text-xs text-slate-500">ID: {selectedTenant.id} &bull; Room {selectedTenant.roomNumber}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsEditModalOpen(false)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSaveEditTenant} className="p-5 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700">Tenant Full Name *</label>
                            <input
                                type="text"
                                required
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
                            <input
                                type="tel"
                                required
                                value={editPhone}
                                onChange={e => setEditPhone(e.target.value)}
                                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700">Room Number *</label>
                            <input
                                type="text"
                                required
                                value={editRoom}
                                onChange={e => setEditRoom(e.target.value)}
                                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700">Monthly Rent (₹) *</label>
                            <input
                                type="number"
                                min="0"
                                required
                                value={editRent}
                                onChange={e => setEditRent(Number(e.target.value))}
                                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700">Category</label>
                            <select
                                value={editCategory}
                                onChange={e => setEditCategory(e.target.value as 'working' | 'student')}
                                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="working">Working Professional</option>
                                <option value="student">Student</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-700">Profession / Organization</label>
                            <input
                                type="text"
                                value={editProfession}
                                onChange={e => setEditProfession(e.target.value)}
                                placeholder="Company / University"
                                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="p-5 -mx-5 -mb-5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isUpdatingTenant}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isUpdatingTenant ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )}
</div>
    );
};
