import React, { useState } from 'react';
import {
    X,
    Send,
    Copy,
    Check,
    ExternalLink,
    Receipt,
    CreditCard,
    DoorOpen,
    MessageCircle,
    Phone,
    ShieldCheck,
} from 'lucide-react';
import { WhatsAppPackage } from '../../types';

interface WhatsAppQuickShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    pkg: WhatsAppPackage | null;
}

export const WhatsAppQuickShareModal: React.FC<WhatsAppQuickShareModalProps> = ({
    isOpen,
    onClose,
    pkg,
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !pkg) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(pkg.message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenWhatsApp = () => {
        if (pkg.whatsappUrl) {
            window.open(pkg.whatsappUrl, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* WhatsApp-themed Header */}
                <div className="bg-[#075e54] text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                            <MessageCircle className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold tracking-tight">WhatsApp Business Quick Dispatch</h3>
                            <p className="text-[11px] text-emerald-100/80">
                                Welcome message & quick actions for {pkg.tenantName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-emerald-100/70 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-5 overflow-y-auto flex flex-col gap-4">
                    {/* Recipient Pill */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-semibold text-slate-700">Recipient Mobile:</span>
                            <span className="font-mono text-slate-900">+{pkg.phone}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                        </span>
                    </div>

                    {/* Chat Bubble Preview */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                            WhatsApp Message Preview (With Invoice Receipt):
                        </label>
                        <div className="p-4 bg-[#e5ddd5] rounded-xl border border-slate-300 shadow-inner max-h-56 overflow-y-auto">
                            <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-xs text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-200/60">
                                {pkg.message}
                            </div>
                        </div>
                    </div>

                    {/* Quick Action Buttons Preview */}
                    <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Embedded Quick Actions (Tappable by Tenant)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Pay Rent Link */}
                            <a
                                href={pkg.payRentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors shadow-2xs group"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <CreditCard className="w-3.5 h-3.5" />
                                    </div>
                                    <span>Pay Rent Link</span>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                            </a>

                            {/* Vacate Request Link */}
                            <a
                                href={pkg.vacateFormUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-semibold text-slate-800 transition-colors shadow-2xs group"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <DoorOpen className="w-3.5 h-3.5" />
                                    </div>
                                    <span>Vacate Request Form</span>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="h-9 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Copy Text</span>
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9 px-3 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                        >
                            Done
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenWhatsApp}
                            className="h-9 px-4 bg-[#25d366] hover:bg-[#20ba59] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send via WhatsApp</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
