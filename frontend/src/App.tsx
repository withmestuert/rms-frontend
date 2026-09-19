import { authSession } from './auth/session';
import { ROLES } from './config/constants';
import React, { useState, useEffect } from 'react';
import { PageId, CriticalAction, Tenant, Admission, Room, Transaction, Invoice, Property, User } from './types';
import { apiService } from './services/apiService';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { TenantsView } from './components/tenants/TenantsView';
import { AdmissionsView } from './components/admissions/AdmissionsView';
import { RoomsView } from './components/rooms/RoomsView';
import { RentBillingView } from './components/finance/RentBillingView';
import { LedgerView } from './components/finance/LedgerView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { TenantPaymentHistoryView } from './components/tenants/TenantPaymentHistoryView';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

export function App() {
    const navigate = useNavigate();

    // React Router is the single source of navigation state.
    // Existing feature components can continue using PageId callbacks.
    const handleNavigate = (page: PageId) => {
        const routes: Record<PageId, string> = {
            dashboard: '/dashboard',
            tenants: '/tenants',
            admissions: '/admissions',
            rooms: '/rooms',
            'rent-and-billing': '/rent-and-billing',
            ledger: '/ledger',
            reports: '/reports',
            settings: '/settings',
            'payment-history': '/payment-history',
        };

        navigate(routes[page]);
    };

    const [selectedPaymentTenant, setSelectedPaymentTenant] = useState<Tenant | null>(null);
    const [criticalActions, setCriticalActions] = useState<CriticalAction[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [admissions, setAdmissions] = useState<Admission[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(apiService.getActivePropertyId());
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [backendError, setBackendError] = useState<string | null>(null);

    // Load initial data from apiService
    const loadData = async (propIdParam?: number | null) => {
        try {
            setBackendError(null);
            const propertiesData = await apiService.getProperties();
            setProperties(propertiesData);

            let effectivePropId = propIdParam !== undefined ? propIdParam : selectedPropertyId;
            if (effectivePropId == null && propertiesData.length > 0) {
                effectivePropId = propertiesData[0].id;
            } else if (effectivePropId != null && !propertiesData.some(p => p.id === effectivePropId)) {
                effectivePropId = propertiesData.length > 0 ? propertiesData[0].id : null;
            }

            apiService.setActivePropertyId(effectivePropId);
            setSelectedPropertyId(effectivePropId);

            const [actionsData, tenantsData, admissionsData, roomsData, txData, invoicesData, usersData] =
                await Promise.all([
                    apiService.getCriticalActions(),
                    apiService.getTenants(effectivePropId ?? undefined),
                    apiService.getAdmissions(effectivePropId ?? undefined),
                    apiService.getRooms(effectivePropId ?? undefined),
                    apiService.getTransactions(undefined, effectivePropId ?? undefined),
                    apiService.getInvoices(undefined, undefined, effectivePropId ?? undefined),
                    [ROLES.OWNER, ROLES.TEST_BYPASS].includes(authSession.principal()?.role as any) ? apiService.getUsers() : Promise.resolve([]),
                ]);

            setCriticalActions(actionsData);
            setTenants(tenantsData);
            setAdmissions(admissionsData);
            setRooms(roomsData);
            setTransactions(txData);
            setInvoices(invoicesData);
            setUsers(usersData);
        } catch (err: any) {
            console.error('Error loading RMS state:', err);
            setBackendError(err?.message || 'Failed to fetch from backend server');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSelectProperty = async (property: Property) => {
        apiService.setActivePropertyId(property.id);
        setSelectedPropertyId(property.id);
        await loadData(property.id);
    };

    const handleActionDismiss = async (id: string) => {
        await apiService.dismissCriticalAction(id);
        setCriticalActions(prev => prev.filter(a => a.id !== id));
    };

    const handleAddTenant = async (tenantData: Omit<Tenant, 'id'>) => {
        const created = await apiService.addTenant(tenantData);
        setTenants(prev => [created, ...prev]);
        const updatedRooms = await apiService.getRooms(selectedPropertyId ?? undefined);
        setRooms(updatedRooms);
    };

    const handleCreateAdmission = async (
        admData: Omit<Admission, 'id' | 'allocatedAt'>
    ) => {
        try {
            const created = await apiService.createAdmission(admData);

            setAdmissions(prev => [created, ...prev]);

            const [updatedRooms, updatedTenants] =
                await Promise.all([
                    apiService.getRooms(selectedPropertyId ?? undefined),
                    apiService.getTenants(selectedPropertyId ?? undefined),
                ]);

            setRooms(updatedRooms);
            setTenants(updatedTenants);
        } catch (err) {
            console.error('Failed to create admission:', err);
            throw err;
        }
    };

    const handleCreateRoom = async (roomData: {
        roomNo: string;
        floor: string;
        roomType: string;
        rentPerMonth: number;
        occupancy: number;
        available: boolean;
    }) => {
        await apiService.createRoom(roomData);

        const updatedRooms =
            await apiService.getRooms(selectedPropertyId ?? undefined);

        setRooms(updatedRooms);
    };

    const handleUpdateRoom = async (
        roomNumber: string,
        roomData: {
            floor: string;
            roomType: string;
            rentPerMonth: number;
            occupancy: number;
            available: boolean;
        }
    ) => {
        await apiService.updateRoom(
            roomNumber,
            roomData
        );

        const updatedRooms =
            await apiService.getRooms();

        setRooms(updatedRooms);
    };


    const handleConfirmAdmission = async (admissionNumber: string) => {
        await apiService.confirmAdmission(admissionNumber);
        const [updatedAdmissions, updatedRooms, updatedTenants] = await Promise.all([
            apiService.getAdmissions(),
            apiService.getRooms(),
            apiService.getTenants(),
        ]);
        setAdmissions(updatedAdmissions);
        setRooms(updatedRooms);
        setTenants(updatedTenants);
    };

    const handleCancelAdmission = async (admissionNumber: string) => {
        await apiService.cancelAdmission(admissionNumber);
        const [updatedAdmissions, updatedRooms, updatedTenants] = await Promise.all([
            apiService.getAdmissions(),
            apiService.getRooms(),
            apiService.getTenants(),
        ]);
        setAdmissions(updatedAdmissions);
        setRooms(updatedRooms);
        setTenants(updatedTenants);
    };

    const handleDeleteTenant = async (uid: string) => {
        await apiService.deleteTenant(uid);
        const [updatedTenants, updatedRooms] = await Promise.all([
            apiService.getTenants(),
            apiService.getRooms(),
        ]);
        setTenants(updatedTenants);
        setRooms(updatedRooms);
    };

    const handleVerifyTenantAdvance = async (uid: string, amount?: number) => {
        await apiService.verifyTenantAdvance(uid, amount);
        const [updatedTenants, updatedAdmissions, updatedRooms] = await Promise.all([
            apiService.getTenants(),
            apiService.getAdmissions(),
            apiService.getRooms(),
        ]);
        setTenants(updatedTenants);
        setAdmissions(updatedAdmissions);
        setRooms(updatedRooms);
    };

    const handleUpdateTenant = async (uid: string, tenantData: Partial<Tenant>): Promise<Tenant> => {
        const updated = await apiService.updateTenant(uid, tenantData);
        setTenants(prev => prev.map(t => (t.id === uid ? updated : t)));
        setAdmissions(prev =>
            prev.map(a => {
                if (a.phone === updated.phone || a.residentName?.toLowerCase() === updated.name?.toLowerCase()) {
                    return {
                        ...a,
                        residentName: updated.name,
                        phone: updated.phone,
                        roomNumber: updated.roomNumber,
                        monthlyRent: updated.monthlyRent,
                    };
                }
                return a;
            })
        );
        return updated;
    };

    const handleCreateProperty = async (data: Omit<Property, 'id'>): Promise<Property> => {
        const created = await apiService.createProperty(data);
        setProperties(prev => [...prev, created]);
        if (selectedPropertyId == null) {
            apiService.setActivePropertyId(created.id);
            setSelectedPropertyId(created.id);
            await loadData(created.id);
        }
        return created;
    };

    const handleUpdateProperty = async (id: number, data: Partial<Property>): Promise<Property> => {
        const updated = await apiService.updateProperty(id, data);
        setProperties(prev => prev.map(p => (p.id === id ? updated : p)));
        return updated;
    };

    const handleDeleteProperty = async (id: number): Promise<void> => {
        await apiService.deleteProperty(id);
        setProperties(prev => prev.filter(p => p.id !== id));
        if (selectedPropertyId === id) {
            const remaining = properties.filter(p => p.id !== id);
            const nextId = remaining.length > 0 ? remaining[0].id : null;
            apiService.setActivePropertyId(nextId);
            setSelectedPropertyId(nextId);
            await loadData(nextId);
        }
    };

    const handleCreateUser = async (data: Omit<User, 'id'>): Promise<User> => {
        const created = await apiService.createUser(data);
        setUsers(prev => [...prev, created]);
        return created;
    };

    const handleUpdateUser = async (id: number, data: Partial<User>): Promise<User> => {
        const updated = await apiService.updateUser(id, data);
        setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
        return updated;
    };

    const handleDeleteUser = async (id: number): Promise<void> => {
        await apiService.deleteUser(id);
        setUsers(prev => prev.filter(u => u.id !== id));
    };

    const handleDeleteRoom = async (
        roomNumber: string
    ) => {
        try {
            await apiService.deleteRoom(roomNumber);
            const updatedRooms = await apiService.getRooms();
            setRooms(updatedRooms);
        } catch (error: any) {
            console.error('Failed to delete room:', error);
            const msg = error?.message || 'Failed to delete room';
            alert(`Unable to delete Room ${roomNumber}:\n${msg}`);
            throw error;
        }
    };

    const handleAllocateRoom = async (roomNumber: string, tenantName: string) => {
        const updatedRoom = await apiService.allocateRoom(roomNumber, tenantName);
        setRooms(prev => prev.map(r => (r.roomNumber === roomNumber ? updatedRoom : r)));

        // Create corresponding admission and tenant
        const newAdmission: Omit<Admission, 'id' | 'allocatedAt'> = {
            residentName: tenantName,
            phone: '+91 98000 00000',
            email: `${tenantName.toLowerCase().replace(/\s+/g, '')}@example.com`,
            roomNumber,
            monthlyRent: updatedRoom.rent,
            moveInDate: new Date().toISOString().split('T')[0],
            hometown: 'Bangalore',
            profession: 'Software Engineer',
            category: 'working',
            status: 'confirmed',
        };
        const createdAdm = await apiService.createAdmission(newAdmission);
        setAdmissions(prev => [createdAdm, ...prev]);

        const createdTenant = await apiService.addTenant({
            name: tenantName,
            phone: '+91 98000 00000',
            email: `${tenantName.toLowerCase().replace(/\s+/g, '')}@example.com`,
            roomNumber,
            monthlyRent: updatedRoom.rent,
            joinedDate: new Date().toISOString().split('T')[0],
            hometown: 'Bangalore',
            profession: 'Software Engineer',
            category: 'working',
            paymentStatus: 'verified',
            status: 'confirmed',
        });
        setTenants(prev => [createdTenant, ...prev]);
    };

    const handleRecordPayment = async (invoiceId: string, paymentMode: string, transactionRef?: string) => {
        await apiService.recordPayment(invoiceId, paymentMode, transactionRef);
        const updatedInvoices = await apiService.getInvoices();
        const updatedTxs = await apiService.getTransactions();
        setInvoices(updatedInvoices);
        setTransactions(updatedTxs);
    };

    const handleGenerateCycleInvoices = async (monthYear: string, dueDate: string) => {
        const result = await apiService.generateCycleInvoices(monthYear, dueDate);
        const updatedInvoices = await apiService.getInvoices();
        setInvoices(updatedInvoices);
        return result;
    };

    const handleResetData = async () => {
        try {
            await apiService.cleanDatabase();
            await loadData();
            alert('Project RMS data wiped cleanly from database and local storage.');
        } catch {
            apiService.resetAllData();
            await loadData();
            alert('Local storage data reset.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center font-mono text-xs text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></div>
                    <span>Initializing Project RMS Application Shell...</span>
                </div>
            </div>
        );
    }

    return (
        <AppShell
            onQuickAdmission={() => handleNavigate('admissions')}
            properties={properties}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={handleSelectProperty}
        >
            {backendError && (
                <div className="mb-4 bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 text-xs text-amber-900 flex items-center justify-between shadow-xs animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-800">Backend Server Offline:</span>
                        <span>Cannot reach REST API at <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono font-semibold">{apiService.getConfig().baseUrl}</code>. Please start the Spring Boot server (<code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono">.\mvnw spring-boot:run</code>).</span>
                    </div>
                    <button
                        onClick={() => loadData()}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-[11px] shrink-0 ml-3"
                    >
                        Retry Connection
                    </button>
                </div>
            )}
            <Routes>
                <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                />

                <Route
                    path="/dashboard"
                    element={
                        <DashboardView
                            rooms={rooms}
                            admissions={admissions}
                            tenants={tenants}
                            invoices={invoices}
                            criticalActions={criticalActions}
                            onActionDismiss={handleActionDismiss}
                            onNavigate={handleNavigate}
                            onQuickAdmission={() => handleNavigate('admissions')}
                            onRecordPayment={handleRecordPayment}
                        />
                    }
                />

                <Route
                    path="/tenants"
                    element={
                        <TenantsView
                            tenants={tenants}
                            onAddTenant={handleAddTenant}
                            onUpdateTenant={handleUpdateTenant}
                            onDeleteTenant={handleDeleteTenant}
                            onVerifyAdvance={handleVerifyTenantAdvance}
                            onNavigate={handleNavigate}
                            onViewPaymentHistory={(tenant) => {
                                setSelectedPaymentTenant(tenant);
                                navigate('/payment-history');
                            }}
                        />
                    }
                />

                <Route
                    path="/payment-history"
                    element={
                        selectedPaymentTenant || tenants.length > 0 ? (
                            <TenantPaymentHistoryView
                                tenant={selectedPaymentTenant || tenants[0]}
                                allTenants={tenants}
                                rooms={rooms}
                                onSelectTenant={setSelectedPaymentTenant}
                                onBack={() => navigate('/tenants')}
                            />
                        ) : (
                            <Navigate to="/tenants" replace />
                        )
                    }
                />

                <Route
                    path="/admissions"
                    element={
                        <AdmissionsView
                            admissions={admissions}
                            rooms={rooms}
                            onCreateAdmission={handleCreateAdmission}
                            onConfirmAdmission={handleConfirmAdmission}
                            onCancelAdmission={handleCancelAdmission}
                            onNavigate={handleNavigate}
                        />
                    }
                />

                <Route
                    path="/rooms"
                    element={
                        <RoomsView
                            rooms={rooms}
                            onAllocateRoom={handleAllocateRoom}
                            onCreateRoom={handleCreateRoom}
                            onUpdateRoom={handleUpdateRoom}
                            onDeleteRoom={handleDeleteRoom}
                            onNavigate={handleNavigate}
                        />
                    }
                />

                <Route
                    path="/rent-and-billing"
                    element={
                        <RentBillingView
                            invoices={invoices}
                            onRecordPayment={handleRecordPayment}
                            onGenerateCycle={handleGenerateCycleInvoices}
                        />
                    }
                />

                <Route
                    path="/ledger"
                    element={
                        <LedgerView
                            transactions={transactions}
                        />
                    }
                />

                <Route
                    path="/reports"
                    element={
                        <ReportsView
                            tenants={tenants}
                            admissions={admissions}
                        />
                    }
                />

                <Route
                    path="/settings"
                    element={[ROLES.OWNER, ROLES.TEST_BYPASS].includes(authSession.principal()?.role as any) ? (
                        <SettingsView
                            properties={properties}
                            users={users}
                            onCreateProperty={handleCreateProperty}
                            onUpdateProperty={handleUpdateProperty}
                            onDeleteProperty={handleDeleteProperty}
                            onCreateUser={handleCreateUser}
                            onUpdateUser={handleUpdateUser}
                            onDeleteUser={handleDeleteUser}
                            onResetData={handleResetData}
                            onReloadData={loadData}
                        />
                    ) : <Navigate to="/dashboard" replace />}
                />

                <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                />
            </Routes>
        </AppShell>
    );
}

export default App;
