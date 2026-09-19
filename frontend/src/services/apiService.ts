import { API_PATHS } from '../config/apiPaths';
import { STORAGE_KEYS, ROLES, AUTHORIZATION_HEADER, PROPERTY_HEADER } from '../config/constants';
import { authSession } from '../auth/session';
import {
    CriticalAction,
    Tenant,
    Admission,
    Room,
    Transaction,
    Invoice,
    Property,
    User,
    TenantStayCheckResult,
} from '../types';

import {
    INITIAL_CRITICAL_ACTIONS,
    INITIAL_TRANSACTIONS,
    INITIAL_INVOICES,
} from '../data/mockData';

export class ApiError extends Error {
    constructor(public readonly status: number, message: string) { super(message); }
}

export interface ApiConfig {
    baseUrl: string;
    useLiveBackend: boolean;
    syncLatencyMs: number;
}



const environment = (import.meta.env || {}) as Record<string, string | undefined>;
const rawBaseUrl = environment.VITE_API_BASE_URL || 'http://localhost:8080/api';
const DEFAULT_BASE_URL = rawBaseUrl.trim().replace(/\/+$/, '');
const DEFAULT_USE_LIVE_BACKEND = environment.VITE_USE_LIVE_BACKEND !== 'false';
const DEFAULT_SYNC_LATENCY_MS = Number(environment.VITE_SYNC_LATENCY_MS) || 12;

class ApiService {
    private config: ApiConfig = {
        baseUrl: DEFAULT_BASE_URL,
        useLiveBackend: DEFAULT_USE_LIVE_BACKEND,
        syncLatencyMs: DEFAULT_SYNC_LATENCY_MS,
    };
    private activePropertyId: number | null = null;

    constructor() {
        this.loadConfig();
    }

    // ---------------------------------------------------------
    // CONFIGURATION & ACTIVE PROPERTY
    // ---------------------------------------------------------

    private loadConfig(): void {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);

