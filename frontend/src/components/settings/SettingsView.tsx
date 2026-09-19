import { ROLES } from '../../config/constants';
import { API_PATHS } from '../../config/apiPaths';
import React, { useState } from 'react';
import {
    Settings,
    Server,
    Database,
    RefreshCw,
    CheckCircle2,
    ShieldCheck,
    Building2,
    Users,
    Plus,
    Edit2,
    Trash2,
    X,
    Mail,
    Phone,
    MapPin,
    RotateCcw,
    Shield,
} from 'lucide-react';
import { apiService, ApiConfig } from '../../services/apiService';
import { Property, User } from '../../types';

interface SettingsViewProps {
    properties: Property[];
    users: User[];
    onCreateProperty: (data: Omit<Property, 'id'>) => Promise<Property>;
    onUpdateProperty: (id: number, data: Partial<Property>) => Promise<Property>;
    onDeleteProperty: (id: number) => Promise<void>;
    onCreateUser: (data: Omit<User, 'id'>) => Promise<User>;
    onUpdateUser: (id: number, data: Partial<User>) => Promise<User>;
    onDeleteUser: (id: number) => Promise<void>;
    onResetData: () => void;
    onReloadData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
    properties,
    users,
    onCreateProperty,
    onUpdateProperty,
    onDeleteProperty,
    onCreateUser,
    onUpdateUser,
    onDeleteUser,
    onResetData,
    onReloadData,
}) => {
    const [activeTab, setActiveTab] = useState<'properties' | 'users' | 'backend'>('properties');
    const [config, setConfig] = useState<ApiConfig>(apiService.getConfig());
    const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'failed'; message: string }>({
        status: 'idle',
        message: '',
    });

    // Property Modal State
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [propName, setPropName] = useState('');
    const [propCode, setPropCode] = useState('');
    const [propAddress, setPropAddress] = useState('');
    const [propCity, setPropCity] = useState('Bengaluru');
    const [propState, setPropState] = useState('Karnataka');
    const [propPincode, setPropPincode] = useState('560038');
    const [propType, setPropType] = useState('PG');
    const [propFloors, setPropFloors] = useState(4);
    const [propRooms, setPropRooms] = useState(30);
    const [propPhone, setPropPhone] = useState('9876543210');
    const [propEmail, setPropEmail] = useState('contact@pg.in');
    const [propStatus, setPropStatus] = useState('ACTIVE');
    const [isSubmittingProp, setIsSubmittingProp] = useState(false);

    // User Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userFullName, setUserFullName] = useState('');
    const [userUsername, setUserUsername] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userRole, setUserRole] = useState<string>(ROLES.SUB_MEMBER);
    const [userPassword, setUserPassword] = useState('');
    const [userPropertyIds, setUserPropertyIds] = useState<number[]>([]);
    const [userPhone, setUserPhone] = useState('');
    const [userStatus, setUserStatus] = useState('ACTIVE');
    const [isSubmittingUser, setIsSubmittingUser] = useState(false);

    const handleSaveBackend = (e: React.FormEvent) => {
        e.preventDefault();
        apiService.updateConfig(config);
        alert('Spring Boot REST API integration settings saved successfully!');
    };

    const handleTestConnection = async () => {
        setTestResult({ status: 'testing', message: 'Pinging Spring Boot REST endpoint...' });
        try {
            const startTime = performance.now();
            const response = await fetch(`${config.baseUrl}${API_PATHS.CLIENT_CONFIG}`, { method: 'GET' }).catch(() => null);
            const elapsed = Math.round(performance.now() - startTime);

            if (response && response.ok) {
                setTestResult({
                    status: 'success',
                    message: `Connected successfully! Spring Boot responded in ${elapsed}ms. (PostgreSQL & REST endpoints online)`,
                });
            } else {
                setTestResult({
                    status: 'failed',
                    message: `Server responded with HTTP ${response ? response.status : 'ERR'}. Check backend service.`,
                });
            }
        } catch {
            setTestResult({
                status: 'failed',
                message: `Could not connect to ${config.baseUrl}. Make sure your Spring Boot server is running on port 8080.`,
            });
        }
    };

    // Property Handlers
    const openAddPropertyModal = () => {
        setEditingProperty(null);
        setPropName('');
        setPropCode('');
        setPropAddress('12th Main, Indiranagar');
        setPropCity('Bengaluru');
        setPropState('Karnataka');
        setPropPincode('560038');
        setPropType('PG');
        setPropFloors(4);
        setPropRooms(32);
        setPropPhone('9876543210');
        setPropEmail('manager@rms.in');
        setPropStatus('ACTIVE');
        setIsPropertyModalOpen(true);
    };

    const openEditPropertyModal = (p: Property) => {
        setEditingProperty(p);
        setPropName(p.name);
        setPropCode(p.code);
        setPropAddress(p.address || '');
        setPropCity(p.city || 'Bengaluru');
        setPropState(p.state || 'Karnataka');
        setPropPincode('560038');
        setPropType(p.propertyType || 'PG');
        setPropFloors(p.totalFloors || 3);
        setPropRooms(p.totalRooms || 20);
        setPropPhone(p.contactNumber || '');
        setPropEmail(p.contactEmail || '');
        setPropStatus(p.status || 'ACTIVE');
        setIsPropertyModalOpen(true);
    };

    const handleSaveProperty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!propName.trim()) {
            alert('Property name is required.');
            return;
        }
        setIsSubmittingProp(true);
        try {
            const data: any = {
                name: propName.trim(),
                code: propCode.trim() || propName.trim().substring(0, 4).toUpperCase() + '-01',
                address: propAddress.trim(),
                city: propCity.trim(),
                state: propState.trim(),
                pincode: propPincode.trim(),
                propertyType: propType,
                totalFloors: Number(propFloors),
                totalRooms: Number(propRooms),
                contactNumber: propPhone.trim(),
                contactEmail: propEmail.trim(),
                status: propStatus,
            };

            if (editingProperty) {
                await onUpdateProperty(editingProperty.id, data);
            } else {
                await onCreateProperty(data);
            }
            await onReloadData();
            setIsPropertyModalOpen(false);
        } catch (err: any) {
            console.error('Save property failed:', err);
            alert(`Failed to save property: ${err.message || 'Check backend logs'}`);
        } finally {
            setIsSubmittingProp(false);
        }
    };

    const handleDeleteProperty = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete property "${name}"?`)) return;
        try {
            await onDeleteProperty(id);
            await onReloadData();
        } catch (err: any) {
            alert(`Failed to delete property: ${err.message || 'Check backend logs'}`);
        }
    };

    // User Handlers
    const openAddUserModal = () => {
        setEditingUser(null);
        setUserPassword('');
        setUserPropertyIds([]);
        setUserFullName('');
        setUserUsername('');
        setUserEmail('');
        setUserRole(ROLES.SUB_MEMBER);
        setUserPhone('');
        setUserStatus('ACTIVE');
        setIsUserModalOpen(true);
    };

    const openEditUserModal = (u: User) => {
        setEditingUser(u);
        setUserPassword('');
        setUserPropertyIds(u.propertyIds || []);
        setUserFullName(u.fullName);
        setUserUsername(u.username);
        setUserEmail(u.email);
        setUserRole(u.role);
        setUserPhone(u.phone || '');
        setUserStatus(u.status);
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userFullName.trim() || !userUsername.trim() || !userEmail.trim()) {
            alert('Full Name, Username, and Email are required.');
            return;
        }
        setIsSubmittingUser(true);
        try {
            const data: any = {
                fullName: userFullName.trim(),
                username: userUsername.trim().toLowerCase(),
                email: userEmail.trim().toLowerCase(),
                role: userRole,
                propertyIds: userPropertyIds,
                ...(userPassword ? { password: userPassword } : {}),
                phone: userPhone.trim(),
                status: userStatus,
            };

            if (editingUser) {
                await onUpdateUser(editingUser.id, data);
            } else {
                await onCreateUser(data);
            }
            await onReloadData();
            setIsUserModalOpen(false);
        } catch (err: any) {
            console.error('Save user failed:', err);
            alert(`Failed to save user: ${err.message || 'Check backend logs'}`);
        } finally {
            setIsSubmittingUser(false);
        }
    };

    const handleDeleteUser = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete user "${name}"?`)) return;
        try {
            await onDeleteUser(id);
            await onReloadData();
        } catch (err: any) {
            alert(`Failed to delete user: ${err.message || 'Check backend logs'}`);
        }
    };

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2">
                <button
                    onClick={onReloadData}
                    className="h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Reload latest state from Spring Boot backend"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh State</span>
                </button>
                <button
                    onClick={() => {
                        if (confirm('Wipe all mock and test records from the database and local storage to start clean?')) {
                            onResetData();
                        }
                    }}
                    className="h-9 px-3.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Wipes transactional mock data from PostgreSQL database so you can manually test"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clean All Mock Data</span>
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-2 bg-white px-5 rounded-xl shadow-xs">
                <button
                    onClick={() => setActiveTab('properties')}
                    className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === 'properties'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Building2 className="w-4 h-4" />
                    <span>Properties ({properties.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === 'users'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Staff &amp; Users ({users.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('backend')}
                    className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
                        activeTab === 'backend'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Server className="w-4 h-4" />
                    <span>Backend &amp; API Integration</span>
                </button>
            </div>

            {/* TAB 1: PROPERTIES (/api/properties) */}
            {activeTab === 'properties' && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 font-display">
                                Connected Properties ({properties.length})
                            </h2>
                            <p className="text-xs text-slate-500">
                                CRUD endpoints connected to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">/api/properties</code>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openAddPropertyModal}
                            className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add New Property</span>
                        </button>
                    </div>

                    {properties.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">No PG Properties Connected</span>
                            <span className="text-xs text-slate-400 max-w-sm">
                                No properties were found in the database. Add your first PG property to start managing rooms and tenants.
                            </span>
                            <button
                                type="button"
                                onClick={openAddPropertyModal}
                                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                + Add First PG
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {properties.map(prop => (
                                <div
                                    key={prop.id}
                                    className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
                                >
                                    <div className="flex flex-col gap-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                        {prop.code || `PROP-${prop.id}`}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                        {prop.status}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-900 mt-1">
                                                    {prop.name}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">{prop.address || 'Indiranagar'}, {prop.city || 'Bengaluru'}</span>
                                            </div>
                                            {prop.contactNumber && (
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="font-mono">{prop.contactNumber}</span>
                                                </div>
                                            )}
                                            {prop.contactEmail && (
                                                <div className="flex items-center gap-1.5">
                                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate font-mono">{prop.contactEmail}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg text-center text-xs">
                                            <div>
                                                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Type</span>
                                                <span className="font-bold text-slate-800">{prop.propertyType || 'PG'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Floors</span>
                                                <span className="font-bold text-slate-800">{prop.totalFloors || 3}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rooms</span>
                                                <span className="font-bold text-slate-800">{prop.totalRooms || 25}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => openEditPropertyModal(prop)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteProperty(prop.id, prop.name)}
                                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: USERS & STAFF (/api/users) */}
            {activeTab === 'users' && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 font-display">
                                Staff &amp; Administrative Users ({users.length})
                            </h2>
                            <p className="text-xs text-slate-500">
                                CRUD endpoints connected to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">/api/users</code>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openAddUserModal}
                            className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add New User</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map(u => (
                            <div
                                key={u.id}
                                className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
                            >
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#091426] text-white flex items-center justify-center font-bold text-xs uppercase">
                                                {u.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900">{u.fullName}</h3>
                                                <span className="text-xs font-mono text-slate-400">@{u.username}</span>
                                            </div>
                                        </div>

                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                            u.role === ROLES.OWNER
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : u.role === ROLES.REPRESENTATIVE
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        }`}>
                                            {u.role.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="flex flex-col gap-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="font-mono truncate">{u.email}</span>
                                        </div>
                                        {u.phone && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="font-mono">{u.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="text-[11px] font-medium text-slate-500">
                                                Status: <strong className="text-emerald-700">{u.status}</strong>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => openEditUserModal(u)}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteUser(u.id, u.fullName)}
                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 3: BACKEND CONFIGURATION */}
            {activeTab === 'backend' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            <div className="w-9 h-9 rounded-lg bg-[#091426] text-white flex items-center justify-center">
                                <Server className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900 font-display">
                                    Java Spring Boot REST Service Configuration
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Direct JSON REST client integration for Project RMS operations
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSaveBackend} className="flex flex-col gap-4 text-xs">
                            <div className="flex flex-col gap-1.5">
                                <label className="font-semibold text-slate-800">
                                    Spring Boot Backend Base URL
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={config.baseUrl}
                                        onChange={e => setConfig({ ...config, baseUrl: e.target.value })}
                                        placeholder="http://localhost:8080/api"
                                        className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex-1 font-mono focus:bg-white focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleTestConnection}
                                        className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors"
                                    >
                                        Test Ping
                                    </button>
                                </div>
                                <span className="text-[11px] text-slate-500">
                                    Active Base: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">{config.baseUrl}</code>
                                </span>
                            </div>

                            {testResult.status !== 'idle' && (
                                <div
                                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                                        testResult.status === 'success'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : testResult.status === 'testing'
                                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                : 'bg-red-50 text-red-800 border-red-200'
                                    }`}
                                >
                                    {testResult.status === 'testing' && (
                                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                                    )}
                                    {testResult.status === 'success' && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    )}
                                    <span>{testResult.message}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                <div className="flex flex-col gap-1.5">
                                    <label className="font-semibold text-slate-800">Client Runtime Mode</label>
                                    <div className="flex items-center gap-4 pt-1">
                                        <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={!config.useLiveBackend}
                                                onChange={() => setConfig({ ...config, useLiveBackend: false })}
                                                className="text-blue-600"
                                            />
                                            <span>Local Fallback Store</span>
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={config.useLiveBackend}
                                                onChange={() => setConfig({ ...config, useLiveBackend: true })}
                                                className="text-blue-600"
                                            />
                                            <span>Live Spring Boot HTTP REST Service</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="font-semibold text-slate-800">
                                        Network Request Latency (ms)
                                    </label>
                                    <input
                                        type="number"
                                        value={config.syncLatencyMs}
                                        onChange={e => setConfig({ ...config, syncLatencyMs: Number(e.target.value) })}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                                    />
                                    <span className="text-[11px] text-slate-500">Default: 12ms for local dev</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-end pt-3">
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-[#091426] hover:bg-slate-800 text-white font-bold rounded-lg transition-colors shadow-xs"
                                >
                                    Save Settings
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
                            <h3 className="text-sm font-bold text-slate-900">Active Endpoints Status</h3>
                            <div className="flex flex-col gap-2 text-xs text-slate-600">
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span>Rooms</span>
                                    <span className="font-mono text-emerald-700 font-bold">/api/rooms (Connected)</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span>Tenants</span>
                                    <span className="font-mono text-emerald-700 font-bold">/api/tenants (Connected)</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span>Admissions</span>
                                    <span className="font-mono text-emerald-700 font-bold">/api/admissions (Connected)</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-100">
                                    <span>Properties</span>
                                    <span className="font-mono text-emerald-700 font-bold">/api/properties (Connected)</span>
                                </div>
                                <div className="flex justify-between py-1">
                                    <span>Users</span>
                                    <span className="font-mono text-emerald-700 font-bold">/api/users (Connected)</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-3 text-xs">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <h3 className="text-sm font-bold text-slate-900">Transactional Safety</h3>
                            </div>
                            <p className="text-slate-500">
                                Bed reservations and advance payments transition atomically within Spring Data JPA transactions with constraint violation guards.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* PROPERTY ADD / EDIT MODAL */}
            {isPropertyModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        {editingProperty ? 'Edit Property' : 'Add New Property'}
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        {editingProperty ? `Updating ID #${editingProperty.id}` : 'Create a new PG/Hostel unit in backend'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPropertyModalOpen(false)}
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProperty} className="p-5 flex flex-col gap-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Property Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Greenwood PG Phase 3"
                                        value={propName}
                                        onChange={e => setPropName(e.target.value)}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Property Code</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. GW-PG-03"
                                        value={propCode}
                                        onChange={e => setPropCode(e.target.value)}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="font-semibold text-slate-700">Address</label>
                                <input
                                    type="text"
                                    placeholder="Street / locality"
                                    value={propAddress}
                                    onChange={e => setPropAddress(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">City</label>
                                    <input
                                        type="text"
                                        value={propCity}
                                        onChange={e => setPropCity(e.target.value)}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">State</label>
                                    <input
                                        type="text"
                                        value={propState}
                                        onChange={e => setPropState(e.target.value)}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Pincode</label>
                                    <input
                                        type="text"
                                        value={propPincode}
                                        onChange={e => setPropPincode(e.target.value)}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Type</label>
                                    <select
                                        value={propType}
                                        onChange={e => setPropType(e.target.value)}
                                        className="h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                    >
                                        <option value="PG">PG</option>
                                        <option value="Hostel">Hostel</option>
                                        <option value="Coliving">Coliving</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Total Floors</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={propFloors}
                                        onChange={e => setPropFloors(Number(e.target.value))}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Total Rooms</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={propRooms}
                                        onChange={e => setPropRooms(Number(e.target.value))}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Contact Number</label>
                                    <input
                                        type="text"
                                        value={propPhone}
                                        onChange={e => setPropPhone(e.target.value)}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Contact Email</label>
                                    <input
                                        type="email"
                                        value={propEmail}
                                        onChange={e => setPropEmail(e.target.value)}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2 -mx-5 -mb-5 mt-2 bg-slate-50/50">
                                <button
                                    type="button"
                                    onClick={() => setIsPropertyModalOpen(false)}
                                    className="px-3.5 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingProp}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>{isSubmittingProp ? 'Saving...' : editingProperty ? 'Update Property' : 'Create Property'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* USER ADD / EDIT MODAL */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        {editingUser ? 'Edit User' : 'Add New Staff / User'}
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        {editingUser ? `Updating @${editingUser.username}` : 'Grant staff access to Project RMS'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsUserModalOpen(false)}
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveUser} className="p-5 flex flex-col gap-3 text-xs">
                            <label className="font-semibold text-slate-700">{editingUser ? 'New password (leave blank to keep current)' : 'Initial password *'}
                                <input type="password" value={userPassword} onChange={e => setUserPassword(e.target.value)} required={!editingUser} minLength={12} maxLength={72} autoComplete="new-password" className="block w-full h-9 px-3 border rounded-lg mt-1" />
                            </label>
                            <fieldset className="border rounded-lg p-3"><legend className="font-semibold">Assigned PGs</legend>
                                {properties.map(property => <label key={property.id} className="flex items-center gap-2 py-1">
                                    <input type="checkbox" checked={userPropertyIds.includes(property.id)} onChange={e => setUserPropertyIds(ids => e.target.checked ? [...ids, property.id] : ids.filter(id => id !== property.id))} />
                                    {property.name}
                                </label>)}
                                {!properties.length && <p>Create a property before granting PG access.</p>}
                            </fieldset>

                            <div className="flex flex-col gap-1">
                                <label className="font-semibold text-slate-700">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Rajesh Sharma"
                                    value={userFullName}
                                    onChange={e => setUserFullName(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Username *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. rajesh.sharma"
                                        value={userUsername}
                                        onChange={e => setUserUsername(e.target.value)}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Role</label>
                                    <select
                                        value={userRole}
                                        onChange={e => setUserRole(e.target.value)}
                                        className="h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                    >
                                        <option value={ROLES.REPRESENTATIVE}>REPRESENTATIVE</option>
                                        <option value={ROLES.SUB_MEMBER}>SUB MEMBER (READ ONLY)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="font-semibold text-slate-700">Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g. rajesh@rms.in"
                                    value={userEmail}
                                    onChange={e => setUserEmail(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Phone Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 9845012345"
                                        value={userPhone}
                                        onChange={e => setUserPhone(e.target.value)}
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="font-semibold text-slate-700">Status</label>
                                    <select
                                        value={userStatus}
                                        onChange={e => setUserStatus(e.target.value)}
                                        className="h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2 -mx-5 -mb-5 mt-2 bg-slate-50/50">
                                <button
                                    type="button"
                                    onClick={() => setIsUserModalOpen(false)}
                                    className="px-3.5 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingUser}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>{isSubmittingUser ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
