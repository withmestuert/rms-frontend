import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Property, User } from '../../types';

import {
    Building2,
    ChevronDown,
    ChevronRight,
    LayoutDashboard,
    Users,
    UserPlus,
    DoorOpen,
    Receipt,
    CreditCard,
    Wallet,
    Bell,
    BarChart3,
    Settings as SettingsIcon,
    Search,
    Plus,
    CheckCircle2,
    FileCode,
    Sparkles,
    Menu,
    X,
    PanelLeftClose,
    PanelLeftOpen,
    ShieldAlert,
    LogOut,
    Mail,
    Phone,
    Shield,
} from 'lucide-react';

import { DesignSpecModal } from '../common/DesignSpecModal';

interface AppShellProps {
    children: React.ReactNode;
    onQuickAdmission: () => void;
    properties?: Property[];
    selectedPropertyId?: number | null;
    onSelectProperty?: (property: Property) => void;
    currentUser?: User | null;
    onLogout?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
    children,
    onQuickAdmission,
    properties: propsList,
    selectedPropertyId,
    onSelectProperty,
    currentUser: currentUserProp,
    onLogout,
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [isDesignSpecOpen, setIsDesignSpecOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState('');
    const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState(false);
    const [showNotificationToast, setShowNotificationToast] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = React.useRef<HTMLDivElement>(null);
    const [internalProperties, setInternalProperties] = useState<Property[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const activeUser = currentUserProp ?? currentUser;

    // Real-Time Notifications State (Vacate Requests & Pending Verifications ONLY)
    const [notifications, setNotifications] = useState<{
        id: string;
        type: 'vacate_request' | 'verification_pending';
        title: string;
        subtitle: string;
        detail: string;
        targetPath: string;
        badge: string;
        badgeColor: string;
        isRead: boolean;
    }[]>([]);

    const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('rms_read_notifications');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const fetchRealtimeNotifications = React.useCallback(async () => {
        try {
            const [vacateReqs, allTenants] = await Promise.all([
                apiService.getVacateRequests('PENDING').catch(() => []),
                apiService.getTenants().catch(() => []),
            ]);

            const items: {
                id: string;
                type: 'vacate_request' | 'verification_pending';
                title: string;
                subtitle: string;
                detail: string;
                targetPath: string;
                badge: string;
                badgeColor: string;
                isRead: boolean;
            }[] = [];

            // 1. Pending Vacate Requests
            if (Array.isArray(vacateReqs)) {
                vacateReqs
                    .filter(v => v.status === 'PENDING')
                    .forEach(v => {
                        const id = `vacate-${v.id}`;
                        items.push({
                            id,
                            type: 'vacate_request',
                            title: 'Vacate Notice Received',
                            subtitle: `${v.tenantName} • Room ${v.roomNo}`,
                            detail: `Leaving: ${v.expectedLeavingDate} (${v.noticeDays}d notice) • Refund: ₹${Math.round(v.advanceRepayable).toLocaleString('en-IN')}`,
                            targetPath: '/',
                            badge: 'Vacate Request',
                            badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
                            isRead: readNotificationIds.includes(id),
                        });
                    });
            }

            // 2. Pending Advance Verifications
            if (Array.isArray(allTenants)) {
                allTenants
                    .filter(t => (t.paymentStatus === 'pending' || (t as any).advancePaidStatus === 'PENDING') && t.status !== 'inactive' && t.status !== 'vacated')
                    .forEach(t => {
                        const id = `verify-${t.id}`;
                        items.push({
                            id,
                            type: 'verification_pending',
                            title: 'Advance Verification Pending',
                            subtitle: `${t.name} • Room ${t.roomNumber}`,
                            detail: `Advance deposit verification pending confirmation`,
                            targetPath: '/tenants',
                            badge: 'Verify Advance',
                            badgeColor: 'bg-rose-100 text-rose-900 border-rose-200',
                            isRead: readNotificationIds.includes(id),
                        });
                    });
            }

            setNotifications(items);
        } catch (err) {
            console.warn('Real-time notifications sync error:', err);
        }
    }, [readNotificationIds]);

    useEffect(() => {
        fetchRealtimeNotifications();
        const interval = setInterval(fetchRealtimeNotifications, 15000); // 15s real-time poll
        return () => clearInterval(interval);
    }, [fetchRealtimeNotifications, location.pathname]);

    const handleMarkAllRead = () => {
        const allIds = notifications.map(n => n.id);
        setReadNotificationIds(allIds);
        localStorage.setItem('rms_read_notifications', JSON.stringify(allIds));
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const handleNotificationClick = (item: {
        id: string;
        targetPath: string;
        isRead: boolean;
    }) => {
        if (!item.isRead) {
            const updated = [...readNotificationIds, item.id];
            setReadNotificationIds(updated);
            localStorage.setItem('rms_read_notifications', JSON.stringify(updated));
            setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
        }
        setShowNotificationToast(false);
        navigate(item.targetPath);
    };

    const unreadCount = notifications.filter(n => !readNotificationIds.includes(n.id)).length;

    const properties = propsList && propsList.length > 0 ? propsList : internalProperties;

    // Sidebar Collapse (Desktop) & Mobile Drawer Overlay State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    /*
     * React Router now owns navigation state.
     *
     * This replaces the previous:
     *
     * currentPage
     * onNavigate(...)
     *
     * Navigation is now URL based.
     */
    const handleNavigate = (path: string) => {
        navigate(path);
        setIsMobileSidebarOpen(false);
    };

    const handleQuickAdmission = () => {
        onQuickAdmission();
        setIsMobileSidebarOpen(false);
    };

    // Global Keyboard Shortcuts (Ctrl + K for Search, Ctrl + B for Sidebar Toggle)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsSearchModalOpen(prev => !prev);
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                setIsSidebarCollapsed(prev => !prev);
            }

            if (e.key === 'Escape') {
                setIsSearchModalOpen(false);
                setIsMobileSidebarOpen(false);
                setIsProfileMenuOpen(false);
                setShowNotificationToast(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        if (isProfileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileMenuOpen]);

    // Close menus on route change
    useEffect(() => {
        setIsProfileMenuOpen(false);
        setShowNotificationToast(false);
    }, [location.pathname]);

    const handleLogout = () => {
        if (!confirm('Are you sure you want to log out of RMS?')) {
            return;
        }
        setIsProfileMenuOpen(false);
        if (onLogout) {
            onLogout();
        } else {
            try {
                sessionStorage.clear();
                localStorage.removeItem('rms_auth_token');
                localStorage.removeItem('rms_session');
            } catch {
                // ignore
            }
            navigate('/dashboard');
            alert('You have logged out successfully.');
        }
    };

    // Load properties and current user from backend on mount
    useEffect(() => {
        if (!propsList || propsList.length === 0) {
            apiService.getProperties()
                .then(props => {
                    setInternalProperties(props);
                })
                .catch(() => setInternalProperties([]));
        }

        apiService.getUsers()
            .then(users => {
                const active = users.find(u => u.role === 'ADMIN' || u.role === 'PROPERTY_MANAGER') ?? users[0] ?? null;
                setCurrentUser(active);
            })
            .catch(() => setCurrentUser(null));
    }, [propsList]);

    useEffect(() => {
        if (properties.length > 0) {
            const active = properties.find(p => p.id === selectedPropertyId) || properties[0];
            setSelectedProperty(active.name);
        } else {
            setSelectedProperty('');
        }
    }, [properties, selectedPropertyId]);

    /*
     * Breadcrumb title is now derived from the current URL.
     */
    const getBreadcrumbTitle = () => {
        const pathname = location.pathname;

        switch (pathname) {
            case '/':
            case '/dashboard':
                return 'Greenwood PG';

            case '/tenants':
                return 'Tenant Directory';

            case '/admissions':
                return 'Admissions & Intake';

            case '/rooms':
                return 'Rooms & Bed Allocation';

            case '/rent-and-billing':
                return 'Rent & Billing';

            case '/finance/rent':
                return 'Rent & Billing';

            case '/ledger':
                return 'Financial Ledger';

            case '/finance/ledger':
                return 'Financial Ledger';

            case '/payment-history':
                return 'Tenant Payment History';

            case '/reports':
                return 'Operational Reports';

            case '/settings':
                return 'System Settings';

            default:
                return 'Overview';
        }
    };

    /*
     * Navigation item helper.
     *
     * NavLink is responsible for determining the active route.
     * This replaces:
     *
     * currentPage === 'dashboard'
     *
     * without changing the visual classes.
     */
    const navigationClassName = ({
        isActive,
    }: {
        isActive: boolean;
    }) => {
        return `flex items-center gap-2.5 rounded-lg text-xs font-medium transition-colors text-left ${isSidebarCollapsed
            ? 'md:w-10 md:h-10 md:justify-center md:px-0 md:rounded-xl'
            : 'px-3 py-2'
            } ${isActive
                ? 'bg-[#1e293b] text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`;
    };

    return (
        <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex">

            {/* Mobile Backdrop Overlay - closes sidebar when touched */}
            {isMobileSidebarOpen && (
                <div
                    id="mobile-sidebar-backdrop"
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Desktop Collapsible & Mobile Overlay */}
            <aside
                id="sidebar-navigation"
                className={`fixed left-0 top-0 h-screen bg-white z-50 flex flex-col justify-between border-r border-slate-200 overflow-y-auto select-none transition-all duration-300 ease-in-out ${isMobileSidebarOpen
                    ? 'translate-x-0 shadow-2xl'
                    : '-translate-x-full md:translate-x-0'
                    } w-[260px] ${isSidebarCollapsed
                        ? 'md:w-[72px]'
                        : 'md:w-[260px]'
                    }`}
            >
                <div className="flex flex-col">

                    {/* Brand Header */}
                    <div
                        className={`p-3.5 flex items-center border-b border-slate-100 ${isSidebarCollapsed
                            ? 'md:justify-center md:px-2'
                            : 'justify-between'
                            }`}
                    >
                        {isSidebarCollapsed ? (
                            <div className="flex flex-col items-center gap-2 py-0.5">
                                <div
                                    onClick={() => setIsSidebarCollapsed(false)}
                                    className="w-8 h-8 rounded-lg bg-[#091426] flex items-center justify-center text-white shadow-xs shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500/30 transition-all group"
                                    title="Expand sidebar (Ctrl+B)"
                                >
                                    <Building2 className="w-4 h-4 text-blue-400 group-hover:scale-105 transition-transform" />
                                </div>
                                <button
                                    onClick={() => setIsSidebarCollapsed(false)}
                                    className="hidden md:flex items-center justify-center w-7 h-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50/80 rounded-lg transition-all"
                                    title="Expand sidebar (Ctrl+B)"
                                    aria-label="Expand sidebar"
                                >
                                    <PanelLeftOpen className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div
                                        className="w-8 h-8 rounded-lg bg-[#091426] flex items-center justify-center text-white shadow-xs shrink-0"
                                        title="PG Manager"
                                    >
                                        <Building2 className="w-4 h-4 text-blue-400" />
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="font-bold text-base text-[#091426] leading-none font-display">
                                            PG Manager
                                        </span>

                                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">
                                            Property Operations
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {/* Desktop Modern In-Sidebar Collapse Button */}
                                    <button
                                        onClick={() => setIsSidebarCollapsed(true)}
                                        className="hidden md:flex items-center justify-center w-7 h-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all border border-transparent hover:border-slate-200/60"
                                        title="Minimize sidebar (Ctrl+B)"
                                        aria-label="Minimize sidebar"
                                    >
                                        <PanelLeftClose className="w-4 h-4" />
                                    </button>

                                    {/* Mobile Close Button */}
                                    <button
                                        onClick={() => setIsMobileSidebarOpen(false)}
                                        className="flex md:hidden p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                        title="Close sidebar"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Property Selector */}
                    <div
                        className={`p-3 border-b border-slate-100 ${isSidebarCollapsed
                            ? 'md:hidden'
                            : 'block'
                            }`}
                    >
                        <div className="relative">

                            <button
                                onClick={() =>
                                    setIsPropertyDropdownOpen(
                                        !isPropertyDropdownOpen
                                    )
                                }
                                className="w-full bg-slate-50 hover:bg-slate-100 p-2 rounded-lg flex items-center justify-between transition-colors border border-slate-200/70 text-left"
                            >
                                <div className="flex items-center gap-1.5 overflow-hidden">

                                    <Building2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />

                                    {selectedProperty ? (
                                        <span className="text-xs font-semibold text-slate-800 truncate">
                                            {selectedProperty}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic truncate">
                                            No PG connected
                                        </span>
                                    )}
                                </div>

                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </button>

                            {isPropertyDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">

                                    {properties.length === 0 ? (
                                        <div className="px-3 py-3 text-xs text-slate-400 italic text-center">
                                            No PG connected — check backend
                                        </div>
                                    ) : properties.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                setSelectedProperty(p.name);
                                                setIsPropertyDropdownOpen(false);
                                                setIsMobileSidebarOpen(false);
                                                onSelectProperty?.(p);
                                            }}
                                            className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 flex items-center justify-between ${selectedProperty === p.name || selectedPropertyId === p.id
                                                ? 'text-blue-600 font-semibold bg-blue-50/50'
                                                : 'text-slate-700'
                                                }`}
                                        >
                                            <span className="truncate">
                                                {p.name}
                                            </span>

                                            {(selectedProperty === p.name || selectedPropertyId === p.id) && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                            )}
                                        </button>
                                    ))}

                                </div>
                            )}
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav
                        className={`flex flex-col py-2.5 gap-0.5 ${isSidebarCollapsed
                            ? 'md:px-2 md:items-center'
                            : 'px-3'
                            }`}
                    >

                        {/* Overview */}
                        <div
                            className={`px-2 pt-1 pb-1 text-[11px] text-slate-400 uppercase tracking-wider font-semibold ${isSidebarCollapsed
                                ? 'md:hidden'
                                : 'block'
                                }`}
                        >
                            Overview
                        </div>

                        <NavLink
                            id="nav-dashboard"
                            to="/dashboard"
                            onClick={() =>
                                setIsMobileSidebarOpen(false)
                            }
                            title="Dashboard"
                            className={navigationClassName}
                        >
                            <LayoutDashboard className="w-4 h-4 shrink-0" />

                            <span
                                className={
                                    isSidebarCollapsed
                                        ? 'md:hidden'
                                        : 'inline'
                                }
                            >
                                Dashboard
                            </span>
                        </NavLink>

                        {/* Separator / Residents */}
                        {isSidebarCollapsed && (
                            <div className="hidden md:block h-px w-6 mx-auto bg-slate-100 my-1.5" />
                        )}

                        <div
                            className={`px-2 pt-3 pb-1 text-[11px] text-slate-400 uppercase tracking-wider font-semibold ${isSidebarCollapsed
                                ? 'md:hidden'
                                : 'block'
                                }`}
                        >
                            Residents
                        </div>

                        <NavLink
                            id="nav-tenants"
                            to="/tenants"
                            onClick={() =>
                                setIsMobileSidebarOpen(false)
                            }
                            title="Tenants"
                            className={navigationClassName}
                        >
                            <Users className="w-4 h-4 shrink-0" />

                            <span
                                className={
                                    isSidebarCollapsed
                                        ? 'md:hidden'
                                        : 'inline'
                                }
                            >
                                Tenants
                            </span>
                        </NavLink>

                        <NavLink
                            id="nav-admissions"
                            to="/admissions"
                            onClick={() =>
                                setIsMobileSidebarOpen(false)
                            }
                            title="Admissions"
                            className={navigationClassName}
                        >
                            <UserPlus className="w-4 h-4 shrink-0" />

                            <span
                                className={
                                    isSidebarCollapsed
                                        ? 'md:hidden'
                                        : 'inline'
                                }
                            >
                                Admissions
                            </span>
                        </NavLink>

                        {/* Separator / Property */}
                        {isSidebarCollapsed && (
                            <div className="hidden md:block h-px w-6 mx-auto bg-slate-100 my-1.5" />
                        )}

                        <div
                            className={`px-2 pt-3 pb-1 text-[11px] text-slate-400 uppercase tracking-wider font-semibold ${isSidebarCollapsed
                                ? 'md:hidden'
                                : 'block'
                                }`}
                        >
                            Property
                        </div>

                        <NavLink
                            id="nav-rooms"
                            to="/rooms"
                            onClick={() =>
                                setIsMobileSidebarOpen(false)
                            }
                            title="Rooms & Beds"
                            className={navigationClassName}
                        >
                            <DoorOpen className="w-4 h-4 shrink-0" />

                            <span
                                className={
                                    isSidebarCollapsed
                                        ? 'md:hidden'
                                        : 'inline'
                                }
                            >
                                Rooms
                            </span>
                        </NavLink>

                        {/* Separator / Finance */}
                        {isSidebarCollapsed && (
                            <div className="hidden md:block h-px w-6 mx-auto bg-slate-100 my-1.5" />
                        )}

                        <div
                            className={`px-2 pt-3 pb-1 flex items-center justify-between ${isSidebarCollapsed
                                ? 'md:hidden'
                                : 'flex'
                                }`}
                        >
                            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                                Finance
                            </span>

                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                Live
                            </span>
                        </div>

                        <NavLink
                            id="nav-rent"
                            to="/rent-and-billing"
                            onClick={() =>
                                setIsMobileSidebarOpen(false)
                            }
                            title="Rent & Billing"
                            className={navigationClassName}
                        >
                            <Receipt className="w-4 h-4 shrink-0" />

                            <span
                                className={
                                    isSidebarCollapsed
                                        ? 'md:hidden'
                                        : 'inline'
                                }
                            >
                                Rent &amp; Billing
                            </span>
                        </NavLink>

                        <NavLink
                            id="nav-ledger"
                            to="/ledger"
                            onClick={() =>
                                setIsMobileSidebarOpen(false)
                            }
                            title="Ledger"
                            className={navigationClassName}
                        >
                            <Wallet className="w-4 h-4 shrink-0" />

                            <span
                                className={
                                    isSidebarCollapsed
                                        ? 'md:hidden'
                                        : 'inline'
                                }
                            >
                                Ledger
                            </span>
                        </NavLink>

                        <NavLink
                            id="nav-payment-history"
                            to="/payment-history"
                            onClick={() =>
                                setIsMobileSidebarOpen(false)
                            }
                            title="Payment History"
                            className={navigationClassName}
                        >
                            <CreditCard className="w-4 h-4 shrink-0" />

                            <span
                                className={
                                    isSidebarCollapsed
                                        ? 'md:hidden'
                                        : 'inline'
                                }
                            >
                                Payment History
                            </span>
                        </NavLink>

                        {/* Separator / Reports */}
                        {isSidebarCollapsed && (
                            <div className="hidden md:block h-px w-6 mx-auto bg-slate-100 my-1.5" />
                        )}

                        <div
                            className={`px-2 pt-3 pb-1 text-[11px] text-slate-400 uppercase tracking-wider font-semibold ${isSidebarCollapsed
                                ? 'md:hidden'
                                : 'block'
                                }`}
                        >
                            Reports &amp; System
                        </div>

                        <NavLink
                            id="nav-reports"
                            to="/reports"
                            onClick={() =>
                                setIsMobileSidebarOpen(false)
                            }
                            title="Reports"
                            className={navigationClassName}
                        >
                            <BarChart3 className="w-4 h-4 shrink-0" />

                            <span
                                className={
                                    isSidebarCollapsed
                                        ? 'md:hidden'
                                        : 'inline'
                                }
                            >
                                Reports
                            </span>
                        </NavLink>

                        <NavLink
                            id="nav-settings"
                            to="/settings"
                            onClick={() =>
                                setIsMobileSidebarOpen(false)
                            }
                            title="Settings & REST"
                            className={navigationClassName}
                        >
                            <SettingsIcon className="w-4 h-4 shrink-0" />

                            <span
                                className={
                                    isSidebarCollapsed
                                        ? 'md:hidden'
                                        : 'inline'
                                }
                            >
                                Settings &amp; REST
                            </span>
                        </NavLink>

                    </nav>
                </div>

                {/* Sidebar Footer */}
                <div
                    className={`p-3 bg-white border-t border-slate-100 flex flex-col gap-2 ${isSidebarCollapsed
                        ? 'md:p-2 md:items-center'
                        : ''
                        }`}
                >

                    {/* User Profile (Static) */}
                    <div
                        className={`flex items-center p-2 bg-slate-50 rounded-lg border border-slate-100 ${isSidebarCollapsed
                            ? 'md:p-1 md:bg-transparent md:border-none md:justify-center'
                            : ''
                            }`}
                    >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <div
                                className="w-8 h-8 rounded-full bg-[#091426] text-white flex items-center justify-center font-bold text-xs shrink-0 select-none"
                            >
                                {activeUser
                                    ? activeUser.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                    : 'RS'}
                            </div>

                            <div
                                className={`flex flex-col min-w-0 ${isSidebarCollapsed
                                    ? 'md:hidden'
                                    : 'flex'
                                    }`}
                            >
                                <span className="text-xs font-semibold text-slate-900 truncate">
                                    {activeUser?.fullName ?? 'Rajesh Sharma'}
                                </span>

                                <span className="text-[11px] text-slate-500 truncate">
                                    {activeUser
                                        ? activeUser.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                                        : 'Property Operations'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Container - Responsive left padding adjusting with sidebar */}
            <div
                className={`flex-1 flex flex-col min-w-0 transition-all duration-300 pl-0 ${isSidebarCollapsed
                    ? 'md:pl-[72px]'
                    : 'md:pl-[260px]'
                    }`}
            >

                {/* 56px Top Header */}
                <header
                    id="app-header"
                    className={`fixed top-0 right-0 h-14 bg-white/95 backdrop-blur-md z-40 flex items-center justify-between px-3 sm:px-6 border-b border-slate-200/80 shadow-[0_1px_4px_rgba(0,0,0,0.03)] transition-all duration-300 left-0 ${isSidebarCollapsed
                        ? 'md:left-[72px]'
                        : 'md:left-[260px]'
                        }`}
                >

                    {/* Left: Mobile Trigger */}
                    <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">

                        {/* Mobile Hamburger Trigger */}
                        <button
                            id="mobile-menu-btn"
                            onClick={() =>
                                setIsMobileSidebarOpen(true)
                            }
                            className="p-1.5 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
                            title="Open Menu"
                            aria-label="Open sidebar menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Right: Notification & Profile */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">

                        {/* Notifications */}
                        <div className="relative">

                            <button
                                onClick={() =>
                                    setShowNotificationToast(
                                        prev => !prev
                                    )
                                }
                                aria-label="Notifications"
                                className="relative p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <Bell className="w-4 h-4" />

                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center leading-none animate-pulse shadow-2xs">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotificationToast && (
                                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col gap-2 max-h-[85vh]">

                                    {/* Header */}
                                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-slate-900">
                                                Real-Time Updates
                                            </span>
                                            {unreadCount > 0 && (
                                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-800">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>

                                        {unreadCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleMarkAllRead}
                                                className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>

                                    {/* Notifications List */}
                                    <div className="overflow-y-auto divide-y divide-slate-100 max-h-[60vh] -mx-1 px-1">
                                        {notifications.length === 0 ? (
                                            <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-1.5 text-slate-400">
                                                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">All caught up!</span>
                                                <span className="text-[11px] text-slate-400 max-w-[200px]">
                                                    No pending vacate requests or verification tasks.
                                                </span>
                                            </div>
                                        ) : (
                                            notifications.map(item => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleNotificationClick(item)}
                                                    className={`py-2.5 px-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${item.isRead
                                                        ? 'hover:bg-slate-50 opacity-75'
                                                        : 'bg-slate-50/70 hover:bg-slate-100/80'
                                                        }`}
                                                >
                                                    <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${item.type === 'vacate_request'
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                                                        }`}>
                                                        {item.type === 'vacate_request' ? (
                                                            <DoorOpen className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <ShieldAlert className="w-3.5 h-3.5" />
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="text-xs font-bold text-slate-900 truncate">
                                                                {item.title}
                                                            </span>
                                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${item.badgeColor} shrink-0`}>
                                                                {item.badge}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate">
                                                            {item.subtitle}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                                                            {item.detail}
                                                        </p>
                                                    </div>

                                                    {!item.isRead && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Footer Info */}

                                </div>
                            )}
                        </div>

                        {/* Interactive User Profile Menu */}
                        <div className="relative" ref={profileMenuRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsProfileMenuOpen(prev => !prev);
                                    setShowNotificationToast(false);
                                }}
                                aria-expanded={isProfileMenuOpen}
                                aria-haspopup="true"
                                title={`User Profile: ${activeUser?.fullName ?? 'Rajesh Sharma'}`}
                                className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <div className="relative">
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#091426] text-white flex items-center justify-center text-xs font-bold shadow-xs select-none ring-2 ring-slate-200">
                                        {activeUser
                                            ? activeUser.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                            : 'RS'}
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                                </div>
                                <div className="hidden lg:flex flex-col text-left">
                                    <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                                        {activeUser?.fullName ?? 'Rajesh Sharma'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 capitalize truncate max-w-[120px]">
                                        {activeUser ? activeUser.role.replace(/_/g, ' ').toLowerCase() : 'Property Manager'}
                                    </span>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden lg:block transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180 text-blue-600' : ''}`} />
                            </button>

                            {/* Dropdown Card */}
                            {isProfileMenuOpen && (
                                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col gap-3">
                                    {/* User Identity Header */}
                                    <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
                                        <div className="w-11 h-11 rounded-xl bg-[#091426] text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                                            {activeUser
                                                ? activeUser.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                                : 'RS'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                                    {activeUser?.fullName ?? 'Rajesh Sharma'}
                                                </h4>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                                                    {activeUser ? activeUser.role.replace(/_/g, ' ') : 'PROPERTY MANAGER'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                                                @{activeUser?.username ?? 'rajesh.sharma'}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-600 font-semibold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>Active • Authenticated</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Simple User Info Details */}
                                    <div className="flex flex-col gap-1.5 py-0.5 text-xs text-slate-600">
                                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="font-mono text-[11px] text-slate-700 truncate">
                                                {activeUser?.email ?? 'rajesh@rms.in'}
                                            </span>
                                        </div>
                                        {activeUser?.phone && (
                                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="font-mono text-[11px] text-slate-700">
                                                    {activeUser.phone}
                                                </span>
                                            </div>
                                        )}
                                        {selectedProperty && (
                                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="text-[11px] text-slate-700 truncate font-medium">
                                                    Property: <strong className="text-slate-900">{selectedProperty}</strong>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Navigation & Logout Actions */}
                                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsProfileMenuOpen(false);
                                                navigate('/settings');
                                            }}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-2">
                                                <SettingsIcon className="w-3.5 h-3.5 text-slate-500" />
                                                <span>Settings &amp; System</span>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                        </button>

                                        {/* Log Out Button */}
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50/70 hover:bg-rose-100/90 border border-rose-200/60 transition-colors text-left cursor-pointer"
                                        >
                                            <LogOut className="w-3.5 h-3.5 text-rose-600" />
                                            <span>Log Out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="w-full pt-14 pb-12 px-3 sm:px-6 bg-[#f8f9ff] min-h-screen">
                    <div className="py-4 sm:py-6">
                        {children}
                    </div>
                </main>
            </div>

            {/* Universal Search Modal */}
            {isSearchModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-[#091426]/40 backdrop-blur-xs"
                    onClick={() =>
                        setIsSearchModalOpen(false)
                    }
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden"
                        onClick={e =>
                            e.stopPropagation()
                        }
                    >

                        <div className="p-3 border-b border-slate-200 flex items-center gap-2.5">

                            <Search className="w-5 h-5 text-slate-400" />

                            <input
                                type="text"
                                autoFocus
                                placeholder="Jump to tenant, room, admission #, or floor..."
                                className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                            />

                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                ESC
                            </span>
                        </div>

                        <div className="p-3 divide-y divide-slate-100 max-h-80 overflow-y-auto text-xs">

                            <div className="py-1">

                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Quick Navigation
                                </span>

                                <button
                                    onClick={() => {
                                        handleNavigate('/dashboard');
                                        setIsSearchModalOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded flex items-center justify-between text-slate-700"
                                >
                                    <span>Dashboard Overview</span>
                                    <span className="text-[11px] text-slate-400">
                                        View live shift
                                    </span>
                                </button>

                                <button
                                    onClick={() => {
                                        handleNavigate('/tenants');
                                        setIsSearchModalOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded flex items-center justify-between text-slate-700"
                                >
                                    <span>Tenant Directory</span>
                                    <span className="text-[11px] text-slate-400">
                                        163 Active
                                    </span>
                                </button>

                                <button
                                    onClick={() => {
                                        handleNavigate('/admissions');
                                        setIsSearchModalOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded flex items-center justify-between text-slate-700"
                                >
                                    <span>New Admission Workflow</span>
                                    <span className="text-[11px] text-slate-400">
                                        ADM-9042 Active
                                    </span>
                                </button>

                                <button
                                    onClick={() => {
                                        handleNavigate('/rooms');
                                        setIsSearchModalOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded flex items-center justify-between text-slate-700"
                                >
                                    <span>Floor 2 Room &amp; Bed Matrix</span>
                                    <span className="text-[11px] text-slate-400">
                                        8 Rooms â€¢ 22 Beds
                                    </span>
                                </button>

                            </div>

                            <div className="py-2">

                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    Recent Entities
                                </span>

                                <button
                                    onClick={() => {
                                        handleNavigate('/tenants');
                                        setIsSearchModalOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded flex items-center justify-between text-slate-700"
                                >
                                    <span className="font-semibold text-slate-800">
                                        Aarav Sharma (TEN-2024-089)
                                    </span>

                                    <span className="text-[11px] text-slate-500">
                                        Room 204-B
                                    </span>
                                </button>

                                <button
                                    onClick={() => {
                                        handleNavigate('/rooms');
                                        setIsSearchModalOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded flex items-center justify-between text-slate-700"
                                >
                                    <span className="font-semibold text-amber-700">
                                        Bed 204-C Held (Vikram Malhotra)
                                    </span>

                                    <span className="text-[11px] text-amber-600 font-mono">
                                        09:42 left
                                    </span>
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Design System Spec Modal */}
            <DesignSpecModal
                isOpen={isDesignSpecOpen}
                onClose={() =>
                    setIsDesignSpecOpen(false)
                }
            />
        </div>
    );
};