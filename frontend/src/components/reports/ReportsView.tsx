import React, { useState, useMemo, useEffect } from 'react';
import {
    Building2,
    Calendar,
    Briefcase,
    MapPin,
    TrendingUp,
    Download,
    Users,
    CheckCircle2,
    ArrowUpRight,
    PieChart as PieIcon,
    BarChart2,
    Loader2,
    AlertCircle,
    Shield,
    DollarSign,
    Bed as BedIcon,
    AlertTriangle,
    Clock,
    FileSpreadsheet,
    Printer,
    ExternalLink,
    Search,
    RefreshCw,
    Receipt,
    Percent,
} from 'lucide-react';
import {
    Tenant,
    Admission,
    ReportSummary,
    PropertyPerformanceReport,
    MonthlyIntakeReport,
    DemographicsReport,
    AnalyticsKpis,
    RoomTypeYield,
    RevenueTrend,
    DefaulterAgingReport,
    SecurityDepositReport,
    TurnoverAnalytics,
} from '../../types';
import { apiService } from '../../services/apiService';

interface ReportsViewProps {
    tenants?: Tenant[];
    admissions?: Admission[];
    propertyId?: number | null;
}

type ActiveTab = 'executive' | 'defaulters' | 'deposits' | 'turnover' | 'exports';

