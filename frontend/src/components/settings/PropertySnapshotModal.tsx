import React, { useState } from 'react';
import { FileText, Copy, Check, X, ShieldCheck, Calendar, Users, DoorOpen, IndianRupee } from 'lucide-react';
import { PropertyArchiveSnapshot } from '../../types';

interface PropertySnapshotModalProps {
    snapshot: PropertyArchiveSnapshot | null;
    isOpen: boolean;
    onClose: () => void;
}

export const PropertySnapshotModal: React.FC<PropertySnapshotModalProps> = ({
    snapshot,
    isOpen,
    onClose,
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !snapshot) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(snapshot.snapshotJson);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    let parsedData: any = null;
    try {
        parsedData = JSON.parse(snapshot.snapshotJson);
    } catch (e) {
        parsedData = null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-[#091426] p-5 text-white flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold font-display tracking-tight">
                                    Audit Manifest Snapshot
                                </h2>
                                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Frozen & Verified
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Permanent historical record of {snapshot.propertyName} ({snapshot.propertyCode || 'N/A'})
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-4 overflow-y-auto text-xs">
                    {/* Key Stats Freeze Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1">
                                <DoorOpen className="w-3 h-3 text-slate-500" /> Units
                            </span>
                            <span className="text-lg font-bold text-slate-900 mt-1 block">
                                {snapshot.totalRooms} Rooms
                            </span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1">
                                <Users className="w-3 h-3 text-slate-500" /> Residents
                            </span>
                            <span className="text-lg font-bold text-slate-900 mt-1 block">
                                {snapshot.totalResidents} Tenants
                            </span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1">
                                <IndianRupee className="w-3 h-3 text-slate-500" /> Monthly Run-Rate
                            </span>
                            <span className="text-lg font-bold text-slate-900 mt-1 block">
                                ₹{(snapshot.totalRevenuePotential || 0).toLocaleString('en-IN')}
                            </span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-slate-500" /> Advance Held
                            </span>
                            <span className="text-lg font-bold text-emerald-700 mt-1 block">
                                ₹{(snapshot.totalAdvanceHeld || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    {/* Meta audit tag */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex flex-col gap-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                            <span>Archived by: <strong className="text-slate-900">{snapshot.archivedBy}</strong></span>
                            <span className="flex items-center gap-1 text-slate-500">
                                <Calendar className="w-3.5 h-3.5" /> {new Date(snapshot.archivedAt).toLocaleString()}
                            </span>
                        </div>
                        {snapshot.deletionReason && (
                            <div>
                                Decommission reason: <em className="text-slate-800">"{snapshot.deletionReason}"</em>
                            </div>
                        )}
                    </div>

                    {/* JSON Document Viewer */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">Raw Audit Manifest (JSON)</span>
                            <button
                                onClick={handleCopy}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                            </button>
                        </div>
                        <pre className="p-3.5 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed border border-slate-800">
                            {parsedData ? JSON.stringify(parsedData, null, 2) : snapshot.snapshotJson}
                        </pre>
                    </div>

                    <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
