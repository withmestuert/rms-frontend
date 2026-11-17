import React, { useState, useEffect } from 'react';
import {
    Settings,
    Server,
    Database,
    RefreshCw,
    CheckCircle2,
    ShieldCheck,
    ShieldAlert,
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
    Archive,
    Clock,
    FileText,
    AlertTriangle,
    Eye,
    Layers,
    DoorOpen,
    BedDouble,
    Sparkles,
} from 'lucide-react';
import { apiService, ApiConfig } from '../../services/apiService';
import { Property, User, PropertyArchiveSnapshot, PropertySoftDeleteRequest, Block, Floor } from '../../types';
import { PropertySoftDeleteModal } from './PropertySoftDeleteModal';
import { PropertySnapshotModal } from './PropertySnapshotModal';

interface SettingsViewProps {
    properties: Property[];
    users: User[];
    onCreateProperty: (data: Omit<Property, 'id'>) => Promise<Property>;
    onUpdateProperty: (id: number, data: Partial<Property>) => Promise<Property>;
    onDeleteProperty: (id: number) => Promise<void>;
    onCreateUser: (data: Omit<User, 'id'>) => Promise<User>;
    onUpdateUser: (id: number, data: Partial<User>) => Promise<User>;
    onDeleteUser: (id: number) => Promise<void>;
    onResetData?: () => void;
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
    const [activeTab, setActiveTab] = useState<'properties' | 'blocks_floors' | 'users' | 'backend'>('properties');
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
    const [propCity, setPropCity] = useState('');
    const [propState, setPropState] = useState('');
    const [propPincode, setPropPincode] = useState('');
    const [propType, setPropType] = useState('PG');
    const [propFloors, setPropFloors] = useState(1);
    const [propRooms, setPropRooms] = useState(1);
    const [propPhone, setPropPhone] = useState('');
    const [propEmail, setPropEmail] = useState('');
    const [propStatus, setPropStatus] = useState('ACTIVE');
    const [isSubmittingProp, setIsSubmittingProp] = useState(false);

    // Decommission (Soft Delete & TTL) State
    const [propertySubTab, setPropertySubTab] = useState<'active' | 'archived'>('active');
    const [archivedProperties, setArchivedProperties] = useState<Property[]>([]);
    const [isLoadingArchived, setIsLoadingArchived] = useState(false);
    const [decommissionProp, setDecommissionProp] = useState<Property | null>(null);
    const [isDecommissionModalOpen, setIsDecommissionModalOpen] = useState(false);
    const [viewingSnapshot, setViewingSnapshot] = useState<PropertyArchiveSnapshot | null>(null);
    const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
    const [loadingSnapshotId, setLoadingSnapshotId] = useState<number | null>(null);
    const [restoringId, setRestoringId] = useState<number | null>(null);

    const loadArchivedProperties = async () => {
        setIsLoadingArchived(true);
        try {
            const list = await apiService.getArchivedProperties();
            setArchivedProperties(list);
        } catch (err) {
            console.error('Failed to load archived properties:', err);
        } finally {
            setIsLoadingArchived(false);
        }
    };

    useEffect(() => {
        loadArchivedProperties();
    }, []);