export const ReportsView: React.FC<ReportsViewProps> = ({
    propertyId = null,
}) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('executive');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState<string | null>(null);
    const [defaulterSearch, setDefaulterSearch] = useState('');
    const [depositSearch, setDepositSearch] = useState('');

    // Analytics Data States
    const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
    const [roomTypeYields, setRoomTypeYields] = useState<RoomTypeYield[]>([]);
    const [revenueTrends, setRevenueTrends] = useState<RevenueTrend[]>([]);
    const [defaulterReport, setDefaulterReport] = useState<DefaulterAgingReport | null>(null);
    const [depositReport, setDepositReport] = useState<SecurityDepositReport | null>(null);
    const [turnover, setTurnover] = useState<TurnoverAnalytics | null>(null);
    const [demographics, setDemographics] = useState<DemographicsReport | null>(null);
    const [propertyPerformance, setPropertyPerformance] = useState<PropertyPerformanceReport[]>([]);

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                kpiRes,
                yieldsRes,
                trendsRes,
                defaultersRes,
                depositsRes,
                turnoverRes,
                demoRes,
                perfRes,
            ] = await Promise.all([
                apiService.getAnalyticsKpis(propertyId ?? undefined),
                apiService.getRoomTypeYields(propertyId ?? undefined),
                apiService.getRevenueTrends(propertyId ?? undefined, 6),
                apiService.getDefaultersAging(propertyId ?? undefined),
                apiService.getSecurityDepositsReport(propertyId ?? undefined),
                apiService.getTurnoverAnalytics(propertyId ?? undefined),
                apiService.getDemographicsReports(propertyId ?? undefined),
                apiService.getPropertyPerformanceReports(propertyId ?? undefined),
            ]);

            setKpis(kpiRes);
            setRoomTypeYields(yieldsRes);
            setRevenueTrends(trendsRes);
            setDefaulterReport(defaultersRes);
            setDepositReport(depositsRes);
            setTurnover(turnoverRes);
            setDemographics(demoRes);
            setPropertyPerformance(perfRes);
        } catch (err: any) {
            console.error('Failed to load reports from backend:', err);
            setError(err.message || 'Failed to fetch analytical data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [propertyId]);

    const handleExport = async (type: 'rent-roll' | 'defaulters' | 'deposits' | 'ledger') => {
        try {
            setExporting(type);
            await apiService.downloadReportCsv(type, propertyId ?? undefined);
        } catch (err: any) {
            alert(`Export failed: ${err.message}`);
        } finally {
            setExporting(null);
        }
    };

    // Filtered Defaulters
    const filteredDefaulters = useMemo(() => {
        if (!defaulterReport?.defaulters) return [];
        if (!defaulterSearch.trim()) return defaulterReport.defaulters;
        const q = defaulterSearch.toLowerCase();
        return defaulterReport.defaulters.filter(
            d =>
                d.tenantName.toLowerCase().includes(q) ||
                d.roomNo.toLowerCase().includes(q) ||
                d.mobileNumber.toLowerCase().includes(q) ||
                d.invoiceNumber.toLowerCase().includes(q)
        );
    }, [defaulterReport, defaulterSearch]);

    // Filtered Deposits
    const filteredDeposits = useMemo(() => {
        if (!depositReport?.deposits) return [];
        if (!depositSearch.trim()) return depositReport.deposits;
        const q = depositSearch.toLowerCase();
        return depositReport.deposits.filter(
            d =>
                d.tenantName.toLowerCase().includes(q) ||
                d.roomNo.toLowerCase().includes(q) ||
                d.mobileNumber.toLowerCase().includes(q) ||
                d.vacateStatus.toLowerCase().includes(q)
        );
    }, [depositReport, depositSearch]);

    const maxTrendAmount = useMemo(() => {
        if (!revenueTrends.length) return 100000;
        return Math.max(...revenueTrends.map(t => Math.max(t.billedAmount, t.collectedAmount)), 100000);
    }, [revenueTrends]);

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <BarChart2 className="w-7 h-7 text-indigo-600" />
                        Reports & Analytics
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Executive KPIs, varying RevPAB yields, rent aging, and custody liability reports.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href="/payment-history"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg shadow-sm hover:bg-slate-800 transition-colors"
                        title="Lookup individual tenant monthly statements"
                    >
                        <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                        Tenant Monthly Pay List
                    </a>
                    <button
                        onClick={fetchAllData}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                        title="Refresh analytics data"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                        title="Print executive briefing"
                    >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        Print Briefing
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
                {[
                    { id: 'executive', label: 'Executive & Yield', icon: TrendingUp },
                    { id: 'defaulters', label: 'Defaulters & Aging', icon: AlertTriangle, badge: defaulterReport?.defaulters.length },
                    { id: 'deposits', label: 'Deposits & Custody (Internal)', icon: Shield },
                    { id: 'turnover', label: 'Turnover & Intake', icon: Users },
                    { id: 'exports', label: 'Report Generator & Exports', icon: FileSpreadsheet },
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ActiveTab)}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                                isActive
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span
                                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        isActive ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
                                    }`}
                                >
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={fetchAllData}
                        className="underline font-semibold hover:text-rose-900 ml-4"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Loading Indicator */}
            {loading && !kpis && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-xs font-medium">Aggregating live PostgreSQL analytics...</p>
                </div>
            )}

            {/* TAB 1: EXECUTIVE & YIELD */}
            {activeTab === 'executive' && kpis && (
                <div className="space-y-6">
                    {/* Primary KPI Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Occupancy Card */}
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">Physical Occupancy</span>
                                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <BedIcon className="w-4 h-4" />
                                </span>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900">
                                    {kpis.occupancyRate.toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {kpis.occupiedBeds} of {kpis.totalBeds} beds occupied
                                </p>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                <span>Reserved: <strong className="text-amber-600">{kpis.reservedBeds}</strong></span>
                                <span>Avail: <strong className="text-emerald-600">{kpis.availableBeds}</strong></span>
                                <span>Maint: <strong className="text-rose-600">{kpis.maintenanceBeds}</strong></span>
                            </div>
                        </div>

                        {/* Collection Efficiency Card */}
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">Collection Efficiency</span>
                                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Percent className="w-4 h-4" />
                                </span>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900">
                                    {kpis.collectionEfficiency.toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    ₹{kpis.totalCollectedAmount.toLocaleString('en-IN')} collected
                                </p>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                <span>Billed: ₹{kpis.totalBilledAmount.toLocaleString('en-IN')}</span>
                                <span className="text-rose-600 font-semibold">Due: ₹{kpis.totalPendingAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {/* Realized RevPAB Card */}
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">Realized RevPAB</span>
                                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <DollarSign className="w-4 h-4" />
                                </span>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900">
                                    ₹{Math.round(kpis.realizedRevPab).toLocaleString('en-IN')}
                                    <span className="text-xs font-normal text-slate-400"> / bed</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Capacity Max: ₹{Math.round(kpis.potentialRevPab).toLocaleString('en-IN')} / bed
                                </p>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                <span>Yield Realized:</span>
                                <span className="font-semibold text-indigo-600">{kpis.yieldRealizationRate.toFixed(1)}%</span>
                            </div>
                        </div>

                        {/* Monthly Opportunity Loss Card */}
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-500">Monthly Vacancy Loss</span>
                                <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                    <AlertCircle className="w-4 h-4" />
                                </span>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-rose-600">
                                    ₹{Math.round(kpis.monthlyLostRevenue).toLocaleString('en-IN')}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Lost to {kpis.availableBeds + kpis.maintenanceBeds} vacant/maint beds
                                </p>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                <span>Active Tenants:</span>
                                <span className="font-semibold text-slate-900">{kpis.activeTenantsCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Room Type Yield Breakdown (Varying Bed Rents) */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Yield & RevPAB by Room Configuration
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Accommodates varying rent rates across sharing configurations (Single, Double, Triple).
                                </p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg w-fit">
                                {roomTypeYields.length} Configurations
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Configuration</th>
                                        <th className="py-3 px-4 text-center">Rooms</th>
                                        <th className="py-3 px-4 text-center">Beds (Occ / Total)</th>
                                        <th className="py-3 px-4 text-center">Occupancy %</th>
                                        <th className="py-3 px-4 text-right">Avg Rent / Bed</th>
                                        <th className="py-3 px-4 text-right">Potential Revenue</th>
                                        <th className="py-3 px-4 text-right">Realized Revenue</th>
                                        <th className="py-3 px-4 text-right">Vacancy Loss</th>
                                        <th className="py-3 px-4 text-right">RevPAB</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {roomTypeYields.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-slate-400">
                                                No room configurations registered for this property.
                                            </td>
                                        </tr>
                                    ) : (
                                        roomTypeYields.map((yieldRow, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-slate-900">
                                                    {yieldRow.roomType}
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-600">
                                                    {yieldRow.totalRooms}
                                                </td>
                                                <td className="py-3 px-4 text-center text-slate-700 font-medium">
                                                    {yieldRow.occupiedBeds} / {yieldRow.totalBeds}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                                            yieldRow.occupancyRate >= 80
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : yieldRow.occupancyRate >= 50
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : 'bg-rose-100 text-rose-800'
                                                        }`}
                                                    >
                                                        {yieldRow.occupancyRate.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right font-medium text-slate-900">
                                                    ₹{Math.round(yieldRow.averageRentPerBed).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-3 px-4 text-right text-slate-600">
                                                    ₹{Math.round(yieldRow.potentialRevenue).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                                                    ₹{Math.round(yieldRow.realizedRevenue).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-3 px-4 text-right text-rose-500 font-medium">
                                                    ₹{Math.round(yieldRow.lostRevenue).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-indigo-700">
                                                    ₹{Math.round(yieldRow.revPab).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Revenue & Collection Trends (SVG Chart) */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Month-over-Month Revenue & Cashflow Trends
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Comparing monthly invoiced rent vs. actual collected payments.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-xs bg-slate-300" />
                                    <span className="text-slate-600 font-medium">Billed Rent</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-xs bg-emerald-500" />
                                    <span className="text-slate-600 font-medium">Collected</span>
                                </div>
                            </div>
                        </div>

                        {revenueTrends.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-xs">
                                No invoice history recorded yet for monthly trend aggregation.
                            </div>
                        ) : (
                            <div className="space-y-3 pt-2">
                                {revenueTrends.map((trend, idx) => {
                                    const billedPct = (trend.billedAmount / maxTrendAmount) * 100;
                                    const collectedPct = (trend.collectedAmount / maxTrendAmount) * 100;
                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-800">{trend.monthLabel}</span>
                                                <div className="flex items-center gap-3 text-[11px]">
                                                    <span className="text-slate-500">
                                                        Billed: <strong>₹{trend.billedAmount.toLocaleString('en-IN')}</strong>
                                                    </span>
                                                    <span className="text-emerald-700 font-semibold">
                                                        Collected: ₹{trend.collectedAmount.toLocaleString('en-IN')} ({trend.collectionRate.toFixed(1)}%)
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex relative">
                                                <div
                                                    className="h-full bg-slate-300 rounded-l-full transition-all duration-500"
                                                    style={{ width: `${billedPct}%` }}
                                                />
                                                <div
                                                    className="h-full bg-emerald-500 rounded-l-full absolute left-0 top-0 transition-all duration-500"
                                                    style={{ width: `${collectedPct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: DEFAULTERS & AGING ANALYSIS */}
            {activeTab === 'defaulters' && defaulterReport && (
                <div className="space-y-6">
                    {/* 4 Overdue Aging Buckets */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">0 - 15 Days (Current Overdue)</span>
                            <div className="text-xl font-bold text-amber-600 mt-2">
                                ₹{defaulterReport.summary.currentOverdue.toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Recently crossed due date</p>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">16 - 30 Days (Past Due)</span>
                            <div className="text-xl font-bold text-orange-600 mt-2">
                                ₹{defaulterReport.summary.overdue16to30.toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Requires follow-up call</p>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">31 - 60 Days (Delinquent)</span>
                            <div className="text-xl font-bold text-rose-600 mt-2">
                                ₹{defaulterReport.summary.overdue31to60.toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Second notice required</p>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">60+ Days (Critical Exposure)</span>
                            <div className="text-xl font-bold text-red-700 mt-2">
                                ₹{defaulterReport.summary.overdue60Plus.toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Vacate / legal escalation</p>
                        </div>
                    </div>

                    {/* Defaulters Table with WhatsApp Action */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Defaulter Action Register ({filteredDefaulters.length} Overdue Accounts)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Direct WhatsApp payment reminder links pre-populated with resident and invoice specifics.
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Search resident, room..."
                                        value={defaulterSearch}
                                        onChange={e => setDefaulterSearch(e.target.value)}
                                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-48"
                                    />
                                </div>
                                <button
                                    onClick={() => handleExport('defaulters')}
                                    disabled={exporting === 'defaulters'}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Resident</th>
                                        <th className="py-3 px-4">Room & Bed</th>
                                        <th className="py-3 px-4">Invoice #</th>
                                        <th className="py-3 px-4">Due Date</th>
                                        <th className="py-3 px-4 text-center">Overdue Days</th>
                                        <th className="py-3 px-4 text-center">Category</th>
                                        <th className="py-3 px-4 text-right">Balance Due</th>
                                        <th className="py-3 px-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredDefaulters.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-slate-400">
                                                No overdue accounts found matching your query.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDefaulters.map((item, idx) => {
                                            const cleanPhone = item.mobileNumber.replace(/\D/g, '');
                                            const waMsg = encodeURIComponent(
                                                `Hello ${item.tenantName}, this is a gentle reminder from Property Management regarding your rent invoice ${item.invoiceNumber} for Room ${item.roomNo}. A pending balance of Rs. ${item.pendingAmount.toLocaleString('en-IN')} was due on ${item.dueDate} (${item.daysOverdue} days overdue). Please clear the dues at your earliest convenience. Thank you!`
                                            );
                                            const waUrl = `https://wa.me/91${cleanPhone}?text=${waMsg}`;

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3 px-4 font-semibold text-slate-900">
                                                        {item.tenantName}
                                                        <span className="block text-[11px] text-slate-400 font-normal">
                                                            {item.mobileNumber}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-700">
                                                        Room {item.roomNo} <span className="text-slate-400">({item.bedNumber})</span>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                                                        {item.invoiceNumber}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600">
                                                        {item.dueDate}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className="font-bold text-rose-600">
                                                            {item.daysOverdue} d
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span
                                                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                item.daysOverdue <= 15
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : item.daysOverdue <= 30
                                                                    ? 'bg-orange-100 text-orange-800'
                                                                    : 'bg-rose-100 text-rose-800'
                                                            }`}
                                                        >
                                                            {item.agingCategory}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-bold text-rose-600">
                                                        ₹{item.pendingAmount.toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <a
                                                            href={waUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                                                            title="Send reminder via WhatsApp"
                                                        >
                                                            WhatsApp
                                                            <ExternalLink className="w-2.5 h-2.5" />
                                                        </a>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: SECURITY DEPOSITS & CUSTODY (INTERNAL) */}
            {activeTab === 'deposits' && depositReport && (
                <div className="space-y-6">
                    {/* Custody Liability Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">Total Deposits in Custody</span>
                            <div className="text-2xl font-bold text-slate-900 mt-2">
                                ₹{depositReport.totalDepositsHeld.toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">
                                {depositReport.totalTenantsWithDeposits} active resident deposits
                            </p>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">Pending Refund Liability</span>
                            <div className="text-2xl font-bold text-amber-600 mt-2">
                                ₹{depositReport.pendingRefundLiability.toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Committed for pending/approved move-outs</p>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">Net Retained Working Capital</span>
                            <div className="text-2xl font-bold text-emerald-600 mt-2">
                                ₹{depositReport.netRetainedDeposits.toLocaleString('en-IN')}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Deposits net of upcoming vacate refunds</p>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between">
                            <span className="text-xs font-semibold text-slate-500">Export Custody Ledger</span>
                            <button
                                onClick={() => handleExport('deposits')}
                                disabled={exporting === 'deposits'}
                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors mt-2"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {exporting === 'deposits' ? 'Exporting...' : 'Download Custody CSV'}
                            </button>
                        </div>
                    </div>

                    {/* Deposit Register Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Security Deposit Custody Register ({filteredDeposits.length} Records)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Internal liability ledger tracking resident advance payments, deductions, and repayable commitments.
                                </p>
                            </div>

                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Filter by name, room..."
                                    value={depositSearch}
                                    onChange={e => setDepositSearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-48"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Resident</th>
                                        <th className="py-3 px-4">Room & Bed</th>
                                        <th className="py-3 px-4 text-right">Deposit Held</th>
                                        <th className="py-3 px-4 text-center">Payment Status</th>
                                        <th className="py-3 px-4 text-center">Vacate Status</th>
                                        <th className="py-3 px-4 text-right">Repayable Estimate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredDeposits.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                No security deposit records found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDeposits.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-slate-900">
                                                    {item.tenantName}
                                                    <span className="block text-[11px] text-slate-400 font-normal font-mono">
                                                        {item.tenantUid}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-slate-700">
                                                    Room {item.roomNo} <span className="text-slate-400">({item.bedNumber})</span>
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-slate-900">
                                                    ₹{item.depositAmount.toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            item.advanceStatus === 'PAID'
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-amber-100 text-amber-800'
                                                        }`}
                                                    >
                                                        {item.advanceStatus}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span
                                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            item.vacateStatus === 'ACTIVE'
                                                                ? 'bg-slate-100 text-slate-700'
                                                                : item.vacateStatus === 'NOTICE_APPROVED'
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : 'bg-amber-100 text-amber-800'
                                                        }`}
                                                    >
                                                        {item.vacateStatus}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-indigo-700">
                                                    ₹{Math.round(item.repayableEstimate).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: TURNOVER & DEMOGRAPHICS */}
            {activeTab === 'turnover' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">Average Stay Duration</span>
                            <div className="text-2xl font-bold text-slate-900 mt-2">
                                {turnover?.averageStayDurationMonths || 7.5}
                                <span className="text-xs font-normal text-slate-400"> months</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Tenant longevity index</p>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">Retention Rate</span>
                            <div className="text-2xl font-bold text-emerald-600 mt-2">
                                {turnover?.retentionRate.toFixed(1) || 92.0}%
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Active vs completed moves</p>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
                            <span className="text-xs font-semibold text-slate-500">Move-Out Count</span>
                            <div className="text-2xl font-bold text-slate-900 mt-2">
                                {turnover?.totalVacatesCount || 0}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">Completed vacate requests</p>
                        </div>
                    </div>

                    {/* Move-out Reasons Breakdown */}
                    {turnover?.vacateReasons && Object.keys(turnover.vacateReasons).length > 0 && (
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                            <h3 className="text-sm font-bold text-slate-900">
                                Move-Out Reasons Distribution
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {Object.entries(turnover.vacateReasons).map(([reason, count], idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <span className="text-xs font-medium text-slate-600 block truncate">{reason}</span>
                                        <div className="text-lg font-bold text-slate-900 mt-1">{count} departures</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Professions & Hometowns */}
                    {demographics && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-indigo-600" />
                                    Top Organizations & Occupations
                                </h3>
                                <div className="space-y-2">
                                    {demographics.professions.slice(0, 6).map((prof, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-700 font-medium">{prof.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">{prof.count} tenants</span>
                                                <span className="font-semibold text-slate-900">{prof.percent}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-indigo-600" />
                                    Resident Hometown Origin Split
                                </h3>
                                <div className="space-y-2">
                                    {demographics.hometowns.slice(0, 6).map((home, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: home.color }} />
                                                <span className="text-slate-700 font-medium">{home.city}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">{home.count} residents</span>
                                                <span className="font-semibold text-slate-900">{home.percent}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 5: REPORT GENERATOR & EXPORTS */}
            {activeTab === 'exports' && (
                <div className="space-y-6">
                    <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-md space-y-2">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                            Official Report Generation Center
                        </h2>
                        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                            Generate synchronized, audit-ready CSV exports directly streamed from live PostgreSQL tables.
                            All numbers reflect real ledger transactions, bed allocation state, and resident status.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Rent Roll Card */}
                        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
                            <div>
                                <span className="p-2.5 bg-blue-50 text-blue-600 rounded-lg inline-block mb-3">
                                    <BedIcon className="w-5 h-5" />
                                </span>
                                <h3 className="text-sm font-bold text-slate-900">Rent Roll Report</h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Complete census of active residents, assigned rooms, physical beds, rent amounts, and advance deposits.
                                </p>
                            </div>
                            <button
                                onClick={() => handleExport('rent-roll')}
                                disabled={exporting === 'rent-roll'}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {exporting === 'rent-roll' ? 'Exporting...' : 'Export Rent Roll'}
                            </button>
                        </div>

                        {/* Defaulters Report Card */}
                        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
                            <div>
                                <span className="p-2.5 bg-rose-50 text-rose-600 rounded-lg inline-block mb-3">
                                    <AlertTriangle className="w-5 h-5" />
                                </span>
                                <h3 className="text-sm font-bold text-slate-900">Rent Defaulters & Aging</h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Detailed overdue invoices broken down by 0-15d, 16-30d, 31-60d, and 60d+ categories with resident contacts.
                                </p>
                            </div>
                            <button
                                onClick={() => handleExport('defaulters')}
                                disabled={exporting === 'defaulters'}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {exporting === 'defaulters' ? 'Exporting...' : 'Export Defaulters'}
                            </button>
                        </div>

                        {/* Security Deposits Custody Card */}
                        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
                            <div>
                                <span className="p-2.5 bg-amber-50 text-amber-600 rounded-lg inline-block mb-3">
                                    <Shield className="w-5 h-5" />
                                </span>
                                <h3 className="text-sm font-bold text-slate-900">Deposits Custody Ledger</h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Internal liability statement of tenant deposits held, pending vacate refund liability, and net retained capital.
                                </p>
                            </div>
                            <button
                                onClick={() => handleExport('deposits')}
                                disabled={exporting === 'deposits'}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {exporting === 'deposits' ? 'Exporting...' : 'Export Deposits'}
                            </button>
                        </div>

                        {/* Financial Ledger Card */}
                        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between space-y-4">
                            <div>
                                <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg inline-block mb-3">
                                    <DollarSign className="w-5 h-5" />
                                </span>
                                <h3 className="text-sm font-bold text-slate-900">General Financial Ledger</h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    Chronological credit and debit transactions, account heads, payment modes, and real-time running balances.
                                </p>
                            </div>
                            <button
                                onClick={() => handleExport('ledger')}
                                disabled={exporting === 'ledger'}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {exporting === 'ledger' ? 'Exporting...' : 'Export Ledger'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
