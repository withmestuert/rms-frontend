import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Clock, Lock, Archive, CheckCircle2, X } from 'lucide-react';
import { Property, PropertySoftDeleteRequest } from '../../types';

interface PropertySoftDeleteModalProps {
    property: Property;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (propertyId: number, data: PropertySoftDeleteRequest) => Promise<void>;
}

export const PropertySoftDeleteModal: React.FC<PropertySoftDeleteModalProps> = ({
    property,
    isOpen,
    onClose,
    onConfirm,
}) => {
    const [confirmationName, setConfirmationName] = useState('');
    const [reason, setReason] = useState('Administrative decommissioning / Facility restructuring');
    const [adminPin, setAdminPin] = useState('');
    const [ttlDays, setTtlDays] = useState(30);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const isNameMatched = confirmationName.trim().toLowerCase() === property.name.trim().toLowerCase();
    const isPinEntered = adminPin.trim().length > 0;
    const canSubmit = isNameMatched && isPinEntered && !isSubmitting;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!isNameMatched) {
            setErrorMsg(`Please type the exact property name: "${property.name}"`);
            return;
        }

        if (adminPin.trim() !== '9999') {
            setErrorMsg('Invalid Admin Security PIN. (Prototype default PIN: 9999)');
            return;
        }

        try {
            setIsSubmitting(true);
            await onConfirm(property.id, {
                confirmationName: confirmationName.trim(),
                adminPin: adminPin.trim(),
                reason: reason.trim(),
                ttlDays: ttlDays,
                deletedBy: 'ADMIN',
            });
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to decommission property. Check authorization.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-red-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-rose-700 p-5 text-white flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
                            <ShieldAlert className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold font-display tracking-tight">
                                Protected Property Decommission
                            </h2>
                            <p className="text-xs text-red-100 mt-0.5">
                                Source of Truth Protection & Audit Archive
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors p-1 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
                    {/* Security Notice */}
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-bold text-[13px] text-amber-950">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Property is the primary Source of Truth</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-900/90">
                            To protect financial and residency integrity, this property will <strong>NOT be hard-deleted</strong>. 
                            Instead, a permanent <strong>Audit Manifest Snapshot</strong> will be generated, and the property 
                            will enter a <strong>{ttlDays}-day TTL grace period</strong> during which it can be restored anytime.
                        </p>
                    </div>

                    {/* Property Summary Pill */}
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                Target Property
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                                {property.name}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                Code / Units
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-700">
                                {property.code} • {property.totalRooms || 0} Rooms
                            </span>
                        </div>
                    </div>

                    {/* Step 1: Confirmation Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-slate-800 flex items-center justify-between">
                            <span>Step 1: Retype Property Name to Confirm *</span>
                            {isNameMatched && (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                                </span>
                            )}
                        </label>
                        <input
                            type="text"
                            value={confirmationName}
                            onChange={e => setConfirmationName(e.target.value)}
                            placeholder={property.name}
                            className={`h-9 px-3 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none transition-colors ${
                                isNameMatched
                                    ? 'border-emerald-400 ring-2 ring-emerald-100'
                                    : 'border-slate-200'
                            }`}
                        />
                        <span className="text-[10px] text-slate-500 italic">
                            Please type "{property.name}" exactly as shown.
                        </span>
                    </div>

                    {/* Step 2: Reason for Decommission */}
                    <div className="flex flex-col gap-1.5">
                        <label className="font-bold text-slate-800">
                            Step 2: Reason for Decommissioning *
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Lease expired, building maintenance, branch closed"
                            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                            required
                        />
                    </div>

                    {/* Step 3: Admin Authorization PIN & TTL */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                                <span>Admin Security PIN *</span>
                            </label>
                            <input
                                type="password"
                                maxLength={6}
                                value={adminPin}
                                onChange={e => setAdminPin(e.target.value)}
                                placeholder="Default: 9999"
                                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-mono tracking-widest text-center"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                <span>TTL Grace Period</span>
                            </label>
                            <div className="h-9 px-3 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between text-slate-700 font-semibold">
                                <span>30 Days</span>
                                <span className="text-[10px] text-slate-500 font-normal">Restorable</span>
                            </div>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11px] font-medium">
                            {errorMsg}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-xs"
                        >
                            <Archive className="w-4 h-4" />
                            <span>
                                {isSubmitting ? 'Archiving & Freezing...' : 'Decommission & Archive Property'}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
