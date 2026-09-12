import React, { useState, useEffect } from 'react';
import { PageId, CriticalAction, Tenant, Admission, Room, Transaction, Invoice } from './types';
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
    const [loading, setLoading] = useState(true);

    // Load initial data from apiService
    const loadData = async () => {
        try {
            const [actionsData, tenantsData, admissionsData, roomsData, txData, invoicesData] =
                await Promise.all([
                    apiService.getCriticalActions(),
                    apiService.getTenants(),
                    apiService.getAdmissions(),
                    apiService.getRooms(),
                    apiService.getTransactions(),
                    apiService.getInvoices(),
                ]);

            setCriticalActions(actionsData);
            setTenants(tenantsData);
            setAdmissions(admissionsData);
            setRooms(roomsData);
            setTransactions(txData);
            setInvoices(invoicesData);
        } catch (err) {
            console.error('Error loading RMS state:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleActionDismiss = async (id: string) => {
        await apiService.dismissCriticalAction(id);
        setCriticalActions(prev => prev.filter(a => a.id !== id));
    };

    const handleAddTenant = async (tenantData: Omit<Tenant, 'id'>) => {
        const created = await apiService.addTenant(tenantData);
        setTenants(prev => [created, ...prev]);
    };

    const handleCreateAdmission = async (
        admData: Omit<Admission, 'id' | 'allocatedAt'>
    ) => {
        try {
            const created = await apiService.createAdmission(admData);

            setAdmissions(prev => [created, ...prev]);

            const [updatedRooms, updatedTenants] =
                await Promise.all([
                    apiService.getRooms(),
                    apiService.getTenants(),
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
            await apiService.getRooms();

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


    const handleDeleteRoom = async (
        roomNumber: string
    ) => {
        await apiService.deleteRoom(roomNumber);

        const updatedRooms =
            await apiService.getRooms();

        setRooms(updatedRooms);
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

    const handleRecordPayment = async (invoiceId: string, paymentMode: string) => {
        await apiService.recordPayment(invoiceId, paymentMode);
        const updatedInvoices = await apiService.getInvoices();
        const updatedTxs = await apiService.getTransactions();
        setInvoices(updatedInvoices);
        setTransactions(updatedTxs);
    };

    const handleResetData = async () => {
        apiService.resetAllData();
        await loadData();
        alert('Project RMS data successfully reset to clean seed state.');
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
        >
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
                    element={
                        <SettingsView
                            onResetData={handleResetData}
                        />
                    }
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
