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
} from 'lucide-react';
import { Tenant, Admission, ReportSummary, PropertyPerformanceReport, MonthlyIntakeReport, DemographicsReport } from '../../types';
import { apiService } from '../../services/apiService';

interface ReportsViewProps {
    tenants?: Tenant[];
    admissions?: Admission[];
    propertyId?: number | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
    tenants = [],
    admissions = [],
    propertyId = null,
}) => {
    const currentYearStr = new Date().getFullYear().toString();
    const [selectedPeriod, setSelectedPeriod] = useState(currentYearStr);
    const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [propertyPerformance, setPropertyPerformance] = useState<PropertyPerformanceReport[]>([]);
    const [monthlyIntake, setMonthlyIntake] = useState<MonthlyIntakeReport[]>([]);
    const [demographics, setDemographics] = useState<DemographicsReport | null>(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchReports() {
            setLoading(true);
            setError(null);
            try {
                const [sum, perf, intake, demo] = await Promise.all([
                    apiService.getReportSummary(propertyId ?? undefined),
                    apiService.getPropertyPerformanceReports(propertyId ?? undefined),
                    apiService.getMonthlyIntakeReports(propertyId ?? undefined, selectedPeriod),
                    apiService.getDemographicsReports(propertyId ?? undefined),
                ]);
                if (isMounted) {
                    setSummary(sum);
                    setPropertyPerformance(perf);
                    setMonthlyIntake(intake);
                    setDemographics(demo);
                }
            } catch (err: any) {
                if (isMounted) {
                    console.error('Failed to load reports from backend:', err);
                    setError(err.message || 'Failed to fetch reports data');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }
        fetchReports();
        return () => {
            isMounted = false;
        };
    }, [propertyId, selectedPeriod]);

    // 1. Property-wise Rent Collected Data
    const propertyData = useMemo(() => {
        if (propertyPerformance.length > 0) {
            return propertyPerformance.map(p => ({
                id: `prop-${p.propertyId}`,
                name: p.name,
                totalRooms: p.totalRooms,
                targetRent: p.targetRent,
                collectedRent: p.collectedRent,
                rate: p.rate,
                status: p.status,
            }));
        }
        return [];
    }, [propertyPerformance]);

    const totalPortfolioTarget = summary?.totalTargetRent ?? propertyData.reduce((acc, p) => acc + p.targetRent, 0);
    const totalPortfolioCollected = summary?.totalCollectedRent ?? propertyData.reduce((acc, p) => acc + p.collectedRent, 0);
    const portfolioEfficiency = summary?.portfolioEfficiency !== undefined
        ? Number(summary.portfolioEfficiency).toFixed(1)
        : (totalPortfolioTarget > 0 ? ((totalPortfolioCollected / totalPortfolioTarget) * 100).toFixed(1) : '0.0');

    // 2. Monthly Enrolment Data
    const monthlyEnrolmentData = useMemo(() => {
        if (monthlyIntake.length > 0) {
            return monthlyIntake;
        }
        return [
            { month: 'Jan', count: 0, label: 'Jan' },
            { month: 'Feb', count: 0, label: 'Feb' },
            { month: 'Mar', count: 0, label: 'Mar' },
            { month: 'Apr', count: 0, label: 'Apr' },
            { month: 'May', count: 0, label: 'May' },
            { month: 'Jun', count: 0, label: 'Jun' },
            { month: 'Jul', count: 0, label: 'Jul' },
            { month: 'Aug', count: 0, label: 'Aug' },
            { month: 'Sep', count: 0, label: 'Sep' },
            { month: 'Oct', count: 0, label: 'Oct' },
            { month: 'Nov', count: 0, label: 'Nov' },
            { month: 'Dec', count: 0, label: 'Dec' },
        ];
    }, [monthlyIntake]);

    const maxEnrolment = Math.max(...monthlyEnrolmentData.map(d => d.count), 1);
    const totalEnrolmentsYTD = summary?.annualEnrolments ?? monthlyEnrolmentData.reduce((a, b) => a + b.count, 0);

    const peakIntakeItem = useMemo(() => {
        if (!monthlyEnrolmentData.length) return null;
        return monthlyEnrolmentData.reduce((max, item) => (item.count > max.count ? item : max), monthlyEnrolmentData[0]);
    }, [monthlyEnrolmentData]);

    // 3. Working vs Other Demographic Comparison
    const workingTenantsCount = demographics?.workingTenantsCount ?? tenants.filter(t => (t.category || 'working') === 'working').length;
    const otherTenantsCount = demographics?.otherTenantsCount ?? tenants.filter(t => t.category === 'other').length;
    const totalDemographicCount = demographics?.totalDemographicCount ?? (workingTenantsCount + otherTenantsCount);

    const workingPercent = demographics?.workingPercent ?? (totalDemographicCount > 0 ? Math.round((workingTenantsCount / totalDemographicCount) * 100) : 0);
    const otherPercent = demographics?.otherPercent ?? (100 - workingPercent);

    // 4. Resident Demographics by Profession
    const professionStats = useMemo(() => {
        if (demographics?.professionStats && demographics.professionStats.length > 0) {
            return demographics.professionStats;
        }
        const counts: Record<string, number> = {};
        if (tenants.length > 0) {
            tenants.forEach(t => {
                const prof = t.profession || 'Working Professional';
                counts[prof] = (counts[prof] || 0) + 1;
            });
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            return Object.entries(counts)
                .map(([name, count]) => ({
                    name,
                    count,
                    percent: total > 0 ? Math.round((count / total) * 100) : 0,
                }))
                .sort((a, b) => b.count - a.count);
        }
        return [];
    }, [demographics, tenants]);

    // 5. Hometown Distribution for Pie Chart
    const colors = [
        '#091426', // Navy Dark
        '#2563eb', // Blue
        '#059669', // Emerald
        '#d97706', // Amber
        '#7c3aed', // Violet
        '#e11d48', // Rose
        '#0891b2', // Cyan
        '#475569', // Slate
    ];

    const hometownStats = useMemo(() => {
        if (demographics?.hometownStats && demographics.hometownStats.length > 0) {
            return demographics.hometownStats.map((item, index) => ({
                ...item,
                color: item.color || colors[index % colors.length],
            }));
        }
        const counts: Record<string, number> = {};
        if (tenants.length > 0) {
            tenants.forEach(t => {
                const ht = t.hometown || 'Bangalore';
                counts[ht] = (counts[ht] || 0) + 1;
            });
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            return Object.entries(counts)
                .map(([city, count], index) => ({
                    city,
                    count,
                    percent: total > 0 ? Math.round((count / total) * 100) : 0,
                    color: colors[index % colors.length],
                }))
                .sort((a, b) => b.count - a.count);
        }
        return [];
    }, [demographics, tenants]);

    // Generate SVG Pie Donut slices
    const pieSlices = useMemo(() => {
        if (!hometownStats.length) return [];
        let currentAngle = 0;
        const cx = 110;
        const cy = 110;
        const rOuter = 95;
        const rInner = 56;

        if (hometownStats.length === 1) {
            const stat = hometownStats[0];
            const pathData = `M ${cx} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy + rOuter} A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy - rOuter} M ${cx} ${cy - rInner} A ${rInner} ${rInner} 0 1 1 ${cx} ${cy + rInner} A ${rInner} ${rInner} 0 1 1 ${cx} ${cy - rInner} Z`;
            return [{
                ...stat,
                pathData,
            }];
        }

        return hometownStats.map(stat => {
            const sliceAngle = Math.max(0.1, (stat.percent / 100) * 360);
            const startAngle = currentAngle;
            const endAngle = currentAngle + sliceAngle;
            currentAngle = endAngle;

            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);

            const x1 = cx + rOuter * Math.cos(startRad);
            const y1 = cy + rOuter * Math.sin(startRad);
            const x2 = cx + rOuter * Math.cos(endRad);
            const y2 = cy + rOuter * Math.sin(endRad);

            const x3 = cx + rInner * Math.cos(endRad);
            const y3 = cy + rInner * Math.sin(endRad);
            const x4 = cx + rInner * Math.cos(startRad);
            const y4 = cy + rInner * Math.sin(startRad);

            const largeArc = sliceAngle > 180 ? 1 : 0;
            const pathData = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;

            return {
                ...stat,
                pathData,
            };
        });
    }, [hometownStats]);

    const handleExportData = () => {
        const rows: string[][] = [
            ['RMS Financial & Operations Report', new Date().toISOString()],
            ['Calendar Period', selectedPeriod],
            [],
            ['Metric', 'Value'],
            ['Total Collected Rent', `₹${totalPortfolioCollected}`],
            ['Total Target Rent', `₹${totalPortfolioTarget}`],
            ['Portfolio Efficiency', `${portfolioEfficiency}%`],
            ['Annual Enrolments', `${totalEnrolmentsYTD}`],
            ['Working Residents', `${workingTenantsCount} (${workingPercent}%)`],
            ['Students / Other', `${otherTenantsCount} (${otherPercent}%)`],
            [],
            ['Property Performance Breakdown'],
            ['Property Name', 'Total Rooms', 'Target Rent', 'Collected Rent', 'Realization %', 'Status'],
            ...propertyData.map(p => [
                p.name,
                String(p.totalRooms),
                String(p.targetRent),
                String(p.collectedRent),
                `${Math.round((p.collectedRent / (p.targetRent || 1)) * 100)}%`,
                p.status,
            ]),
            [],
            ['Monthly Intake Distribution'],
            ['Month', 'Count'],
            ...monthlyEnrolmentData.map(m => [m.label, String(m.count)]),
            [],
            ['Demographics by Profession'],
            ['Profession / Domain', 'Count', 'Percentage'],
            ...professionStats.map(pr => [pr.name, String(pr.count), `${pr.percent}%`]),
            [],
            ['Hometown Distribution'],
            ['City', 'Residents Count', 'Percentage'],
            ...hometownStats.map(h => [h.city, String(h.count), `${h.percent}%`]),
        ];

        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `RMS_Report_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Action Bar */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    {loading ? (
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            <span>Loading live reports from database...</span>
                        </div>
                    ) : error ? (
                        <span className="text-xs font-mono text-amber-700">{error}</span>
                    ) : null}
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={selectedPeriod}
                        onChange={e => setSelectedPeriod(e.target.value)}
                        className="h-9 px-3 bg-white border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none shadow-xs cursor-pointer"
                    >
                        <option value={currentYearStr}>Calendar Year {currentYearStr}</option>
                        <option value="Q1">Q1 {currentYearStr}</option>
                        <option value="Q2">Q2 {currentYearStr}</option>
                        <option value="Q3">Q3 {currentYearStr}</option>
                        <option value="Q4">Q4 {currentYearStr} (Active)</option>
                    </select>

                    <button
                        onClick={handleExportData}
                        className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export Data</span>
                    </button>
                </div>
            </div>

            {/* Top 4 KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Rent Collected */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Total Rent Collected
                    </span>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-[#091426] font-display tabular-nums">
                            ₹{totalPortfolioCollected.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5 font-mono">
                            Target: ₹{totalPortfolioTarget.toLocaleString('en-IN')}
                        </span>
                    </div>
                    <div className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold w-fit flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{portfolioEfficiency}% Realization</span>
                    </div>
                </div>

                {/* Total Enrolments */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Annual Enrolments
                    </span>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-[#091426] font-display tabular-nums">
                            {totalEnrolmentsYTD} Residents
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5 font-mono">
                            Across {summary?.propertiesCount ?? propertyData.length} {(summary?.propertiesCount ?? propertyData.length) === 1 ? 'Property' : 'Properties'}
                        </span>
                    </div>
                    <div className="mt-3 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-semibold w-fit">
                        Consistent Inflow
                    </div>
                </div>

                {/* Working vs Other Ratio */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Working vs Other Ratio
                    </span>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-[#091426] font-display tabular-nums">
                            {workingPercent}% Working
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5 font-mono">
                            {otherPercent}% Students / Other
                        </span>
                    </div>
                    <div className="mt-3 text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-semibold w-fit">
                        {workingTenantsCount} Working · {otherTenantsCount} Other
                    </div>
                </div>

                {/* Diversity by Hometown */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Hometown Origins
                    </span>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-[#091426] font-display tabular-nums">
                            {hometownStats.length} Cities
                        </span>
                        <span className="text-xs text-slate-500 block mt-0.5 font-mono">
                            Top: {hometownStats[0]?.city || 'N/A'} ({hometownStats[0]?.percent || 0}%)
                        </span>
                    </div>
                    <div className="mt-3 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold w-fit flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Pan-India Distribution</span>
                    </div>
                </div>
            </div>

            {/* Row 1: Property-Wise Rent Collected & Working vs Other Comparative Graph */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Property-Wise Rent Collected (lg:col-span-7) */}
                <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-5">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                <h2 className="text-sm font-bold text-[#091426]">
                                    Property Wise — Rent Collected
                                </h2>
                            </div>
                            <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                Portfolio Avg: {portfolioEfficiency}%
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Monthly rent collection breakdown across active properties and buildings.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {propertyData.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400 font-mono">
                                No property performance records found for this scope.
                            </div>
                        ) : (
                            propertyData.map(prop => {
                                const percent = prop.targetRent > 0 ? Math.min(100, Math.round((prop.collectedRent / prop.targetRent) * 100)) : 0;

                                return (
                                    <div key={prop.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/70 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-semibold text-slate-900 text-xs">{prop.name}</span>
                                                <span className="text-[11px] text-slate-500 font-mono ml-2">
                                                    {prop.totalRooms} Rooms
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-mono font-bold text-slate-900 text-xs">
                                                    ₹{prop.collectedRent.toLocaleString('en-IN')}
                                                </span>
                                                <span className="text-[10px] text-slate-400 block font-mono">
                                                    Target: ₹{prop.targetRent.toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                                            <div
                                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                                            <span className="text-emerald-700 font-semibold">{prop.status}</span>
                                            <span className="font-bold text-slate-800">{percent}% Collected</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/50 flex items-center justify-between text-xs text-slate-600">
                        <span>Combined Monthly Revenue</span>
                        <span className="font-mono font-bold text-slate-900">
                            ₹{totalPortfolioCollected.toLocaleString('en-IN')} / ₹{totalPortfolioTarget.toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>

                {/* 3. Comparing Graph: Working vs Other (lg:col-span-5) */}
                <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-5">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-600" />
                                <h2 className="text-sm font-bold text-[#091426]">
                                    Working vs Other — Comparison
                                </h2>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                                {totalDemographicCount} Total
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Distribution between corporate working professionals and students/scholars.
                        </p>
                    </div>

                    {/* Visual Bar Comparison */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between text-xs font-semibold">
                            <div className="flex items-center gap-2 text-blue-700">
                                <span className="w-3 h-3 rounded bg-blue-600"></span>
                                <span>Working ({workingPercent}%)</span>
                            </div>
                            <div className="flex items-center gap-2 text-purple-700">
                                <span className="w-3 h-3 rounded bg-purple-500"></span>
                                <span>Other / Student ({otherPercent}%)</span>
                            </div>
                        </div>

                        {/* Stacked Comparative Bar */}
                        <div className="w-full h-8 rounded-lg overflow-hidden flex shadow-inner border border-slate-200/80">
                            <div
                                className="bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold font-mono transition-all"
                                style={{ width: `${workingPercent}%` }}
                            >
                                {workingPercent}%
                            </div>
                            <div
                                className="bg-purple-500 flex items-center justify-center text-white text-[11px] font-bold font-mono transition-all"
                                style={{ width: `${otherPercent}%` }}
                            >
                                {otherPercent}%
                            </div>
                        </div>
                    </div>

                    {/* Comparative Metrics Cards */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-100 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                                <span>Working Residents</span>
                            </div>
                            <div className="text-xl font-bold font-display text-blue-950 mt-1">
                                {workingTenantsCount}
                            </div>
                            <span className="text-[11px] text-blue-700 font-mono">
                                Employed Residents
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1">
                                IT, Engineering &amp; Finance
                            </span>
                        </div>

                        <div className="p-3.5 bg-purple-50/60 rounded-lg border border-purple-100 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-purple-900 font-bold">
                                <Users className="w-3.5 h-3.5 text-purple-600" />
                                <span>Students / Other</span>
                            </div>
                            <div className="text-xl font-bold font-display text-purple-950 mt-1">
                                {otherTenantsCount}
                            </div>
                            <span className="text-[11px] text-purple-700 font-mono">
                                Student / Scholar
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1">
                                Graduates &amp; Aspirants
                            </span>
                        </div>
                    </div>

                    <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
                        <span>Portfolio Residency Composition</span>
                        <span className="font-semibold text-slate-700">Live PostgreSQL Derived</span>
                    </div>
                </div>
            </div>

            {/* Row 2: Monthly Enrolment Graph */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-emerald-600" />
                            <h2 className="text-sm font-bold text-[#091426]">
                                Enrolment Graph — By Month ({selectedPeriod})
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Monthly intake volume of newly enrolled residents across all room inventory.
                        </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                        {peakIntakeItem && peakIntakeItem.count > 0
                            ? `Peak Intake: ${peakIntakeItem.label} (${peakIntakeItem.count} Enrolments)`
                            : 'Intake Velocity: Normal'}
                    </span>
                </div>

                {/* SVG Monthly Bar Chart */}
                <div className="w-full overflow-x-auto">
                    <div className="min-w-[640px] h-52 flex flex-col justify-between pt-4">
                        {/* Chart Area */}
                        <div className="flex-1 flex items-end justify-between gap-3 border-b border-slate-200 pb-2 px-2">
                            {monthlyEnrolmentData.map(item => {
                                const heightPercent = (item.count / maxEnrolment) * 100;
                                const isPeak = Boolean(peakIntakeItem && item.count === peakIntakeItem.count && item.count > 0);

                                return (
                                    <div key={item.month} className="flex-1 flex flex-col items-center gap-1 group">
                                        {/* Tooltip / Number */}
                                        <span className="text-[10px] font-mono font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {item.count}
                                        </span>

                                        {/* Bar */}
                                        <div className="w-full max-w-[38px] bg-slate-100 rounded-t-md relative h-36 flex items-end justify-center overflow-hidden">
                                            <div
                                                className={`w-full rounded-t-md transition-all duration-500 ${isPeak
                                                        ? 'bg-[#091426] group-hover:bg-blue-600'
                                                        : 'bg-blue-600/85 group-hover:bg-blue-700'
                                                    }`}
                                                style={{ height: `${Math.max(4, heightPercent)}%` }}
                                            />
                                        </div>

                                        {/* X-axis Label */}
                                        <span className="text-[11px] font-mono text-slate-500 mt-1">
                                            {item.month}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Sub-label */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 px-2">
                            <span>Intake count per calendar month</span>
                            <span className="font-mono">Total {selectedPeriod} Intakes: {totalEnrolmentsYTD}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Resident Demographics by Profession & Hometown Pie Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 4. Resident Demographics by Profession (lg:col-span-6) */}
                <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-5">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-blue-600" />
                                <h2 className="text-sm font-bold text-[#091426]">
                                    Resident Demographics — By Profession
                                </h2>
                            </div>
                            <span className="text-xs font-mono text-slate-500">
                                {professionStats.length} Domains
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Distribution of current residents categorized by occupational domain.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3.5">
                        {professionStats.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400 font-mono">
                                No resident profession records available.
                            </div>
                        ) : (
                            professionStats.map(stat => (
                                <div key={stat.name} className="flex flex-col gap-1 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-slate-800">{stat.name}</span>
                                        <div className="flex items-center gap-2 font-mono">
                                            <span className="font-bold text-slate-900">{stat.count} residents</span>
                                            <span className="text-slate-400">({stat.percent}%)</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-[#091426] h-full rounded-full"
                                            style={{ width: `${stat.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                        <span>Corporate Alignment</span>
                        <span className="font-semibold text-slate-900">Updated Real-Time</span>
                    </div>
                </div>

                {/* 5. Pie Chart Based on Hometown (lg:col-span-6) */}
                <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-5">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <PieIcon className="w-4 h-4 text-emerald-600" />
                                <h2 className="text-sm font-bold text-[#091426]">
                                    Hometown Distribution — Pie Chart
                                </h2>
                            </div>
                            <span className="text-xs font-mono text-slate-500">
                                {hometownStats.length} Origin Cities
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Geographic origins collected from resident enrolment records.
                        </p>
                    </div>

                    {/* Pie Chart & Interactive Legend */}
                    {hometownStats.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 font-mono">
                            No resident hometown records available.
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                            {/* SVG Donut Chart */}
                            <div className="relative shrink-0 flex items-center justify-center">
                                <svg width="220" height="220" viewBox="0 0 220 220" className="transform -rotate-90">
                                    {pieSlices.map(slice => {
                                        const isHovered = hoveredSlice === slice.city;
                                        return (
                                            <path
                                                key={slice.city}
                                                d={slice.pathData}
                                                fill={slice.color}
                                                className="cursor-pointer transition-all duration-200 hover:opacity-90"
                                                stroke="#ffffff"
                                                strokeWidth={isHovered ? 3 : 1.5}
                                                onMouseEnter={() => setHoveredSlice(slice.city)}
                                                onMouseLeave={() => setHoveredSlice(null)}
                                            />
                                        );
                                    })}
                                </svg>

                                {/* Center Donut Hole Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">
                                        {hoveredSlice || 'Hometowns'}
                                    </span>
                                    <span className="text-base font-bold font-display text-slate-900">
                                        {hoveredSlice
                                            ? `${hometownStats.find(h => h.city === hoveredSlice)?.percent}%`
                                            : `${hometownStats.length} Cities`}
                                    </span>
                                </div>
                            </div>

                            {/* Legend / Breakdown List */}
                            <div className="flex-1 w-full grid grid-cols-2 gap-2 text-xs">
                                {hometownStats.map(item => {
                                    const isHovered = hoveredSlice === item.city;

                                    return (
                                        <div
                                            key={item.city}
                                            onMouseEnter={() => setHoveredSlice(item.city)}
                                            onMouseLeave={() => setHoveredSlice(null)}
                                            className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-between ${isHovered
                                                    ? 'bg-blue-50/80 border-blue-200'
                                                    : 'bg-slate-50/70 border-slate-100 hover:bg-slate-100/70'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: item.color }}
                                                />
                                                <span className="font-semibold text-slate-800 text-[11px]">
                                                    {item.city}
                                                </span>
                                            </div>
                                            <span className="font-mono text-[11px] text-slate-600 font-bold">
                                                {item.percent}%
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-between">
                        <span>Aggregated from Tenant Enrolment Portal</span>
                        <span className="font-mono text-slate-600">Updated Real-Time</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