            if (saved) {
                const parsed = JSON.parse(saved);
                const savedUrl = (parsed.baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
                this.config = {
                    baseUrl: savedUrl,
                    useLiveBackend: parsed.useLiveBackend !== undefined ? parsed.useLiveBackend : DEFAULT_USE_LIVE_BACKEND,
                    syncLatencyMs: parsed.syncLatencyMs !== undefined ? parsed.syncLatencyMs : DEFAULT_SYNC_LATENCY_MS,
                };
            }

            const savedPropId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROPERTY);
            if (savedPropId) {
                const parsed = Number(savedPropId);
                if (!isNaN(parsed) && parsed > 0) {
                    this.activePropertyId = parsed;
                }
            }
        } catch {
            // Keep default configuration.
        }
    }

    public getConfig(): ApiConfig {
        return { ...this.config };
    }

    public getDefaultConfig(): ApiConfig {
        return {
            baseUrl: DEFAULT_BASE_URL,
            useLiveBackend: DEFAULT_USE_LIVE_BACKEND,
            syncLatencyMs: DEFAULT_SYNC_LATENCY_MS,
        };
    }

    public resetConfigToDefaults(): void {
        this.config = this.getDefaultConfig();
        localStorage.removeItem(STORAGE_KEYS.CONFIG);
    }

    public updateConfig(newConfig: Partial<ApiConfig>): void {
        if (newConfig.baseUrl && newConfig.baseUrl !== this.config.baseUrl) {
            this.setActivePropertyId(null);
            authSession.clear();
        }
        this.config = {
            ...this.config,
            ...newConfig,
        };

        localStorage.setItem(
            STORAGE_KEYS.CONFIG,
            JSON.stringify(this.config)
        );
    }

    public getActivePropertyId(): number | null {
        return this.activePropertyId;
    }

    public setActivePropertyId(id: number | null): void {
        this.activePropertyId = id;
        if (id !== null) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_PROPERTY, String(id));
        } else {
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROPERTY);
        }
    }

    // ---------------------------------------------------------
    // COMMON HTTP HELPERS
    // ---------------------------------------------------------

    private getUrl(path: string): string {
        return `${this.config.baseUrl}${path}`;
    }

    private getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...extraHeaders,
        };
        if (this.activePropertyId != null) {
            headers[PROPERTY_HEADER] = String(this.activePropertyId);
        }
        return headers;
    }

    private async request(url: string, init: RequestInit = {}): Promise<Response> {
        const user = authSession.principal();
        const method = (init.method || 'GET').toUpperCase();
        if (user?.role === ROLES.SUB_MEMBER && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            throw new ApiError(403, 'Your account has read-only access. Ask the PG owner to make this change.');
        }
        const headers = new Headers(init.headers);
        Object.entries(this.getHeaders()).forEach(([key, value]) => headers.set(key, value));
        const token = authSession.tokenFor(this.config.baseUrl);
        if (token) headers.set(AUTHORIZATION_HEADER, `Bearer ${token}`);
        const response = await fetch(url, { ...init, headers, credentials: 'omit', cache: 'no-store' });
        if (response.status === 401) { this.setActivePropertyId(null); authSession.clear(); }
        return response;
    }

    private async parseResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const errorText = await response.text();

            throw new ApiError(response.status, `HTTP ${response.status}: ${errorText || response.statusText}`);
        }

        if (response.status === 204) {
            return undefined as unknown as T;
        }

        const text = await response.text();
        if (!text || text.trim() === '') {
            return undefined as unknown as T;
        }

        try {
            return JSON.parse(text) as T;
        } catch {
            return text as unknown as T;
        }
    }

    private mapTenantFromApi(item: any): Tenant {
        return {
            id: item.uid,
            name: item.name,
            phone: item.mobileNumber,
            email: item.email ?? '',
            roomNumber: item.roomNo,
            monthlyRent: item.standardRent ?? item.rent ?? 0,
            joinedDate: item.joinedDate ?? item.enrollmentDate ?? '',
            hometown: item.hometown ?? '',
            profession: item.organizationName ?? '',
            category:
                item.tenantType === 'STUDENT'
                    ? 'student'
                    : 'working',
            paymentStatus:
                item.advancePaidStatus === 'PAID' || item.paymentStatus === 'VERIFIED'
                    ? 'verified'
                    : 'pending',
            status:
                !item.status || item.status === 'ACTIVE' || item.status === 'confirmed'
                    ? 'confirmed'
                    : item.status.toString().toUpperCase() === 'NOTICE'
                    ? 'notice'
                    : item.status.toString().toUpperCase() === 'PENDING'
                    ? 'pending'
                    : item.status.toString().toUpperCase() === 'INACTIVE' || item.status.toString().toUpperCase() === 'VACATED'
                    ? 'vacated'
                    : 'confirmed',
            aadharNumber: item.aadhaarNo ?? '',
            parentContact: item.parentContact ?? '',
            parentNumber: item.parentContact ?? '',
            propertyId: item.propertyId,
        };
    }

    private mapAdmissionFromApi(item: any): Admission {
        return {
            id: item.admissionNumber,
            residentName: item.tenantName,
            phone: item.mobileNumber,
            email: item.email ?? '',
            parentContact: item.parentContact ?? '',
            parentNumber: item.parentContact ?? '',
            roomNumber: item.roomNo,
            monthlyRent: item.roomRent ?? 0,
            moveInDate: item.enrollmentDate,
            hometown: item.hometown ?? '',
            profession: item.organizationName ?? '',
            category:
                item.tenantType === 'STUDENT'
                    ? 'student'
                    : 'working',
            aadharNumber: item.aadhaarNo,
            status:
                item.status === 'PAID' || item.status === 'CONFIRMED'
                    ? 'confirmed'
                    : item.status === 'VACATED'
                    ? 'vacated'
                    : item.status === 'CANCELLED'
                    ? 'cancelled'
                    : 'pending',
            tenantStatus: item.tenantStatus,
            allocatedAt: item.confirmedOn
                ? new Date(
                    item.confirmedOn
                ).toLocaleString('en-IN')
                : undefined,
            propertyId: item.propertyId,
        };
    }

    // ---------------------------------------------------------
    // LOCAL STORAGE
    // ---------------------------------------------------------

    private getStorage<T>(key: string, defaultData: T): T {
        try {
            const value = localStorage.getItem(key);

            if (!value) {
                localStorage.setItem(
                    key,
                    JSON.stringify(defaultData)
                );

                return defaultData;
            }

            return JSON.parse(value) as T;
        } catch {
            return defaultData;
        }
    }

    private setStorage<T>(key: string, data: T): void {
        try {
            localStorage.setItem(
                key,
                JSON.stringify(data)
            );
        } catch {
            // Ignore localStorage errors.
        }
    }

    // =========================================================
    // CRITICAL ACTIONS
    // =========================================================

    public async getCriticalActions(): Promise<CriticalAction[]> {
        return this.getStorage(
            STORAGE_KEYS.ACTIONS,
            []
        );
    }

    public async dismissCriticalAction(id: string): Promise<void> {
        const actions = await this.getCriticalActions();

        this.setStorage(
            STORAGE_KEYS.ACTIONS,
            actions.filter(action => action.id !== id)
        );
    }

    // =========================================================
    // TENANTS (/api/tenants)
    // =========================================================

    public async getTenants(propertyId?: number): Promise<Tenant[]> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`${API_PATHS.TENANTS}?propertyId=${propId}`) : this.getUrl(API_PATHS.TENANTS);
        const response = await this.request(
            url,
            { headers: this.getHeaders() }
        );

        const data = await this.parseResponse<any[]>(response);
        return data.map(item => this.mapTenantFromApi(item));
    }

    public async getTenantByUid(uid: string): Promise<Tenant> {
        const response = await this.request(
            this.getUrl(API_PATHS.tenant(uid)),
            { headers: this.getHeaders() }
        );

        const item = await this.parseResponse<any>(response);
        return this.mapTenantFromApi(item);
    }

    public async getTenantsByRoom(roomNo: string): Promise<Tenant[]> {
        const response = await this.request(
            this.getUrl(API_PATHS.tenantsInRoom(roomNo)),
            { headers: this.getHeaders() }
        );

        const data = await this.parseResponse<any[]>(response);
        return data.map(item => this.mapTenantFromApi(item));
    }

    public async addTenant(
        tenant: Omit<Tenant, 'id'> & { propertyId?: number }
    ): Promise<Tenant> {
        const requestBody = {
            name: tenant.name,
            aadhaarNo: tenant.aadharNumber || '123456789012',
            mobileNumber: tenant.phone,
            tenantType:
                tenant.category === 'working'
                    ? 'WORKING'
                    : 'STUDENT',
            organizationName: tenant.profession || '',
            parentContact: tenant.parentContact || tenant.parentNumber || null,
            advancePaid: 0,
            standardRent: tenant.monthlyRent,
            roomNo: tenant.roomNumber,
            propertyId: tenant.propertyId ?? this.activePropertyId ?? undefined,
        };

        const response = await this.request(
            this.getUrl(API_PATHS.TENANTS),
            {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(requestBody),
            }
        );

        const item = await this.parseResponse<any>(response);
        return this.mapTenantFromApi(item);
    }

    public async updateTenant(
        uid: string,
        tenantData: Partial<Tenant>
    ): Promise<Tenant> {
        const requestBody = {
            uid,
            name: tenantData.name,
            aadhaarNo: tenantData.aadharNumber,
            mobileNumber: tenantData.phone,
            tenantType:
                tenantData.category === 'working'
                    ? 'WORKING'
                    : 'STUDENT',
            organizationName: tenantData.profession || 'Working',
            parentContact: tenantData.parentContact || tenantData.parentNumber || null,
            advancePaid: 0,
            standardRent: tenantData.monthlyRent ?? 8000,
            roomNo: tenantData.roomNumber,
            propertyId: tenantData.propertyId ?? this.activePropertyId ?? undefined,
        };

        const response = await this.request(
            this.getUrl(API_PATHS.tenant(uid)),
            {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(requestBody),
            }
        );

        const item = await this.parseResponse<any>(response);
        return this.mapTenantFromApi(item);
    }

    public async deleteTenant(uid: string): Promise<void> {
        const response = await this.request(
            this.getUrl(API_PATHS.tenant(uid)),
            {
                method: 'DELETE',
                headers: this.getHeaders(),
            }
        );

        await this.parseResponse<string>(response);
    }

    // =========================================================
    // ADMISSIONS (/api/admissions)
    // =========================================================

    public async getAdmissions(propertyId?: number): Promise<Admission[]> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`${API_PATHS.ADMISSIONS}?propertyId=${propId}`) : this.getUrl(API_PATHS.ADMISSIONS);
        const response = await this.request(
            url,
            { headers: this.getHeaders() }
        );

        const data = await this.parseResponse<any[]>(response);
        return data.map(item => this.mapAdmissionFromApi(item));
    }

    public async getAdmissionByNumber(admissionNumber: string): Promise<Admission> {
        const response = await this.request(
            this.getUrl(API_PATHS.admission(admissionNumber)),
            { headers: this.getHeaders() }
        );

        const item = await this.parseResponse<any>(response);
        return this.mapAdmissionFromApi(item);
    }

    public async createAdmission(
        admissionData: Omit<
            Admission,
            'id' | 'allocatedAt'
        > & { propertyId?: number }
    ): Promise<Admission> {
        const requestBody = {
            tenantUid: null,
            name: admissionData.residentName,
            aadhaarNo: admissionData.aadharNumber,
            mobileNumber: admissionData.phone,
            tenantType:
                admissionData.category === 'working'
                    ? 'WORKING'
                    : 'STUDENT',
            organizationName:
                admissionData.profession || '',
            parentContact: admissionData.parentContact || admissionData.parentNumber || null,
            advancePaid: 0,
            standardRent: admissionData.monthlyRent,
            roomNo: admissionData.roomNumber,
            enrollmentDate: admissionData.moveInDate,
            remarks: null,
            propertyId: admissionData.propertyId ?? this.activePropertyId ?? undefined,
        };

        const response = await this.request(
            this.getUrl(API_PATHS.ADMISSIONS),
            {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(requestBody),
            }
        );

        const item = await this.parseResponse<any>(response);
        return this.mapAdmissionFromApi(item);
    }

    public async confirmAdmission(admissionNumber: string): Promise<Admission> {
        const response = await this.request(
            this.getUrl(API_PATHS.confirmAdmission(admissionNumber)),
            {
                method: 'PUT',
                headers: this.getHeaders(),
            }
        );

        const item = await this.parseResponse<any>(response);
        return this.mapAdmissionFromApi(item);
    }

    public async cancelAdmission(admissionNumber: string): Promise<void> {
        const response = await this.request(
            this.getUrl(API_PATHS.admission(admissionNumber)),
            {
                method: 'DELETE',
                headers: this.getHeaders(),
            }
        );

        await this.parseResponse<string>(response);
    }

    public async checkExistingTenant(
        aadhaarNo?: string,
        mobileNumber?: string
    ): Promise<TenantStayCheckResult> {
        const params = new URLSearchParams();
        if (aadhaarNo && aadhaarNo.trim()) {
            params.append('aadhaarNo', aadhaarNo.trim());
        }
        if (mobileNumber && mobileNumber.trim()) {
            params.append('mobileNumber', mobileNumber.trim());
        }

        const query = params.toString();
        const url = this.getUrl(`${API_PATHS.CHECK_EXISTING}${query ? `?${query}` : ''}`);

        const response = await this.request(url, {
            headers: this.getHeaders(),
        });

        return await this.parseResponse<TenantStayCheckResult>(response);
    }

    // =========================================================
    // ROOMS (/api/rooms)
    // =========================================================

    public async getRooms(propertyId?: number): Promise<Room[]> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`${API_PATHS.ROOMS}?propertyId=${propId}`) : this.getUrl(API_PATHS.ROOMS);

        let tenants: Tenant[] | null = null;
        try {
            tenants = await this.getTenants(propId ?? undefined);
        } catch {
            tenants = null;
        }

        const roomsResponse = await this.request(url, { headers: this.getHeaders() });
        const data = await this.parseResponse<any[]>(roomsResponse);

        return data.map((item): Room => {
            const capacity = item.occupancy ?? 0;
            let currentOccupancy = item.currentOccupancy ?? 0;
            let residentNames: string[] = item.residents ?? [];

            if (tenants !== null) {
                const roomTenants = tenants.filter(t => {
                    const status = (t.status || '').toLowerCase();
                    const isActive = status !== 'vacated' && status !== 'inactive' && status !== 'cancelled';
                    const matchesRoom = Boolean(t.roomNumber && item.roomNo) &&
                        String(t.roomNumber).trim().toLowerCase() === String(item.roomNo).trim().toLowerCase();
                    return isActive && matchesRoom;
                });
                residentNames = roomTenants.map(t => t.name);
                currentOccupancy = roomTenants.length;
            }

            return {
                roomNumber: item.roomNo,
                floor: String(item.floor ?? 0),
                roomType: item.roomType ?? '',
                rent: item.rentPerMonth ?? 0,
                capacity: capacity,
                occupied: currentOccupancy,
                status:
                    currentOccupancy >= capacity
                        ? 'full'
                        : 'available',
                residents: residentNames,
                propertyId: item.propertyId,
            };
        });
    }

    public async getRoomByRoomNo(roomNo: string): Promise<Room> {
        const response = await this.request(
            this.getUrl(API_PATHS.room(roomNo)),
            { headers: this.getHeaders() }
        );

        const item = await this.parseResponse<any>(response);
        let tenantsInRoom: Tenant[] | null = null;
        try {
            tenantsInRoom = await this.getTenantsByRoom(roomNo);
        } catch {
            tenantsInRoom = null;
        }

        const capacity = item.occupancy ?? 0;
        let currentOccupancy = item.currentOccupancy ?? 0;
        let residentNames: string[] = item.residents ?? [];

        if (tenantsInRoom !== null) {
            const activeTenants = tenantsInRoom.filter(t => {
                const status = (t.status || '').toLowerCase();
                return status !== 'vacated' && status !== 'inactive' && status !== 'cancelled';
            });
            residentNames = activeTenants.map(t => t.name);
            currentOccupancy = activeTenants.length;
        }

        return {
            roomNumber: item.roomNo,
            floor: String(item.floor ?? 0),
            roomType: item.roomType ?? '',
            rent: item.rentPerMonth ?? 0,
            capacity: capacity,
            occupied: currentOccupancy,
            status:
                currentOccupancy >= capacity
                    ? 'full'
                    : 'available',
            residents: residentNames,
            propertyId: item.propertyId,
        };
    }

    public async createRoom(roomData: {
        roomNo: string;
        floor: string;
        roomType: string;
        rentPerMonth: number;
        occupancy: number;
        available: boolean;
        propertyId?: number;
    }): Promise<Room> {
        const payload = {
            ...roomData,
            propertyId: roomData.propertyId ?? this.activePropertyId ?? undefined,
        };

        const response = await this.request(
            this.getUrl(API_PATHS.ROOMS),
            {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload),
            }
        );

        const item = await this.parseResponse<any>(response);

        return {
            roomNumber: item.roomNo,
            floor: String(item.floor ?? 0),
            rent: item.rentPerMonth ?? 0,
            capacity: item.occupancy ?? 0,
            occupied: item.currentOccupancy ?? 0,
            roomType: item.roomType ?? 'Single',
            status:
                (item.currentOccupancy ?? 0) >= (item.occupancy ?? 1)
                    ? 'full'
                    : 'available',
            residents: item.residents ?? [],
            propertyId: item.propertyId,
        };
    }

    public async updateRoom(
        roomNumber: string,
        roomData: {
            floor: string;
            roomType: string;
            rentPerMonth: number;
            occupancy: number;
            available: boolean;
            propertyId?: number;
        }
    ): Promise<Room> {
        const payload = {
            roomNo: roomNumber,
            ...roomData,
            propertyId: roomData.propertyId ?? this.activePropertyId ?? undefined,
        };

        const response = await this.request(
            this.getUrl(
                API_PATHS.room(roomNumber)
            ),
            {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(payload),
            }
        );

        const item = await this.parseResponse<any>(response);

        return {
            roomNumber: item.roomNo,
            floor: String(item.floor ?? ''),
            rent: item.rentPerMonth ?? 0,
            capacity: item.occupancy ?? 0,
            occupied: item.currentOccupancy ?? 0,
            roomType: item.roomType ?? 'Single',
            status:
                (item.currentOccupancy ?? 0) >= (item.occupancy ?? 1)
                    ? 'full'
                    : 'available',
            residents: item.residents ?? [],
            propertyId: item.propertyId,
        };
    }

    public async deleteRoom(
        roomNumber: string
    ): Promise<void> {
        const response = await this.request(
            this.getUrl(
                API_PATHS.room(roomNumber)
            ),
            {
                method: 'DELETE',
                headers: this.getHeaders(),
            }
        );

        await this.parseResponse<string>(response);
    }

    public async allocateRoom(
        roomNumber: string,
        tenantName: string
    ): Promise<Room> {
        const currentRooms = await this.getRooms();
        const room = currentRooms.find(item => item.roomNumber === roomNumber);

        if (!room) {
            throw new Error(`Room ${roomNumber} not found`);
        }

        return {
            ...room,
            occupied: room.occupied + 1,
            residents: [...room.residents, tenantName],
            status: room.occupied + 1 >= room.capacity ? 'full' : 'available',
        };
    }

    // =========================================================
    // FINANCE & BILLING (/api/invoices, /api/ledger)
    // =========================================================

    public async getTransactions(type?: string, propertyId?: number): Promise<Transaction[]> {
        try {
            const propId = propertyId ?? this.activePropertyId;
            const params = new URLSearchParams();
            if (type) params.append('type', type.toUpperCase());
            if (propId) params.append('propertyId', String(propId));

            const url = this.getUrl(API_PATHS.LEDGER + (params.toString() ? `?${params.toString()}` : ''));
            const response = await this.request(url, { headers: this.getHeaders() });
            const data = await this.parseResponse<any[]>(response);
            return data.map((item: any): Transaction => ({
                id: String(item.id),
                date: item.date,
                referenceNumber: item.referenceNumber,
                type: (item.type || 'credit').toLowerCase() as any,
                accountHead: item.accountHead,
                description: item.description,
                tenantOrVendor: item.tenantOrVendor,
                amount: item.amount,
                paymentMode: item.paymentMode,
                runningBalance: item.runningBalance,
                propertyId: item.propertyId,
            }));
        } catch (err) {
            if (this.config.useLiveBackend || err instanceof ApiError) throw err;
            console.warn('Backend ledger unavailable, falling back to local storage:', err);
            return this.getStorage(STORAGE_KEYS.TRANSACTIONS, []);
        }
    }

    public async getInvoices(monthYear?: string, status?: string, propertyId?: number): Promise<Invoice[]> {
        try {
            const propId = propertyId ?? this.activePropertyId;
            const params = new URLSearchParams();
            if (monthYear) params.append('monthYear', monthYear);
            if (status) params.append('status', status.toUpperCase());
            if (propId) params.append('propertyId', String(propId));

            const url = this.getUrl(API_PATHS.INVOICES + (params.toString() ? `?${params.toString()}` : ''));
            const response = await this.request(url, { headers: this.getHeaders() });
            const data = await this.parseResponse<any[]>(response);
            return data.map((item: any): Invoice => ({
                id: String(item.id),
                invoiceNumber: item.invoiceNumber,
                tenantName: item.tenantName,
                roomNumber: item.roomNo,
                monthYear: item.monthYear,
                amount: item.amount,
                dueDate: item.dueDate,
                status: (item.status || 'pending').toLowerCase() as any,
                paidOn: item.paidOn,
                paymentMode: item.paymentMode,
                propertyId: item.propertyId,
            }));
        } catch (err) {
            if (this.config.useLiveBackend || err instanceof ApiError) throw err;
            console.warn('Backend invoices unavailable, falling back to local storage:', err);
            return this.getStorage(STORAGE_KEYS.INVOICES, []);
        }
    }

    public async generateCycleInvoices(monthYear: string, dueDate: string): Promise<any> {
        const response = await this.request(this.getUrl(API_PATHS.INVOICES_GENERATE_CYCLE), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ monthYear, dueDate }),
        });
        return this.parseResponse<any>(response);
    }

    public async recordPayment(
        invoiceId: string,
        paymentMode: string,
        transactionRef?: string,
        paidOn?: string
    ): Promise<void> {
        try {
            const response = await this.request(this.getUrl(API_PATHS.payInvoice(invoiceId)), {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    paymentMode,
                    transactionRef: transactionRef || undefined,
                    paidOn: paidOn || undefined,
                }),
            });
            await this.parseResponse<any>(response);
        } catch (err) {
            if (this.config.useLiveBackend || err instanceof ApiError) throw err;
            console.warn('Backend invoice payment recording failed, using local storage fallback:', err);
            const invoices = await this.getStorage<Invoice[]>(STORAGE_KEYS.INVOICES, []);

            let paidAmount = 0;
            let tenantName = '';
            let roomNumber = '';

            const updatedInvoices = invoices.map(inv => {
                if (inv.id === invoiceId) {
                    paidAmount = inv.amount;
                    tenantName = inv.tenantName;
                    roomNumber = inv.roomNumber;

                    return {
                        ...inv,
                        status: 'paid' as const,
                        paidOn: paidOn || new Date().toISOString().split('T')[0],
                        paymentMode,
                    };
                }
                return inv;
            });

            this.setStorage(STORAGE_KEYS.INVOICES, updatedInvoices);

            const transactions = await this.getStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
            const lastBalance = transactions[0]?.runningBalance ?? 450000;

            const newTransaction: Transaction = {
                id: `tx-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                referenceNumber: transactionRef || `${paymentMode}/${Date.now()}`,
                type: 'credit',
                accountHead: 'Rent Payment',
                description: `Monthly Rent - ${roomNumber} (${tenantName})`,
                tenantOrVendor: tenantName,
                amount: paidAmount,
                paymentMode: paymentMode as any,
                runningBalance: lastBalance + paidAmount,
            };

            this.setStorage(STORAGE_KEYS.TRANSACTIONS, [newTransaction, ...transactions]);
        }
    }

    public async getLedgerBalance(): Promise<number> {
        try {
            const response = await this.request(this.getUrl(API_PATHS.LEDGER_BALANCE), { headers: this.getHeaders() });
            const data = await this.parseResponse<{ runningBalance: number }>(response);
            return data.runningBalance;
        } catch (err) {
            if (this.config.useLiveBackend || err instanceof ApiError) throw err;
            const txns = await this.getTransactions();
            return txns[0]?.runningBalance ?? 0;
        }
    }

    public async recordTransaction(dto: {
        type: 'credit' | 'debit';
        accountHead: string;
        description: string;
        tenantOrVendor: string;
        amount: number;
        paymentMode: string;
        date?: string;
        propertyId?: number;
    }): Promise<Transaction> {
        const response = await this.request(this.getUrl(API_PATHS.LEDGER), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                ...dto,
                type: dto.type.toUpperCase(),
                propertyId: dto.propertyId ?? this.activePropertyId ?? undefined,
            }),
        });
        const item = await this.parseResponse<any>(response);
        return {
            id: String(item.id),
            date: item.date,
            referenceNumber: item.referenceNumber,
            type: (item.type || 'credit').toLowerCase() as any,
            accountHead: item.accountHead,
            description: item.description,
            tenantOrVendor: item.tenantOrVendor,
            amount: item.amount,
            paymentMode: item.paymentMode,
            runningBalance: item.runningBalance,
            propertyId: item.propertyId,
        };
    }

    /**
     * Seeds mock data into localStorage on demand (only for testing).
     * Does NOT initialize upfront automatically.
     */
    public async loadMockData(): Promise<void> {
        this.setStorage(STORAGE_KEYS.ACTIONS, INITIAL_CRITICAL_ACTIONS);
        this.setStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
        this.setStorage(STORAGE_KEYS.INVOICES, INITIAL_INVOICES);
    }

    /**
     * Clears all mock/localStorage data.
     */
    public async clearMockData(): Promise<void> {
        localStorage.removeItem(STORAGE_KEYS.ACTIONS);
        localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
        localStorage.removeItem(STORAGE_KEYS.INVOICES);
    }

    /**
     * Wipes all backend database mock/transactional records and clears local storage.
     */
    public async cleanDatabase(): Promise<{ status: string; message: string; timestamp: string }> {
        const response = await this.request(this.getUrl(API_PATHS.SYSTEM_CLEAN_DATABASE), {
            method: 'POST',
            headers: this.getHeaders(),
        });
        const result = await this.parseResponse<{ status: string; message: string; timestamp: string }>(response);
        await this.clearMockData();
        return result;
    }

    // =========================================================
    // PROPERTIES (/api/properties)
    // =========================================================

    public async getProperties(): Promise<Property[]> {
        const response = await this.request(this.getUrl(API_PATHS.PROPERTIES));
        const data = await this.parseResponse<any[]>(response);
        return data.map((p): Property => ({
            id: p.id,
            name: p.name,
            code: p.code,
            address: p.address,
            city: p.city,
            state: p.state,
            propertyType: p.propertyType,
            totalFloors: p.totalFloors,
            totalRooms: p.totalRooms,
            contactNumber: p.contactNumber,
            contactEmail: p.contactEmail,
            status: p.status,
        }));
    }

    public async getPropertyById(id: number): Promise<Property> {
        const response = await this.request(this.getUrl(API_PATHS.property(id)));
        const p = await this.parseResponse<any>(response);
        return {
            id: p.id,
            name: p.name,
            code: p.code,
            address: p.address,
            city: p.city,
            state: p.state,
            propertyType: p.propertyType,
            totalFloors: p.totalFloors,
            totalRooms: p.totalRooms,
            contactNumber: p.contactNumber,
            contactEmail: p.contactEmail,
            status: p.status,
        };
    }

    public async createProperty(propertyData: Omit<Property, 'id'>): Promise<Property> {
        const response = await this.request(this.getUrl(API_PATHS.PROPERTIES), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(propertyData),
        });
        const p = await this.parseResponse<any>(response);
        return {
            id: p.id,
            name: p.name,
            code: p.code,
            address: p.address,
            city: p.city,
            state: p.state,
            propertyType: p.propertyType,
            totalFloors: p.totalFloors,
            totalRooms: p.totalRooms,
            contactNumber: p.contactNumber,
            contactEmail: p.contactEmail,
            status: p.status,
        };
    }

    public async updateProperty(id: number, propertyData: Partial<Property>): Promise<Property> {
        const response = await this.request(this.getUrl(API_PATHS.property(id)), {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(propertyData),
        });
        const p = await this.parseResponse<any>(response);
        return {
            id: p.id,
            name: p.name,
            code: p.code,
            address: p.address,
            city: p.city,
            state: p.state,
            propertyType: p.propertyType,
            totalFloors: p.totalFloors,
            totalRooms: p.totalRooms,
            contactNumber: p.contactNumber,
            contactEmail: p.contactEmail,
            status: p.status,
        };
    }

    public async deleteProperty(id: number): Promise<void> {
        const response = await this.request(this.getUrl(API_PATHS.property(id)), {
            method: 'DELETE',
        });
        await this.parseResponse<any>(response);
    }

    // =========================================================
    // USERS (/api/users)
    // =========================================================

    public async getUsers(): Promise<User[]> {
        const response = await this.request(this.getUrl(API_PATHS.USERS));
        const data = await this.parseResponse<any[]>(response);
        return data.filter(u => u.role !== ROLES.OWNER && u.role !== ROLES.ROOT).map((u): User => ({
            id: u.id,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            ownerId: u.ownerId,
            propertyIds: u.propertyIds || [],
            phone: u.phone,
            status: u.status,
        }));
    }

    public async getUserById(id: number): Promise<User> {
        const response = await this.request(this.getUrl(API_PATHS.user(id)));
        const u = await this.parseResponse<any>(response);
        return {
            id: u.id,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            ownerId: u.ownerId,
            propertyIds: u.propertyIds || [],
            phone: u.phone,
            status: u.status,
        };
    }

    public async createUser(userData: Omit<User, 'id'>): Promise<User> {
        const response = await this.request(this.getUrl(API_PATHS.USERS), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        const u = await this.parseResponse<any>(response);
        return {
            id: u.id,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            ownerId: u.ownerId,
            propertyIds: u.propertyIds || [],
            phone: u.phone,
            status: u.status,
        };
    }

    public async updateUser(id: number, userData: Partial<User>): Promise<User> {
        const response = await this.request(this.getUrl(API_PATHS.user(id)), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        const u = await this.parseResponse<any>(response);
        return {
            id: u.id,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            ownerId: u.ownerId,
            propertyIds: u.propertyIds || [],
            phone: u.phone,
            status: u.status,
        };
    }

    public async deleteUser(id: number): Promise<void> {
        const response = await this.request(this.getUrl(API_PATHS.user(id)), {
            method: 'DELETE',
        });
        await this.parseResponse<any>(response);
    }

    // =========================================================
    // TENANT VERIFICATION (/api/tenants/{uid}/verify-advance)
    // =========================================================

    public async verifyTenantAdvance(uid: string, amount?: number): Promise<Tenant> {
        const body = amount != null ? JSON.stringify({ amount }) : '{}';
        const response = await this.request(
            this.getUrl(API_PATHS.verifyAdvance(uid)),
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body,
            }
        );
        const item = await this.parseResponse<any>(response);
        return this.mapTenantFromApi(item);
    }

    // =========================================================
    // RESET
    // =========================================================

    public resetAllData(): void {
        localStorage.removeItem(
            STORAGE_KEYS.ACTIONS
        );

        localStorage.removeItem(
            STORAGE_KEYS.TRANSACTIONS
        );

        localStorage.removeItem(
            STORAGE_KEYS.INVOICES
        );
    }
}

export const apiService =
    new ApiService();