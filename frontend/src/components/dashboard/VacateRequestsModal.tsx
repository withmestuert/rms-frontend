import React, { useState } from 'react';
import {
    X,
    Calendar,
    DoorOpen,
    CheckCircle2,
    AlertCircle,
    User,
    Phone,
    DollarSign,
    Edit3,
    Check,
    Save,
    Trash2,
    Clock,
    ShieldAlert,
} from 'lucide-react';
import { VacateRequest } from '../../types';
import { apiService } from '../../services/apiService';

interface VacateRequestsModalProps {
    isOpen: boolean;
    onClose: () => void;
    requests: VacateRequest[];
    onRefresh: () => Promise<void>;
}

export const VacateRequestsModal: React.FC<VacateRequestsModalProps> = ({
    isOpen,
    onClose,
    requests,
    onRefresh,
}) => {
    const [selectedRequest, setSelectedRequest] = useState<VacateRequest | null>(
        requests[0] || null
    );
    const [isEditingCharges, setIsEditingCharges] = useState(false);
    const [maintenanceInput, setMaintenanceInput] = useState<number>(0);
    const [breakageInput, setBreakageInput] = useState<number>(0);
    const [notesInput, setNotesInput] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const currentReq = selectedRequest || requests[0];

    const handleSelectReq = (req: VacateRequest) => {
        setSelectedRequest(req);
        setIsEditingCharges(false);
        setMaintenanceInput(req.maintenanceCharge || 0);
        setBreakageInput(req.breakageCharge || 0);
        setNotesInput(req.notes || '');
        setActionMessage(null);
    };

    const handleSaveCharges = async () => {
        if (!currentReq) return;
        setIsSubmitting(true);
        try {
            const updated = await apiService.updateVacateCharges(
                currentReq.id,
                maintenanceInput,
                breakageInput,
                notesInput
            );
            setSelectedRequest(updated);
            setIsEditingCharges(false);
            setActionMessage('Charges updated and refund recalculated!');
            await onRefresh();
        } catch (err: any) {
            alert('Failed to update charges: ' + (err?.message || 'Error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async (id: number) => {
        if (!confirm('Approve this vacate notice? This will mark the room with a Vacate Notice and make it open for incoming reservation.')) {
            return;
        }
        setIsSubmitting(true);
        try {
            const updated = await apiService.approveVacateRequest(id);
            setSelectedRequest(updated);
            setActionMessage('Notice approved! Room status updated to "Vacate Notice".');
            await onRefresh();
        } catch (err: any) {
            alert('Failed to approve request: ' + (err?.message || 'Error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleComplete = async (id: number) => {
        if (!confirm('Complete move-out and final settlement? This will vacate the tenant and free the room bed.')) {
            return;
        }
        setIsSubmitting(true);
        try {
            const updated = await apiService.completeVacateRequest(id);
            setSelectedRequest(updated);
            setActionMessage('Move-out completed! Room occupancy freed and tenant status marked inactive.');
            await onRefresh();
        } catch (err: any) {
            alert('Failed to complete vacate: ' + (err?.message || 'Error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold">
                            <DoorOpen className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-[#091426]">
                                Tenant Vacate Requests Desk
                            </h2>
                            <p className="text-xs text-slate-500">
                                Review move-out notices from external forms & WhatsApp, inspect deductions, and schedule departures.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-0">
                    {/* Left: Request List (4 cols) */}
                    <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/40 p-3 overflow-y-auto flex flex-col gap-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1">
                            Pending & Active Notices ({requests.length})
                        </div>

                        {requests.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                                No active vacate requests recorded.
                            </div>
                        ) : (
                            requests.map(req => {
                                const isSelected = currentReq?.id === req.id;
                                const isPending = req.status === 'PENDING';
                                const isApproved = req.status === 'APPROVED';

                                return (
                                    <div
                                        key={req.id}
                                        onClick={() => handleSelectReq(req)}
                                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-white border-[#091426] shadow-sm ring-1 ring-[#091426]'
                                                : 'bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono text-[10px] font-bold text-slate-400">
                                                {req.requestId}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                    isPending
                                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                                        : isApproved
                                                        ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                                        : 'bg-emerald-100 text-emerald-900'
                                                }`}
                                            >
                                                {req.status}
                                            </span>
                                        </div>
                                        <div className="text-xs font-bold text-slate-900 truncate">
                                            {req.tenantName}
                                        </div>
                                        <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                                            <span>Room {req.roomNo}</span>
                                            <span className="font-semibold text-slate-700">
                                                Leaves {req.expectedLeavingDate}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Right: Selected Request Details & Actions (8 cols) */}
                    <div className="md:col-span-8 p-6 flex flex-col gap-5 overflow-y-auto">
                        {currentReq ? (
                            <>
                                {/* Banner message */}
                                {actionMessage && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>{actionMessage}</span>
                                    </div>
                                )}

                                {/* Top Overview Card */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                                            {currentReq.tenantName.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                {currentReq.tenantName}
                                            </h3>
                                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                <span>TID: <strong>{currentReq.tenantUid || 'N/A'}</strong></span>
                                                <span>&bull;</span>
                                                <span>Room <strong>{currentReq.roomNo}</strong></span>
                                                <span>&bull;</span>
                                                <span>+{currentReq.mobileNumber}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                                            {currentReq.requestId}
                                        </span>
                                    </div>
                                </div>

                                {/* Schedule & Notice Breakdown Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Notice Received
                                        </span>
                                        <span className="text-xs font-bold text-slate-900">
                                            {currentReq.requestDate}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Expected Move-out
                                        </span>
                                        <span className="text-xs font-bold text-slate-900">
                                            {currentReq.expectedLeavingDate}
                                        </span>
                                    </div>

                                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Notice Period
                                        </span>
                                        <span className={`text-xs font-bold ${
                                            currentReq.noticeDays >= 30 ? 'text-emerald-700' : 'text-amber-700'
                                        }`}>
                                            {currentReq.noticeDays} Days {currentReq.noticeDays >= 30 ? '(Full Notice)' : '(< 30 Days)'}
                                        </span>
                                    </div>
                                </div>

                                {/* Advance Refund Calculation & Inspection Box */}
                                <div className="p-4 bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200/80 rounded-xl flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                            <DollarSign className="w-4 h-4 text-emerald-600" />
                                            <span>Advance Repayable Calculation Breakdown</span>
                                        </div>

                                        {!isEditingCharges && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsEditingCharges(true);
                                                    setMaintenanceInput(currentReq.maintenanceCharge || 0);
                                                    setBreakageInput(currentReq.breakageCharge || 0);
                                                    setNotesInput(currentReq.notes || '');
                                                }}
                                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                <span>Adjust Deductions</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Breakdown table */}
                                    <div className="text-xs flex flex-col gap-2 bg-white p-3 rounded-lg border border-slate-200">
                                        <div className="flex items-center justify-between text-slate-600">
                                            <span>Advance Deposit Paid:</span>
                                            <strong className="text-slate-900">₹{currentReq.advancePaid.toLocaleString('en-IN')}</strong>
                                        </div>

                                        <div className="flex items-center justify-between text-slate-600">
                                            <span>Notice Calculation Policy:</span>
                                            <span className="font-mono text-[11px]">
                                                {currentReq.noticeDays >= 30
                                                    ? 'Full 100% Repayable (≥ 30 days)'
                                                    : `(₹${currentReq.advancePaid} / 30) × ${currentReq.noticeDays} days`}
                                            </span>
                                        </div>

                                        {isEditingCharges ? (
                                            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg flex flex-col gap-2 mt-1">
                                                <div className="text-[11px] font-bold text-amber-900">
                                                    Room Handover Inspection Deductions:
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-slate-600">Maintenance (₹)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={maintenanceInput}
                                                            onChange={e => setMaintenanceInput(Number(e.target.value))}
                                                            className="w-full h-8 px-2 text-xs border rounded bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-slate-600">Breakage Damage (₹)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={breakageInput}
                                                            onChange={e => setBreakageInput(Number(e.target.value))}
                                                            className="w-full h-8 px-2 text-xs border rounded bg-white"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-semibold text-slate-600">Inspection Notes</label>
                                                    <input
                                                        type="text"
                                                        value={notesInput}
                                                        onChange={e => setNotesInput(e.target.value)}
                                                        placeholder="e.g. Wall paint peeling, key lost..."
                                                        className="w-full h-8 px-2 text-xs border rounded bg-white"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2 mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditingCharges(false)}
                                                        className="px-2.5 py-1 text-xs text-slate-600 bg-white border rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveCharges}
                                                        className="px-3 py-1 text-xs font-bold text-white bg-[#091426] rounded flex items-center gap-1"
                                                    >
                                                        <Save className="w-3 h-3" />
                                                        <span>Save & Recalculate</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between text-slate-600">
                                                    <span>Maintenance Deduction:</span>
                                                    <span className="text-rose-600">- ₹{(currentReq.maintenanceCharge || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-slate-600">
                                                    <span>Breakage / Damage Deduction:</span>
                                                    <span className="text-rose-600">- ₹{(currentReq.breakageCharge || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                            </>
                                        )}

                                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm">
                                            <span className="text-slate-900">Final Advance Repayable:</span>
                                            <span className="text-emerald-700 text-base">
                                                ₹{currentReq.advanceRepayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Reason & Notes */}
                                {currentReq.reason && (
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                                        <span className="font-semibold text-slate-800">Departure Reason:</span> {currentReq.reason}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                                    {currentReq.status === 'PENDING' && (
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => handleApprove(currentReq.id)}
                                            className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Approve Vacate Notice (Sync Room)</span>
                                        </button>
                                    )}

                                    {currentReq.status === 'APPROVED' && (
                                        <button
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => handleComplete(currentReq.id)}
                                            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Complete Checkout & Settlement</span>
                                        </button>
                                    )}

                                    {currentReq.status === 'COMPLETED' && (
                                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Vacate & Refund Settled
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="py-16 text-center text-xs text-slate-400">
                                Select a vacate request to review details.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
