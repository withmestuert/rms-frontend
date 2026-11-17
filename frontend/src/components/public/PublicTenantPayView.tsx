import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { PublicInvoice, RazorpayOrderResponse } from '../../types';
import {
    ShieldCheck,
    CheckCircle2,
    Clock,
    AlertCircle,
    Building2,
    Calendar,
    User,
    Home,
    CreditCard,
    ArrowRight,
    QrCode,
    Printer,
    Share2,
    Smartphone,
    Lock,
    ExternalLink
} from 'lucide-react';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export function PublicTenantPayView() {
    const { invoiceNumber: paramInvNumber } = useParams<{ invoiceNumber?: string }>();
    const [searchParams] = useSearchParams();
    const invoiceNumber = paramInvNumber || searchParams.get('inv') || '';

    const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paidTransactionRef, setPaidTransactionRef] = useState<string | null>(null);

    // Simulation checkout modal state
    const [showSimModal, setShowSimModal] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<RazorpayOrderResponse | null>(null);
    const [simUpiId, setSimUpiId] = useState('tenant@okaxis');
    const [simPaymentMethod, setSimPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');

    const loadInvoice = async () => {
        if (!invoiceNumber) {
            setError('No invoice number provided in the payment link.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await apiService.getPublicInvoice(invoiceNumber);
            setInvoice(data);
            if (data.status === 'PAID') {
                setPaymentSuccess(true);
                setPaidTransactionRef(data.transactionRef || 'PAID_PREVIOUSLY');
            }
        } catch (err: any) {
            console.error('Failed to load public invoice:', err);
            setError(err?.message || 'Invoice not found or link has expired.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvoice();
    }, [invoiceNumber]);

    // Handle Payment Button Click
    const handleInitiatePayment = async () => {
        if (!invoice || invoice.pendingAmount <= 0) return;

        try {
            setProcessing(true);
            setError(null);

            // Step 1: Create Order via Backend
            const order = await apiService.createRazorpayOrder(invoice.invoiceNumber, invoice.pendingAmount);
            setCurrentOrder(order);

            // If in Simulation Mode, open our custom high-fidelity simulation modal
            if (order.simulationMode || !window.Razorpay) {
                setShowSimModal(true);
                setProcessing(false);
                return;
            }

            // If real Razorpay Checkout is loaded:
            const options = {
                key: order.keyId,
                amount: order.amountInPaise,
                currency: order.currency,
                name: order.companyName || invoice.propertyName,
                description: order.description,
                order_id: order.orderId,
                prefill: {
                    name: order.tenantName,
                    contact: order.tenantContact,
                },
                notes: {
                    invoiceNumber: invoice.invoiceNumber,
                    tenantUid: invoice.tenantUid,
                },
                theme: {
                    color: '#4f46e5',
                },
                handler: async function (response: any) {
                    try {
                        setProcessing(true);
                        // Step 2: Cryptographically verify signature on backend & settle invoice
                        const verifyResult = await apiService.verifyRazorpayPayment({
                            orderId: response.razorpay_order_id,
                            paymentId: response.razorpay_payment_id,
                            signature: response.razorpay_signature,
                            paymentMethod: 'RAZORPAY_CHECKOUT',
                        });
                        setPaidTransactionRef(response.razorpay_payment_id);
                        setPaymentSuccess(true);
                        await loadInvoice();
                    } catch (verifyErr: any) {
                        setError('Payment settlement failed: ' + (verifyErr?.message || 'Unknown error'));
                    } finally {
                        setProcessing(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setProcessing(false);
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (failResp: any) {
                setError('Payment failed: ' + (failResp.error?.description || 'Transaction declined'));
                setProcessing(false);
            });
            rzp.open();
        } catch (err: any) {
            console.error('Order initiation error:', err);
            setError(err?.message || 'Could not initiate payment. Please try again.');
            setProcessing(false);
        }
    };

    // Execute Sandbox / Simulation Payment
    const handleExecuteSimPayment = async () => {
        if (!currentOrder || !invoice) return;

        try {
            setProcessing(true);
            const simPaymentId = `pay_sim_${Date.now()}`;
            const simSignature = `sim_sig_${Date.now()}`;

            const verifiedPayment = await apiService.verifyRazorpayPayment({
                orderId: currentOrder.orderId,
                paymentId: simPaymentId,
                signature: simSignature,
                paymentMethod: simPaymentMethod,
                vpa: simPaymentMethod === 'UPI' ? simUpiId : undefined,
            });

            setShowSimModal(false);
            setPaidTransactionRef(verifiedPayment.transactionReference || simPaymentId);
            setPaymentSuccess(true);
            await loadInvoice();
        } catch (err: any) {
            console.error('Simulation payment failed:', err);
            setError(err?.message || 'Payment simulation failed');
        } finally {
            setProcessing(false);
        }
    };

    const handlePrintReceipt = () => {
        window.print();
    };

    const handleShareWhatsApp = () => {
        if (!invoice) return;
        const text = encodeURIComponent(
            `*Rent Receipt Confirmation*\n` +
            `Property: ${invoice.propertyName}\n` +
            `Tenant: ${invoice.tenantName} (Room ${invoice.roomNo})\n` +
            `Month: ${invoice.monthYear}\n` +
            `Amount Paid: ₹${invoice.amount.toLocaleString()}\n` +
            `Ref: ${paidTransactionRef || invoice.transactionRef || 'VERIFIED'}\n` +
            `Status: PAID`
        );
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-300 font-medium">Loading secure payment portal...</p>
            </div>
        );
    }

    if (error && !invoice) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md">
                    <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Invoice Not Accessible</h2>
                    <p className="text-slate-400 text-sm mb-6">{error}</p>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
                    >
                        Go to Portal Home
                    </Link>
                </div>
            </div>
        );
    }

    const isPaid = invoice?.status === 'PAID' || paymentSuccess;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 print:bg-white print:text-black">
            {/* Header Brand Bar */}
            <div className="max-w-lg w-full mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-white text-base tracking-tight">{invoice?.propertyName || 'RMS Living'}</h1>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Verified Secure Payment
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Lock className="w-3 h-3" /> 256-Bit SSL
                    </span>
                </div>
            </div>

            {/* Main Payment Card */}
            <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden print:shadow-none print:border-slate-300">
                {/* Top Status Banner */}
                {isPaid ? (
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white text-center">
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                            <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-extrabold tracking-tight">Payment Verified & Settled</h2>
                        <p className="text-emerald-100 text-sm mt-1">
                            Thank you! Your rent invoice has been cleared successfully.
                        </p>
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                                Rent Invoice
                            </span>
                            <span className="text-xs text-indigo-100 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Due: {invoice?.dueDate}
                            </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                            <div>
                                <p className="text-indigo-200 text-xs">Total Outstanding</p>
                                <div className="text-3xl font-black tracking-tight text-white mt-0.5">
                                    ₹{invoice?.pendingAmount.toLocaleString()}
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-amber-950 uppercase">
                                {invoice?.status}
                            </span>
                        </div>
                    </div>
                )}

                {/* Invoice Breakdown Details */}
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-2.5">
                            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                            <div>{error}</div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800">
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                <User className="w-3.5 h-3.5 text-indigo-400" /> Tenant Name
                            </span>
                            <p className="font-semibold text-slate-200">{invoice?.tenantName}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800">
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                <Home className="w-3.5 h-3.5 text-indigo-400" /> Room / Bed
                            </span>
                            <p className="font-semibold text-slate-200">Room {invoice?.roomNo}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800">
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Billing Cycle
                            </span>
                            <p className="font-semibold text-slate-200">{invoice?.monthYear}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800">
                            <span className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                <CreditCard className="w-3.5 h-3.5 text-indigo-400" /> Invoice Number
                            </span>
                            <p className="font-semibold text-slate-200 font-mono text-xs">{invoice?.invoiceNumber}</p>
                        </div>
                    </div>

                    {/* Breakdown Summary */}
                    <div className="border-t border-slate-800 pt-4 space-y-2 text-sm">
                        <div className="flex justify-between text-slate-400">
                            <span>Standard Monthly Rent</span>
                            <span className="text-slate-200 font-medium">₹{invoice?.amount.toLocaleString()}</span>
                        </div>
                        {invoice && invoice.paidAmount > 0 && (
                            <div className="flex justify-between text-emerald-400">
                                <span>Previously Paid</span>
                                <span>- ₹{invoice.paidAmount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-bold text-white border-t border-slate-800 pt-2">
                            <span>Total Payable</span>
                            <span className="text-indigo-400 text-lg">
                                ₹{(isPaid ? 0 : invoice?.pendingAmount || 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Paid Details if Settled */}
                    {isPaid && (
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Transaction Ref / UTR:</span>
                                <span className="font-mono font-semibold text-emerald-300">
                                    {paidTransactionRef || invoice?.transactionRef || 'CONFIRMED'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Paid On:</span>
                                <span className="font-medium text-slate-200">{invoice?.paidOn || 'Today'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Payment Mode:</span>
                                <span className="font-medium text-slate-200">{invoice?.paymentMode || 'UPI'}</span>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2">
                        {isPaid ? (
                            <div className="space-y-3">
                                <button
                                    onClick={handlePrintReceipt}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold transition-all shadow-lg shadow-black/20"
                                >
                                    <Printer className="w-4 h-4 text-indigo-400" />
                                    Print / Download Official Receipt
                                </button>
                                <button
                                    onClick={handleShareWhatsApp}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-lg shadow-emerald-600/20"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share Receipt on WhatsApp
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <button
                                    onClick={handleInitiatePayment}
                                    disabled={processing}
                                    className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition-all transform active:scale-[0.99] disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Opening Razorpay Secure Gateway...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-5 h-5" />
                                            <span>Pay ₹{invoice?.pendingAmount.toLocaleString()} via UPI / Cards</span>
                                            <ArrowRight className="w-4 h-4 ml-1" />
                                        </>
                                    )}
                                </button>

                                {/* Supported payment method badges */}
                                <div className="flex items-center justify-center gap-4 pt-2 text-xs text-slate-400">
                                    <span className="flex items-center gap-1 font-medium text-slate-300">
                                        <Smartphone className="w-3.5 h-3.5 text-indigo-400" /> Google Pay
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium text-slate-300">PhonePe</span>
                                    <span>•</span>
                                    <span className="font-medium text-slate-300">Paytm</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 font-medium text-slate-300">
                                        <QrCode className="w-3.5 h-3.5 text-indigo-400" /> UPI QR
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer notes */}
                <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 text-center text-xs text-slate-500">
                    <p>{invoice?.propertyAddress || 'RMS Managed Student & Working Professional Living'}</p>
                    {invoice?.propertyContact && (
                        <p className="mt-0.5 text-slate-400">Manager Contact: {invoice.propertyContact}</p>
                    )}
                </div>
            </div>

            {/* High-Fidelity Simulation / Sandbox Checkout Modal */}
            {showSimModal && currentOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">Razorpay Checkout Sandbox</h3>
                                    <p className="text-xs text-indigo-300">Live Gateway Simulation Mode</p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 uppercase">
                                Test Gateway
                            </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-center">
                            <p className="text-xs text-indigo-300">Order ID: <span className="font-mono">{currentOrder.orderId}</span></p>
                            <div className="text-2xl font-black text-white mt-1">₹{currentOrder.amountInRupees.toLocaleString()}</div>
                            <p className="text-xs text-slate-400 mt-1">{currentOrder.description}</p>
                        </div>

                        {/* Select Method */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Payment Method</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['UPI', 'CARD', 'NETBANKING'] as const).map((method) => (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => setSimPaymentMethod(method)}
                                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                                            simPaymentMethod === method
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {simPaymentMethod === 'UPI' && (
                            <div className="space-y-1.5">
                                <label className="text-xs text-slate-400 font-medium">Virtual Payment Address (VPA / UPI ID)</label>
                                <input
                                    type="text"
                                    value={simUpiId}
                                    onChange={(e) => setSimUpiId(e.target.value)}
                                    placeholder="yourname@okhdfcbank"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        )}

                        <div className="pt-2 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowSimModal(false)}
                                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteSimPayment}
                                disabled={processing}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                            >
                                {processing ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Confirm ₹{currentOrder.amountInRupees}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default PublicTenantPayView;
