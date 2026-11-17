import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    RentReminderItem,
    ReminderStats,
    ReminderLog,
    SendReminderRequest,
    SendReminderResult,
    ReminderSchedulerConfig,
    ReminderSchedulerRunResult,
    ReminderSchedulerRun,
    PageId
} from '../../types';
import { apiService } from '../../services/apiService';
import {
    Bell,
    Send,
    MessageSquare,
    Copy,
    Check,
    RefreshCw,
    AlertTriangle,
    Clock,
    Calendar,
    IndianRupee,
    Filter,
    Search,
    History,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    ExternalLink,
    AlertCircle,
    Smartphone,
    Mail,
    ChevronRight,
    X,
    Sparkles,
    ShieldAlert,
    Play,
    Settings,
    Zap,
    Sliders,
    Cpu,
    CalendarCheck,
    CheckCircle
} from 'lucide-react';

interface RentReminderCenterViewProps {
    propertyId?: number | null;
    onNavigate?: (page: PageId) => void;
}

type ReminderCategoryFilter = 'ALL' | 'UPCOMING_DUE' | 'DUE_TODAY' | 'OVERDUE_MILD' | 'OVERDUE_URGENT' | 'FINAL_NOTICE';

export const RentReminderCenterView: React.FC<RentReminderCenterViewProps> = ({
    propertyId,
    onNavigate
}) => {
    // Data State
    const [queue, setQueue] = useState<RentReminderItem[]>([]);
    const [stats, setStats] = useState<ReminderStats | null>(null);
    const [logs, setLogs] = useState<ReminderLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filtering State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ReminderCategoryFilter>('ALL');

    // Selection State for Bulk Dispatch
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
    const [bulkChannel, setBulkChannel] = useState<'WHATSAPP' | 'SMS' | 'EMAIL'>('WHATSAPP');
    const [isBulkDispatching, setIsBulkDispatching] = useState(false);
    const [dispatchResult, setDispatchResult] = useState<SendReminderResult | null>(null);

    // Preview / Single Custom Dispatch Modal State
    const [previewItem, setPreviewItem] = useState<RentReminderItem | null>(null);
    const [previewChannel, setPreviewChannel] = useState<'WHATSAPP' | 'SMS' | 'EMAIL'>('WHATSAPP');
    const [customMessage, setCustomMessage] = useState('');
    const [isSendingPreview, setIsSendingPreview] = useState(false);

    // Audit Drawer State
    const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
    const [auditLoading, setAuditLoading] = useState(false);

    // Feedback Toast State
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Automated Morning Cron Scheduler State
    const [schedulerConfig, setSchedulerConfig] = useState<ReminderSchedulerConfig | null>(null);
    const [isTriggeringScheduler, setIsTriggeringScheduler] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isRunsModalOpen, setIsRunsModalOpen] = useState(false);
    const [recentRuns, setRecentRuns] = useState<ReminderSchedulerRun[]>([]);
    const [runsLoading, setRunsLoading] = useState(false);

    // Config Edit Form State
    const [editEnabled, setEditEnabled] = useState(true);
    const [editMorningTime, setEditMorningTime] = useState('10:00');
    const [editCategories, setEditCategories] = useState<string[]>(['DUE_TODAY', 'OVERDUE_URGENT', 'FINAL_NOTICE']);
    const [editChannel, setEditChannel] = useState('WHATSAPP');
    const [editCooldown, setEditCooldown] = useState(24);
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Load Live Data
    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const [queueData, statsData, configData] = await Promise.all([
                apiService.getRentRemindersQueue(selectedCategory === 'ALL' ? undefined : selectedCategory, propertyId ?? undefined),
                apiService.getReminderStats(propertyId ?? undefined),
                apiService.getReminderSchedulerConfig().catch(() => null)
            ]);
            setQueue(queueData);
            setStats(statsData);
            if (configData) {
                setSchedulerConfig(configData);
                setEditEnabled(configData.enabled);
                setEditMorningTime(configData.morningTime || '10:00');
                setEditCategories(configData.targetCategories || ['DUE_TODAY', 'OVERDUE_URGENT', 'FINAL_NOTICE']);
                setEditChannel(configData.channel || 'WHATSAPP');
                setEditCooldown(configData.cooldownHours || 24);
            }
        } catch (err: any) {
            console.error('Failed to load rent reminders queue:', err);
            setError(err.message || 'Could not load reminder queue from server.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedCategory, propertyId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Scheduler Handlers
    const handleTriggerSchedulerRun = async () => {
        setIsTriggeringScheduler(true);
        try {
            const result = await apiService.triggerReminderSchedulerRun(propertyId ?? undefined);
            showToast(`Auto-Dispatch complete! ${result.remindersDispatched} sent, ${result.remindersSkipped} skipped (cooldown active).`, 'success');
            await loadData(true);
        } catch (err: any) {
            console.error('Failed to trigger scheduler run:', err);
            showToast(err.message || 'Failed to trigger automated dispatch run', 'error');
        } finally {
            setIsTriggeringScheduler(false);
        }
    };

    const handleSaveSchedulerConfig = async () => {
        setIsSavingConfig(true);
        try {
            const updated = await apiService.updateReminderSchedulerConfig({
                enabled: editEnabled,
                morningTime: editMorningTime,
                targetCategories: editCategories,
                channel: editChannel,
                cooldownHours: editCooldown
            });
            setSchedulerConfig(updated);
            setIsConfigModalOpen(false);
            showToast('Scheduler configuration saved successfully!', 'success');
        } catch (err: any) {
            console.error('Failed to update scheduler config:', err);
            showToast(err.message || 'Failed to save scheduler configuration', 'error');
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleOpenRunsModal = async () => {
        setIsRunsModalOpen(true);
        setRunsLoading(true);
        try {
            const runs = await apiService.getReminderSchedulerRuns(20);
            setRecentRuns(runs);
        } catch (err: any) {
            console.error('Failed to load scheduler runs:', err);
            showToast('Failed to load scheduler run history', 'error');
        } finally {
            setRunsLoading(false);
        }
    };

    // Load Audit Logs
    const loadAuditLogs = async () => {
        setAuditLoading(true);
        try {
            const logsData = await apiService.getReminderLogs({ propertyId: propertyId ?? undefined });
            setLogs(logsData);
        } catch (err: any) {
            console.error('Failed to load reminder audit logs:', err);
            showToast('Failed to load audit history', 'error');
        } finally {
            setAuditLoading(false);
        }
    };

    const handleOpenAuditDrawer = () => {
        setIsAuditDrawerOpen(true);
        loadAuditLogs();
    };

    // Filter Queue Items locally by search query
    const filteredQueue = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return queue;
        return queue.filter(item =>
            item.tenantName.toLowerCase().includes(q) ||
            item.roomNo.toLowerCase().includes(q) ||
            item.invoiceNumber.toLowerCase().includes(q) ||
            item.mobileNumber.toLowerCase().includes(q)
        );
    }, [queue, searchQuery]);

    // Checkbox Handlers
    const isAllSelected = filteredQueue.length > 0 && selectedInvoiceIds.length === filteredQueue.length;
    const isSomeSelected = selectedInvoiceIds.length > 0 && selectedInvoiceIds.length < filteredQueue.length;

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedInvoiceIds([]);
        } else {
            setSelectedInvoiceIds(filteredQueue.map(i => i.invoiceId));
        }
    };

    const handleToggleSelect = (invoiceId: number) => {
        setSelectedInvoiceIds(prev =>
            prev.includes(invoiceId) ? prev.filter(id => id !== invoiceId) : [...prev, invoiceId]
        );
    };

    // Copy Payment Link
    const handleCopyLink = async (item: RentReminderItem) => {
        try {
            await navigator.clipboard.writeText(item.paymentLink);
            setCopiedId(item.invoiceId);
            showToast(`Copied pay link for ${item.tenantName}!`);
            setTimeout(() => setCopiedId(null), 2500);
        } catch {
            showToast('Failed to copy to clipboard', 'error');
        }
    };

    // 1-Tap WhatsApp Direct Click-To-Chat with Audit Logging
    const handleOneTapWhatsApp = async (item: RentReminderItem) => {
        // Open WhatsApp Web / App directly
        window.open(item.clickToChatUrl, '_blank', 'noopener,noreferrer');

        // Automatically log this dispatch in backend audit history asynchronously
        try {
            await apiService.dispatchRentReminders({
                invoiceIds: [item.invoiceId],
                channel: 'WHATSAPP'
            }, propertyId ?? undefined);

            // Silently update stats and item's sent count
            setQueue(prev => prev.map(inv => inv.invoiceId === item.invoiceId ? {
                ...inv,
                totalRemindersSent: inv.totalRemindersSent + 1,
                lastReminderSentAt: new Date().toISOString()
            } : inv));

            if (stats) {
                setStats({
                    ...stats,
                    remindersSentToday: stats.remindersSentToday + 1,
                    totalRemindersLogged: stats.totalRemindersLogged + 1
                });
            }
            showToast(`WhatsApp reminder dispatched for ${item.tenantName}`);
        } catch (e) {
            console.warn('Silent log update failed:', e);
        }
    };

    // Open Preview Modal
    const handleOpenPreview = (item: RentReminderItem) => {
        setPreviewItem(item);
        setCustomMessage(item.formattedWhatsAppMessage);
        setPreviewChannel('WHATSAPP');
    };

    // Dispatch from Preview Modal
    const handleSendPreview = async () => {
        if (!previewItem) return;
        setIsSendingPreview(true);
        try {
            const req: SendReminderRequest = {
                invoiceIds: [previewItem.invoiceId],
                channel: previewChannel,
                customMessage: customMessage.trim() || undefined
            };

            const result = await apiService.dispatchRentReminders(req, propertyId ?? undefined);

            if (result.successCount > 0) {
                showToast(`Reminder dispatched via ${previewChannel} for ${previewItem.tenantName}`);
                setPreviewItem(null);
                loadData(true);
            } else {
                showToast(result.errors?.[0] || 'Failed to dispatch reminder', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Error sending reminder', 'error');
        } finally {
            setIsSendingPreview(false);
        }
    };

    // Bulk Dispatch Selected
    const handleBulkDispatch = async () => {
        if (selectedInvoiceIds.length === 0) return;
        setIsBulkDispatching(true);
        setDispatchResult(null);

        try {
            const req: SendReminderRequest = {
                invoiceIds: selectedInvoiceIds,
                channel: bulkChannel
            };

            const result = await apiService.dispatchRentReminders(req, propertyId ?? undefined);
            setDispatchResult(result);

            if (result.successCount > 0) {
                showToast(`Successfully dispatched ${result.successCount} of ${result.totalRequested} reminders!`);
                setSelectedInvoiceIds([]);
                loadData(true);
            } else {
                showToast('Failed to dispatch reminders. Check logs.', 'error');
            }
        } catch (err: any) {
            showToast(err.message || 'Error processing bulk dispatch', 'error');
        } finally {
            setIsBulkDispatching(false);
        }
    };

    // Helper for category badge visual
    const getCategoryBadge = (reminderType: string) => {
        switch (reminderType) {
            case 'UPCOMING_DUE':
                return {
                    label: 'Upcoming Due',
                    className: 'bg-amber-50 text-amber-700 border-amber-200'
                };
            case 'DUE_TODAY':
                return {
                    label: 'Due Today',
                    className: 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                };
            case 'OVERDUE_MILD':
                return {
                    label: 'Overdue (1-15d)',
                    className: 'bg-orange-50 text-orange-700 border-orange-200'
                };
            case 'OVERDUE_URGENT':
                return {
                    label: 'Urgent Overdue',
                    className: 'bg-rose-50 text-rose-700 border-rose-300 font-semibold'
                };
            case 'FINAL_NOTICE':
                return {
                    label: 'Final Notice (30d+)',
                    className: 'bg-red-600 text-white border-red-700 font-bold animate-pulse'
                };
            default:
                return {
                    label: reminderType,
                    className: 'bg-slate-100 text-slate-700 border-slate-200'
                };
        }
    };

    // Helper for urgency pills
    const getUrgencyPill = (urgency: string) => {
        switch (urgency) {
            case 'CRITICAL':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300"><ShieldAlert className="w-3 h-3" /> Critical</span>;
            case 'HIGH':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"><AlertTriangle className="w-3 h-3" /> High</span>;
            case 'NORMAL':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200"><Clock className="w-3 h-3" /> Normal</span>;
            case 'LOW':
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><Calendar className="w-3 h-3" /> Upcoming</span>;
        }
    };

    return (
        <div className="flex flex-col w-full gap-6 pb-12 animate-in fade-in duration-200">
            {/* Toast Feedback Notification */}
            {toastMessage && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold text-white transition-all transform animate-in slide-in-from-bottom-3 ${toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                    }`}>
                    {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Top Header & Breadcrumb Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        {onNavigate && (
                            <button
                                onClick={() => onNavigate('rent-and-billing')}
                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
                                title="Back to Rent & Billing"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                            <span className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                                <Bell className="w-5 h-5" />
                            </span>
                            Rent Reminders &amp; Dispatch Center
                        </h1>
                    </div>
                    <p className="text-xs md:text-sm text-slate-500 mt-1 pl-10 md:pl-11">
                        Automated overdue tracking, WhatsApp 1-tap payment link dispatch, and bulk multi-channel notifications.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start md:self-auto">
                    <button
                        type="button"
                        onClick={handleOpenAuditDrawer}
                        className="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg flex items-center gap-2 shadow-xs transition-colors"
                    >
                        <History className="w-4 h-4 text-slate-500" />
                        <span>Audit History</span>
                        {stats && stats.totalRemindersLogged > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                                {stats.totalRemindersLogged}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                        title="Refresh Queue"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Automated Morning Cron Engine Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30">
                                <Cpu className="w-4 h-4" />
                            </span>
                            <span className="font-bold text-sm tracking-wide text-white">
                                Automated Morning Cron Dispatcher
                            </span>
                            {schedulerConfig?.enabled ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Active ({schedulerConfig.morningTime || '10:00'} AM Daily)
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    Paused
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/25">
                                <ShieldAlert className="w-3 h-3 text-blue-400" />
                                {schedulerConfig?.cooldownHours || 24}h Anti-Spam Guard
                            </span>
                        </div>
                        <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
                            Automatically dispatches individual payment links via {schedulerConfig?.channel || 'WHATSAPP'} to residents with due or overdue invoices every morning. Guaranteed single-notification throttle prevents duplicate harassment.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-indigo-300/70">
                            <span>Target Urgency Tiers:</span>
                            {(schedulerConfig?.targetCategories || ['DUE_TODAY', 'OVERDUE_URGENT', 'FINAL_NOTICE']).map(cat => (
                                <span key={cat} className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">
                                    {cat}
                                </span>
                            ))}
                            {schedulerConfig?.lastRunSummary && (
                                <span className="text-slate-400 border-l border-slate-700 pl-2">
                                    Last Run: {schedulerConfig.lastRunSummary}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto shrink-0">
                        <button
                            type="button"
                            onClick={handleTriggerSchedulerRun}
                            disabled={isTriggeringScheduler}
                            className="flex-1 sm:flex-none h-9 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                            title="Run automated morning dispatch routine right now"
                        >
                            <Zap className={`w-3.5 h-3.5 ${isTriggeringScheduler ? 'animate-bounce text-amber-200' : 'text-emerald-100'}`} />
                            <span>{isTriggeringScheduler ? 'Executing Dispatch...' : 'Run Auto-Dispatch Now'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsConfigModalOpen(true)}
                            className="h-9 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/15 flex items-center gap-1.5 transition-all"
                        >
                            <Sliders className="w-3.5 h-3.5 text-indigo-300" />
                            <span>Configure</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenRunsModal}
                            className="h-9 px-3 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/15 flex items-center gap-1.5 transition-all"
                            title="View scheduler execution audit history"
                        >
                            <History className="w-3.5 h-3.5 text-indigo-300" />
                            <span>Run History</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Pending Collection */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Total Pending Collection
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <IndianRupee className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-slate-900 tracking-tight">
                            ₹{(stats?.totalPendingAmount ?? queue.reduce((acc, i) => acc + i.pendingAmount, 0)).toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">{stats?.totalPendingInvoices ?? queue.length}</span> pending invoices in queue
                        </div>
                    </div>
                </div>

                {/* Due Today & Upcoming */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Due Today / Upcoming
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-blue-600 tracking-tight">
                            {(stats?.dueTodayCount ?? 0) + (stats?.upcomingCount ?? 0)}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            <span className="font-semibold text-blue-700">{stats?.dueTodayCount ?? 0}</span> due today &bull; <span className="font-semibold text-slate-700">{stats?.upcomingCount ?? 0}</span> upcoming
                        </div>
                    </div>
                </div>

                {/* Overdue / Critical Defaulters */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Overdue Defaulters
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-rose-600 tracking-tight">
                            {(stats?.overdueMildCount ?? 0) + (stats?.overdueCriticalCount ?? 0)}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            <span className="font-semibold text-rose-700">{stats?.overdueCriticalCount ?? 0}</span> critical (16d+) &bull; <span className="font-semibold text-orange-600">{stats?.overdueMildCount ?? 0}</span> mild
                        </div>
                    </div>
                </div>

                {/* Reminders Dispatched Today */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-4.5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Sent Today / Live Logs
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Send className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-bold text-emerald-600 tracking-tight">
                            {stats?.remindersSentToday ?? 0}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Authoritative audit tracking active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message if any */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => loadData()}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 rounded text-red-800 font-semibold"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Filter Pills & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search tenant name, room no, invoice #..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                        >
                            &times;
                        </button>
                    )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-medium text-slate-600 scrollbar-none">
                    {(['ALL', 'UPCOMING_DUE', 'DUE_TODAY', 'OVERDUE_MILD', 'OVERDUE_URGENT', 'FINAL_NOTICE'] as ReminderCategoryFilter[]).map(cat => {
                        const active = selectedCategory === cat;
                        const labelMap: Record<ReminderCategoryFilter, string> = {
                            ALL: 'All Pending',
                            UPCOMING_DUE: 'Upcoming (1-3d)',
                            DUE_TODAY: 'Due Today',
                            OVERDUE_MILD: 'Mild (1-15d)',
                            OVERDUE_URGENT: 'Urgent (16-30d)',
                            FINAL_NOTICE: 'Final Notice (30d+)'
                        };
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${active
                                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
                                    }`}
                            >
                                {labelMap[cat]}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bulk Dispatch Sticky Action Bar (When items are checked) */}
            {selectedInvoiceIds.length > 0 && (
                <div className="sticky top-2 z-20 bg-slate-900 text-white p-3.5 rounded-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                            {selectedInvoiceIds.length}
                        </span>
                        <div className="text-xs">
                            <span className="font-semibold">{selectedInvoiceIds.length} tenant invoices selected</span> for dispatch
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                            <span className="text-[11px] text-slate-400">Channel:</span>
                            <select
                                value={bulkChannel}
                                onChange={e => setBulkChannel(e.target.value as any)}
                                className="bg-transparent text-white text-xs font-semibold focus:outline-hidden cursor-pointer"
                            >
                                <option value="WHATSAPP" className="bg-slate-800 text-white">WhatsApp</option>
                                <option value="SMS" className="bg-slate-800 text-white">SMS Gateway</option>
                                <option value="EMAIL" className="bg-slate-800 text-white">Email</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={handleBulkDispatch}
                            disabled={isBulkDispatching}
                            className="h-8 px-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                        >
                            {isBulkDispatching ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Dispatching...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Dispatch Selected ({selectedInvoiceIds.length})</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedInvoiceIds([])}
                            className="h-8 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                            title="Clear Selection"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Queue Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                <th className="p-3 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={el => {
                                            if (el) el.indeterminate = isSomeSelected;
                                        }}
                                        onChange={handleToggleSelectAll}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>
                                <th className="p-3">Tenant Details</th>
                                <th className="p-3">Room &amp; Bed</th>
                                <th className="p-3">Month</th>
                                <th className="p-3">Pending Balance</th>
                                <th className="p-3">Due Date &amp; Urgency</th>
                                <th className="p-3">Reminders Sent</th>
                                <th className="p-3 text-right">Instant Dispatch Actions</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                                        <span>Loading live pending invoices queue...</span>
                                    </td>
                                </tr>
                            ) : filteredQueue.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-400">
                                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                                        <div className="text-sm font-semibold text-slate-700">No Pending Reminders in this Category!</div>
                                        <div className="text-xs text-slate-400 mt-1">All tenants in this filter are up to date with their rent payments.</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredQueue.map(item => {
                                    const isSelected = selectedInvoiceIds.includes(item.invoiceId);
                                    const catBadge = getCategoryBadge(item.reminderType);
                                    return (
                                        <tr
                                            key={item.invoiceId}
                                            className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-blue-50/40' : ''
                                                }`}
                                        >
                                            {/* Checkbox */}
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(item.invoiceId)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </td>

                                            {/* Tenant Info */}
                                            <td className="p-3">
                                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                    <span>{item.tenantName}</span>
                                                    {item.mobileNumber && (
                                                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded font-mono font-medium">
                                                            WA
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                                                    <span>{item.mobileNumber || 'No phone'}</span>
                                                    <span>&bull;</span>
                                                    <span>{item.invoiceNumber}</span>
                                                </div>
                                            </td>

                                            {/* Room & Bed */}
                                            <td className="p-3">
                                                <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                                    {item.roomNo || 'N/A'}
                                                </span>
                                            </td>

                                            {/* Month */}
                                            <td className="p-3 font-medium text-slate-600">
                                                {item.monthYear}
                                            </td>

                                            {/* Pending Balance */}
                                            <td className="p-3">
                                                <div className="font-bold text-red-600 text-sm">
                                                    ₹{item.pendingAmount.toLocaleString('en-IN')}
                                                </div>
                                                {item.paidAmount > 0 && (
                                                    <div className="text-[10px] text-slate-400">
                                                        ₹{item.paidAmount.toLocaleString('en-IN')} paid of ₹{item.totalAmount.toLocaleString('en-IN')}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Due Date & Urgency */}
                                            <td className="p-3">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] border ${catBadge.className}`}>
                                                            {catBadge.label}
                                                        </span>
                                                        {getUrgencyPill(item.urgency)}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-slate-400" />
                                                        <span>Due: {item.dueDate}</span>
                                                        <span className="text-slate-400">
                                                            ({item.daysOffset < 0 ? `in ${Math.abs(item.daysOffset)}d` : item.daysOffset === 0 ? 'Today' : `${item.daysOffset}d ago`})
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Reminders Sent */}
                                            <td className="p-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.totalRemindersSent > 0
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {item.totalRemindersSent} sent
                                                    </span>
                                                </div>
                                                {item.lastReminderSentAt && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        Last: {new Date(item.lastReminderSentAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* WhatsApp 1-Tap Trigger */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOneTapWhatsApp(item)}
                                                        className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                                                        title="1-Tap WhatsApp Direct Chat & Auto-Log"
                                                    >
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                        <span className="hidden lg:inline text-[11px]">WhatsApp</span>
                                                    </button>

                                                    {/* Copy Pay Link */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyLink(item)}
                                                        className="h-8 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors"
                                                        title="Copy Public Payment Link"
                                                    >
                                                        {copiedId === item.invoiceId ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                                                        )}
                                                    </button>

                                                    {/* Preview & Customize Modal Trigger */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenPreview(item)}
                                                        className="h-8 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors"
                                                        title="Preview & Customize Message"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                                        <span>Preview</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Count */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-xs flex items-center justify-between">
                    <div>
                        Showing <span className="font-semibold text-slate-700">{filteredQueue.length}</span> of{' '}
                        <span className="font-semibold text-slate-700">{queue.length}</span> actionable pending invoices
                    </div>
                    {selectedInvoiceIds.length > 0 && (
                        <div className="font-semibold text-blue-600">
                            {selectedInvoiceIds.length} item(s) selected
                        </div>
                    )}
                </div>
            </div>

            {/* Preview & Customization Modal */}
            {previewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Customize Reminder Message
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        For {previewItem.tenantName} ({previewItem.roomNo}) &bull; Due: ₹{previewItem.pendingAmount.toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreviewItem(null)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* Target Channel Picker */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Dispatch Channel
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewChannel('WHATSAPP')}
                                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${previewChannel === 'WHATSAPP'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                                        <span>WhatsApp</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPreviewChannel('SMS')}
                                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${previewChannel === 'SMS'
                                            ? 'bg-blue-50 border-blue-500 text-blue-800'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Smartphone className="w-4 h-4 text-blue-600" />
                                        <span>SMS Gateway</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPreviewChannel('EMAIL')}
                                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${previewChannel === 'EMAIL'
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Mail className="w-4 h-4 text-indigo-600" />
                                        <span>Email</span>
                                    </button>
                                </div>
                            </div>

                            {/* Live Payment Link Display */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="font-mono text-slate-600 truncate">{previewItem.paymentLink}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopyLink(previewItem)}
                                    className="text-blue-600 hover:text-blue-700 font-semibold shrink-0 ml-2"
                                >
                                    Copy
                                </button>
                            </div>

                            {/* Message Editor */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Message Content
                                </label>
                                <textarea
                                    rows={7}
                                    value={customMessage}
                                    onChange={e => setCustomMessage(e.target.value)}
                                    className="w-full p-2.5 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    *The payment link is embedded in the message so the tenant can pay with one tap.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    window.open(previewItem.clickToChatUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                                <MessageSquare className="w-4 h-4 text-emerald-600" />
                                <span>Open in WhatsApp</span>
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPreviewItem(null)}
                                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendPreview}
                                    disabled={isSendingPreview}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                                >
                                    {isSendingPreview ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5" />
                                            <span>Send Reminder</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit History Drawer */}
            {isAuditDrawerOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
                        {/* Drawer Header */}
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Authoritative Reminder Audit Logs
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Track record of all reminders dispatched across WhatsApp, SMS, and Email
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAuditDrawerOpen(false)}
                                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {auditLoading ? (
                                <div className="p-12 text-center text-slate-400">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                                    <span>Loading reminder audit history...</span>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">
                                    <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                    <div className="text-sm font-semibold text-slate-600">No Reminders Logged Yet</div>
                                    <div className="text-xs text-slate-400 mt-1">Dispatches sent from the queue will appear here.</div>
                                </div>
                            ) : (
                                logs.map(log => (
                                    <div
                                        key={log.id}
                                        className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold text-xs text-slate-900">
                                                {log.tenantName}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-200 text-slate-700">
                                                    {log.channel}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                            <span>Invoice: <strong className="text-slate-700">{log.invoiceNumber}</strong></span>
                                            <span>
                                                {new Date(log.sentAt).toLocaleString('en-IN', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        {log.messageBody && (
                                            <div className="text-[11px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-200/70 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                                {log.messageBody}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                            <span>Total logs: {logs.length}</span>
                            <button
                                onClick={loadAuditLogs}
                                disabled={auditLoading}
                                className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded font-semibold text-slate-700 flex items-center gap-1.5"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                                <span>Refresh Logs</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scheduler Configuration Modal */}
            {isConfigModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                                    <Sliders className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900">Configure Automated Morning Scheduler</h3>
                                    <p className="text-xs text-slate-500">Set schedule timing, target urgency categories, and rate limits.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsConfigModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4 text-xs">
                            {/* Enable/Disable Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <div>
                                    <div className="font-semibold text-slate-800">Automated Morning Dispatch</div>
                                    <div className="text-[11px] text-slate-500">When active, sends reminders automatically without manual clicks.</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditEnabled(!editEnabled)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${editEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${editEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Morning Execution Time */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-slate-700 flex items-center justify-between">
                                    <span>Scheduled Dispatch Time</span>
                                    <span className="text-[11px] text-slate-400">Daily Morning Routine</span>
                                </label>
                                <input
                                    type="time"
                                    value={editMorningTime}
                                    onChange={e => setEditMorningTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>

                            {/* Target Categories Checkboxes */}
                            <div className="space-y-2">
                                <label className="font-semibold text-slate-700">Target Urgency Categories to Remind</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'DUE_TODAY', label: 'Due Today (0 days)' },
                                        { id: 'OVERDUE_URGENT', label: 'Urgent (16-30 days)' },
                                        { id: 'FINAL_NOTICE', label: 'Final Notice (30d+)' },
                                        { id: 'OVERDUE_MILD', label: 'Mild Overdue (1-15d)' },
                                        { id: 'UPCOMING_DUE', label: 'Upcoming (1-3 days)' },
                                    ].map(item => {
                                        const checked = editCategories.includes(item.id);
                                        return (
                                            <label
                                                key={item.id}
                                                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${checked ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setEditCategories([...editCategories, item.id]);
                                                        } else {
                                                            setEditCategories(editCategories.filter(c => c !== item.id));
                                                        }
                                                    }}
                                                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span>{item.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Channel Selection & Cooldown */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1.5">
                                    <label className="font-semibold text-slate-700">Dispatch Channel</label>
                                    <select
                                        value={editChannel}
                                        onChange={e => setEditChannel(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    >
                                        <option value="WHATSAPP">WhatsApp Deep Link</option>
                                        <option value="SMS">SMS Gateway</option>
                                        <option value="EMAIL">Email</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="font-semibold text-slate-700">Anti-Spam Cooldown</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max="72"
                                            value={editCooldown}
                                            onChange={e => setEditCooldown(parseInt(e.target.value, 10) || 24)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        />
                                        <span className="text-slate-500 font-medium shrink-0">hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsConfigModalOpen(false)}
                                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveSchedulerConfig}
                                disabled={isSavingConfig}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                            >
                                {isSavingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                <span>Save Settings</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Scheduler Runs History Modal */}
            {isRunsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                                    <History className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-900">Scheduler Run History</h3>
                                    <p className="text-xs text-slate-500">Audit trail of automated CRON and manual trigger executions.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsRunsModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body List */}
                        <div className="p-5 flex-1 overflow-y-auto space-y-3">
                            {runsLoading ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                                    <span className="text-xs">Loading execution runs...</span>
                                </div>
                            ) : recentRuns.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                    No scheduler execution runs recorded yet.
                                </div>
                            ) : (
                                recentRuns.map(run => (
                                    <div
                                        key={run.id}
                                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-all text-xs"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${run.triggeredBy === 'CRON' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                    {run.triggeredBy}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${run.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {run.status}
                                                </span>
                                            </div>
                                            <span className="text-slate-500 text-[11px]">
                                                {new Date(run.startTime).toLocaleString('en-IN', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 pt-1">
                                            <div className="bg-white p-2 rounded border border-slate-200/60 text-center">
                                                <div className="text-[10px] uppercase font-semibold text-slate-400">Evaluated</div>
                                                <div className="text-sm font-bold text-slate-800">{run.invoicesEvaluated}</div>
                                            </div>
                                            <div className="bg-white p-2 rounded border border-slate-200/60 text-center">
                                                <div className="text-[10px] uppercase font-semibold text-emerald-600">Dispatched</div>
                                                <div className="text-sm font-bold text-emerald-600">{run.remindersDispatched}</div>
                                            </div>
                                            <div className="bg-white p-2 rounded border border-slate-200/60 text-center">
                                                <div className="text-[10px] uppercase font-semibold text-slate-500">Skipped (Cooldown)</div>
                                                <div className="text-sm font-bold text-slate-600">{run.remindersSkipped}</div>
                                            </div>
                                        </div>

                                        {run.summaryNotes && (
                                            <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/60">
                                                {run.summaryNotes}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>Showing up to 20 recent runs</span>
                            <button
                                onClick={handleOpenRunsModal}
                                disabled={runsLoading}
                                className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded font-semibold text-slate-700 flex items-center gap-1.5"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${runsLoading ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RentReminderCenterView;