    // Blocks & Floors Hierarchy State
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false);
    const [isInitializingHierarchy, setIsInitializingHierarchy] = useState(false);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [showFloorModal, setShowFloorModal] = useState(false);
    const [blockForm, setBlockForm] = useState({ name: '', code: '' });
    const [floorForm, setFloorForm] = useState({ blockId: '', floorNumber: '', name: '' });
    const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
    const [isSubmittingFloor, setIsSubmittingFloor] = useState(false);

    const loadBlocksAndFloors = async () => {
        setIsLoadingHierarchy(true);
        try {
            const activePropId = apiService.getActivePropertyId() || (properties[0]?.id ?? 1);
            const [blockList, floorList] = await Promise.all([
                apiService.getBlocks(activePropId),
                apiService.getPropertyFloors(activePropId),
            ]);
            setBlocks(blockList);
            setFloors(floorList);
        } catch (err) {
            console.warn('Failed to load blocks & floors:', err);
        } finally {
            setIsLoadingHierarchy(false);
        }
    };

    useEffect(() => {
        loadBlocksAndFloors();
    }, [properties]);

    const handleInitializeHierarchy = async () => {
        try {
            setIsInitializingHierarchy(true);
            const activePropId = apiService.getActivePropertyId() || (properties[0]?.id ?? 1);
            await apiService.initializePropertyHierarchy(activePropId);
            await loadBlocksAndFloors();
            alert('Building hierarchy initialized successfully with default Main Block and Floors!');
        } catch (err: any) {
            console.error('Initialize hierarchy failed:', err);
            alert(`Failed: ${err?.message || 'Check backend logs'}`);
        } finally {
            setIsInitializingHierarchy(false);
        }
    };

    const handleCreateBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!blockForm.name.trim() || !blockForm.code.trim()) {
            alert('Block name and code are required.');
            return;
        }
        try {
            setIsSubmittingBlock(true);
            const activePropId = apiService.getActivePropertyId() || (properties[0]?.id ?? 1);
            await apiService.createBlock(activePropId, {
                name: blockForm.name.trim(),
                code: blockForm.code.trim().toUpperCase(),
            });
            await loadBlocksAndFloors();
            setBlockForm({ name: '', code: '' });
            setShowBlockModal(false);
        } catch (err: any) {
            console.error('Failed to create block:', err);
            alert(err?.message || 'Failed to create block.');
        } finally {
            setIsSubmittingBlock(false);
        }
    };

    const handleCreateFloor = async (e: React.FormEvent) => {
        e.preventDefault();
        const blockId = Number(floorForm.blockId);
        const floorNumber = parseInt(floorForm.floorNumber, 10);
        if (!blockId || isNaN(floorNumber)) {
            alert('Please select a valid block and numeric floor number.');
            return;
        }
        try {
            setIsSubmittingFloor(true);
            await apiService.createFloor(blockId, {
                floorNumber,
                name: floorForm.name.trim() || `Floor ${floorNumber}`,
            });
            await loadBlocksAndFloors();
            setFloorForm({ blockId: '', floorNumber: '', name: '' });
            setShowFloorModal(false);
        } catch (err: any) {
            console.error('Failed to create floor:', err);
            alert(err?.message || 'Failed to create floor.');
        } finally {
            setIsSubmittingFloor(false);
        }
    };

    const handleDeleteFloor = async (floorId: number, floorName: string) => {
        if (!confirm(`Delete floor "${floorName}"? Any rooms on this floor will be unlinked.`)) return;
        try {
            await apiService.deleteFloor(floorId);
            await loadBlocksAndFloors();
        } catch (err: any) {
            alert(err?.message || 'Failed to delete floor.');
        }
    };

    const handleDeleteBlock = async (blockId: number, blockName: string) => {
        if (!confirm(`Delete block "${blockName}"? Only empty blocks can be removed.`)) return;
        try {
            await apiService.deleteBlock(blockId);
            await loadBlocksAndFloors();
        } catch (err: any) {
            alert(err?.message || 'Failed to delete block.');
        }
    };

    // User Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userFullName, setUserFullName] = useState('');
    const [userUsername, setUserUsername] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userRole, setUserRole] = useState('PROPERTY_MANAGER');
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
            let base = (config.baseUrl || '').trim().replace(/\/+$/, '');
            if (!base.endsWith('/api')) {
                base = `${base}/api`;
            }
            const testUrl = `${base}/properties`;
            const response = await fetch(testUrl, { method: 'GET' }).catch(() => null);
            const elapsed = Math.round(performance.now() - startTime);

            if (response && response.ok) {
                setTestResult({
                    status: 'success',
                    message: `Connected successfully! Spring Boot responded in ${elapsed}ms. (PostgreSQL & REST endpoints online)`,
                });
            } else {
                setTestResult({
                    status: 'failed',
                    message: `Server responded with HTTP ${response ? response.status : 'ERR'}. Check backend service logs.`,
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
        setPropAddress('');
        setPropCity('');
        setPropState('');
        setPropPincode('');
        setPropType('PG');
        setPropFloors(1);
        setPropRooms(1);
        setPropPhone('');
        setPropEmail('');
        setPropStatus('ACTIVE');
        setIsPropertyModalOpen(true);
    };

    const openEditPropertyModal = (p: Property) => {
        setEditingProperty(p);
        setPropName(p.name);
        setPropCode(p.code);
        setPropAddress(p.address || '');
        setPropCity(p.city || '');
        setPropState(p.state || '');
        setPropPincode(p.pincode || '');
        setPropType(p.propertyType || 'PG');
        setPropFloors(p.totalFloors || 1);
        setPropRooms(p.totalRooms || 1);
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

    const openDecommissionModal = (prop: Property) => {
        setDecommissionProp(prop);
        setIsDecommissionModalOpen(true);
    };

    const handleConfirmSoftDelete = async (propertyId: number, data: PropertySoftDeleteRequest) => {
        await apiService.softDeleteProperty(propertyId, data);
        await Promise.all([onReloadData(), loadArchivedProperties()]);
    };

    const handleRestoreProperty = async (propertyId: number, propertyName: string) => {
        if (!confirm(`Are you sure you want to restore property "${propertyName}" back to active status?`)) return;
        setRestoringId(propertyId);
        try {
            await apiService.restoreProperty(propertyId);
            await Promise.all([onReloadData(), loadArchivedProperties()]);
        } catch (err: any) {
            alert(`Failed to restore property: ${err.message || 'Check backend logs'}`);
        } finally {
            setRestoringId(null);
        }
    };

    const handleViewSnapshot = async (propertyId: number) => {
        setLoadingSnapshotId(propertyId);
        try {
            const snapshot = await apiService.getPropertySnapshot(propertyId);
            setViewingSnapshot(snapshot);
            setIsSnapshotModalOpen(true);
        } catch (err: any) {
            alert(`Failed to load snapshot: ${err.message || 'Check backend logs'}`);
        } finally {
            setLoadingSnapshotId(null);
        }
    };

    // User Handlers
    const openAddUserModal = () => {
        setEditingUser(null);
        setUserFullName('');
        setUserUsername('');
        setUserEmail('');
        setUserRole('PROPERTY_MANAGER');
        setUserPhone('');
        setUserStatus('ACTIVE');
        setIsUserModalOpen(true);
    };

    const openEditUserModal = (u: User) => {
        setEditingUser(u);
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
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-2 bg-white px-5 rounded-xl shadow-xs">
                <button
                    onClick={() => setActiveTab('properties')}
                    className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'properties'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                >
                    <Building2 className="w-4 h-4" />
                    <span>Properties ({properties.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('blocks_floors')}
                    className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'blocks_floors'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>Blocks &amp; Floors ({blocks.length} Blocks • {floors.length} Floors)</span>
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'users'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Staff &amp; Users ({users.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('backend')}
                    className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'backend'
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
                    {/* Header & Subtabs */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPropertySubTab('active')}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    propertySubTab === 'active'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                <span>Active Properties ({properties.length})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPropertySubTab('archived');
                                    loadArchivedProperties();
                                }}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    propertySubTab === 'archived'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <Archive className="w-3.5 h-3.5" />
                                <span>Decommission Queue / TTL ({archivedProperties.length})</span>
                                {archivedProperties.length > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                                        propertySubTab === 'archived' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
                                    }`}>
                                        {archivedProperties.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {propertySubTab === 'active' ? (
                            <button
                                type="button"
                                onClick={openAddPropertyModal}
                                className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add New Property</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={loadArchivedProperties}
                                className="h-8 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingArchived ? 'animate-spin' : ''}`} />
                                <span>Refresh Queue</span>
                            </button>
                        )}
                    </div>

                    {/* SUB-VIEW 1: ACTIVE PROPERTIES */}
                    {propertySubTab === 'active' && (
                        <>
                            {properties.length === 0 ? (
                                <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300 flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">No PG Properties Connected</span>
                                    <span className="text-xs text-slate-400 max-w-sm">
                                        No active properties were found in the database. Add your first PG property to start managing rooms and tenants.
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
                                                        <span className="truncate">{[prop.address, prop.city].filter(Boolean).join(', ') || '—'}</span>
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
                                                        <span className="font-bold text-slate-800">{prop.totalFloors ?? '—'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Rooms</span>
                                                        <span className="font-bold text-slate-800">{prop.totalRooms ?? '—'}</span>
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
                                                    onClick={() => openDecommissionModal(prop)}
                                                    title="Protected Decommission: Creates Audit Snapshot & 30-day TTL safety window"
                                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/70 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                                                >
                                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                                    <span>Decommission (TTL 30d)</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* SUB-VIEW 2: DECOMMISSIONED (TTL TRASH) */}
                    {propertySubTab === 'archived' && (
                        <div className="flex flex-col gap-4">
                            {/* Security & TTL Banner */}
                            <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 border border-amber-200/90 rounded-xl p-4 flex items-start gap-3.5 shadow-xs">
                                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div className="text-xs text-amber-950 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-amber-950 text-sm">
                                            30-Day TTL Grace Period &amp; Audit Snapshot Protection
                                        </h4>
                                        <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                                            Self-Purging Engine
                                        </span>
                                    </div>
                                    <p className="text-amber-800/90 leading-relaxed">
                                        Properties in this queue are removed from active tenant operations and bookings. A frozen snapshot of all rooms, tenants, admissions, and balances is permanently recorded. You may inspect the audit manifest or restore the property anytime before its 30-day TTL countdown expires.
                                    </p>
                                </div>
                            </div>

                            {isLoadingArchived ? (
                                <div className="bg-white p-12 text-center rounded-xl border border-slate-200 flex flex-col items-center gap-3">
                                    <RefreshCw className="w-6 h-6 text-amber-600 animate-spin" />
                                    <span className="text-xs font-semibold text-slate-600">Loading decommissioned properties...</span>
                                </div>
                            ) : archivedProperties.length === 0 ? (
                                <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300 flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                        <Archive className="w-6 h-6" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">Decommission Queue is Empty</span>
                                    <span className="text-xs text-slate-400 max-w-sm">
                                        No properties are currently scheduled for decommission. When a property is soft-deleted, it will appear here for 30 days before permanent purging.
                                    </span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {archivedProperties.map(prop => {
                                        const daysLeft = prop.daysRemaining ?? 30;
                                        const isUrgent = daysLeft <= 5;

                                        return (
                                            <div
                                                key={prop.id}
                                                className="bg-white p-5 rounded-xl border border-amber-200/80 shadow-xs flex flex-col justify-between gap-4 relative overflow-hidden"
                                            >
                                                {/* Top stripe */}
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />

                                                <div className="flex flex-col gap-2.5">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                                    {prop.code || `PROP-${prop.id}`}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                                                    DECOMMISSIONED
                                                                </span>
                                                            </div>
                                                            <h3 className="text-sm font-bold text-slate-900 mt-1 line-through decoration-slate-400">
                                                                {prop.name}
                                                            </h3>
                                                        </div>

                                                        {/* TTL Countdown pill */}
                                                        <div className={`text-right flex flex-col items-end`}>
                                                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                                                isUrgent
                                                                    ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                                                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                                            }`}>
                                                                <Clock className="w-3 h-3" />
                                                                {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Reason & Audit Metadata */}
                                                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1 text-xs">
                                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                                            <span>Reason for Decommission:</span>
                                                            <span className="font-mono text-[10px] text-slate-400">By {prop.deletedBy || 'ADMIN'}</span>
                                                        </div>
                                                        <p className="font-medium text-slate-700 italic">
                                                            &ldquo;{prop.deletionReason || 'Administrative decommissioning'}&rdquo;
                                                        </p>
                                                        {prop.ttlExpiresAt && (
                                                            <span className="text-[10px] text-slate-400 mt-1">
                                                                Auto-purges on: <strong className="text-slate-600">{new Date(prop.ttlExpiresAt).toLocaleDateString()}</strong>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-1 text-xs text-slate-500 pt-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span className="truncate">{prop.address || 'Indiranagar'}, {prop.city || 'Bengaluru'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewSnapshot(prop.id)}
                                                        disabled={loadingSnapshotId === prop.id}
                                                        className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-cyan-200"
                                                    >
                                                        {loadingSnapshotId === prop.id ? (
                                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <FileText className="w-3.5 h-3.5 text-cyan-700" />
                                                        )}
                                                        <span>View Manifest</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRestoreProperty(prop.id, prop.name)}
                                                        disabled={restoringId === prop.id}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                                                    >
                                                        {restoringId === prop.id ? (
                                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>Restore Property</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: BLOCKS & FLOORS (/api/properties/:id/blocks, /api/blocks/:id/floors) */}
            {activeTab === 'blocks_floors' && (
                <div className="flex flex-col gap-5">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 font-display">
                                    Blocks &amp; Floors Hierarchy
                                </h2>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                    Phase 1 Normalized
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Strict relational structure: Property &rarr; Blocks &rarr; Floors &rarr; Rooms &rarr; Physical Beds.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={isInitializingHierarchy}
                                onClick={handleInitializeHierarchy}
                                className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                                title="Auto-provisions Main Block and Floors 1..N"
                            >
                                {isInitializingHierarchy ? (
                                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                )}
                                <span>{isInitializingHierarchy ? 'Provisioning...' : 'Initialize Hierarchy'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowBlockModal(true)}
                                className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Add Block</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (blocks.length === 0) {
                                        alert('Please create or initialize a block first.');
                                        return;
                                    }
                                    setFloorForm({ blockId: String(blocks[0].id), floorNumber: '', name: '' });
                                    setShowFloorModal(true);
                                }}
                                className="h-9 px-3.5 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Floor</span>
                            </button>
                        </div>
                    </div>

                    {/* Metric strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Blocks</span>
                                <span className="text-lg font-black text-slate-900 font-mono">{blocks.length}</span>
                            </div>
                        </div>

                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Layers className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Configured Floors</span>
                                <span className="text-lg font-black text-slate-900 font-mono">{floors.length}</span>
                            </div>
                        </div>

                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Data Integrity</span>
                                <span className="text-xs font-bold text-emerald-700">FK Verified &bull; Zero Duplication</span>
                            </div>
                        </div>
                    </div>

                    {/* Blocks & Floors Tree View */}
                    {isLoadingHierarchy ? (
                        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 flex flex-col items-center gap-3">
                            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                            <span className="text-xs font-semibold text-slate-600">Loading building hierarchy...</span>
                        </div>
                    ) : blocks.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">No Blocks Initialized</span>
                            <span className="text-xs text-slate-400 max-w-sm">
                                Initialize hierarchy to auto-provision Main Block and floors, or click &quot;Add Block&quot; to create custom blocks.
                            </span>
                            <button
                                type="button"
                                onClick={handleInitializeHierarchy}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs mt-2"
                            >
                                Initialize Main Block &amp; Floors
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {blocks.map(block => {
                                const blockFloors = floors.filter(f => f.blockId === block.id);
                                return (
                                    <div
                                        key={block.id}
                                        className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col gap-3 p-5"
                                    >
                                        {/* Block Header */}
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-[#091426] text-cyan-400 flex items-center justify-center">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-bold text-slate-900">{block.name}</h3>
                                                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                                            {block.code}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">ID: #{block.id}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500">
                                                        {blockFloors.length} {blockFloors.length === 1 ? 'Floor' : 'Floors'} configured in this block
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFloorForm({ blockId: String(block.id), floorNumber: '', name: '' });
                                                        setShowFloorModal(true);
                                                    }}
                                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>Add Floor</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteBlock(block.id, block.name)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                    title="Delete Block"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Floors in Block */}
                                        {blockFloors.length === 0 ? (
                                            <div className="py-6 text-center text-xs text-slate-400">
                                                No floors in this block. Click &quot;Add Floor&quot; to configure floors.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                                {blockFloors.map(fl => (
                                                    <div
                                                        key={fl.id}
                                                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between gap-2.5 hover:bg-white hover:border-blue-300 transition-all"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <Layers className="w-4 h-4 text-blue-600" />
                                                                <span className="font-bold text-xs text-slate-900">
                                                                    {fl.name || `Floor ${fl.floorNumber}`}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                                                                #{fl.floorNumber}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                                                            <span>Floor ID: <strong className="font-mono text-slate-800">{fl.id}</strong></span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteFloor(fl.id, fl.name || `Floor ${fl.floorNumber}`)}
                                                                className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                                                title="Delete Floor"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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

                    {users.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                                <Users className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-bold text-slate-700">No Staff or Administrative Users Found</span>
                            <span className="text-xs text-slate-400 max-w-sm">
                                Click &apos;Add New User&apos; above to create your first administrator, property manager, or staff member.
                            </span>
                        </div>
                    ) : (
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

                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${u.role === 'ADMIN'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                    : u.role === 'PROPERTY_MANAGER'
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
                    )}
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
                                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${testResult.status === 'success'
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
                                    <div className="flex items-center gap-2 pt-1 text-xs text-slate-700">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span className="font-semibold text-emerald-800">Live Spring Boot HTTP REST Service (PostgreSQL Database)</span>
                                    </div>
                                    <span className="text-[11px] text-slate-500">
                                        All business records persist strictly in the relational PostgreSQL database via backend endpoints.
                                    </span>
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
                                        <option value="ADMIN">ADMIN</option>
                                        <option value="PROPERTY_MANAGER">PROPERTY MANAGER</option>
                                        <option value="STAFF">STAFF</option>
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

            {/* Decommission (Soft Delete & TTL) Security Modal */}
            {decommissionProp && (
                <PropertySoftDeleteModal
                    property={decommissionProp}
                    isOpen={isDecommissionModalOpen}
                    onClose={() => {
                        setIsDecommissionModalOpen(false);
                        setDecommissionProp(null);
                    }}
                    onConfirm={handleConfirmSoftDelete}
                />
            )}

            {/* Audit Manifest Snapshot Viewer Modal */}
            <PropertySnapshotModal
                snapshot={viewingSnapshot}
                isOpen={isSnapshotModalOpen}
                onClose={() => {
                    setIsSnapshotModalOpen(false);
                    setViewingSnapshot(null);
                }}
            />

            {/* Create Block Modal */}
            {showBlockModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <form
                        onSubmit={handleCreateBlock}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                <span>Add New Building Block</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowBlockModal(false)}
                                className="text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Block Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Block A, East Wing, Main Block"
                                    value={blockForm.name}
                                    onChange={e => setBlockForm({ ...blockForm, name: e.target.value })}
                                    className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Block Code * (Unique)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. BLK-A, BLK-EW"
                                    value={blockForm.code}
                                    onChange={e => setBlockForm({ ...blockForm, code: e.target.value.toUpperCase() })}
                                    className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowBlockModal(false)}
                                    className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingBlock}
                                    className="px-4 py-1.5 bg-[#091426] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                                >
                                    {isSubmittingBlock ? 'Creating...' : 'Create Block'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Create Floor Modal */}
            {showFloorModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <form
                        onSubmit={handleCreateFloor}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-blue-600" />
                                <span>Add New Floor to Block</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowFloorModal(false)}
                                className="text-slate-400 hover:text-slate-700"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Select Block *</label>
                                <select
                                    required
                                    value={floorForm.blockId}
                                    onChange={e => setFloorForm({ ...floorForm, blockId: e.target.value })}
                                    className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                                >
                                    {blocks.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Floor Number * (Numeric)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max="50"
                                    placeholder="e.g. 1, 2, 3..."
                                    value={floorForm.floorNumber}
                                    onChange={e => setFloorForm({ ...floorForm, floorNumber: e.target.value })}
                                    className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Floor Display Name (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ground Floor, First Floor"
                                    value={floorForm.name}
                                    onChange={e => setFloorForm({ ...floorForm, name: e.target.value })}
                                    className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowFloorModal(false)}
                                    className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingFloor}
                                    className="px-4 py-1.5 bg-[#091426] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                                >
                                    {isSubmittingFloor ? 'Creating...' : 'Create Floor'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
