import {
    CriticalAction,
    Tenant,
    Admission,
    Room,
    Transaction,
    Invoice,
    Property,
    PropertySoftDeleteRequest,
    PropertyArchiveSnapshot,
    User,
    TenantStayCheckResult,
    VacateRequest,
    WhatsAppPackage,
    ReportSummary,
    PropertyPerformanceReport,
    MonthlyIntakeReport,
    DemographicsReport,
    Payment,
    PaymentRequest,
} from '../types';

import {
    INITIAL_CRITICAL_ACTIONS,
    INITIAL_TRANSACTIONS,
    INITIAL_INVOICES,
} from '../data/mockData';

export interface ApiConfig {
    baseUrl: string;
    useLiveBackend: boolean;
    syncLatencyMs: number;
}

const STORAGE_KEYS = {
    CONFIG: 'rms_api_config',
    ACTIVE_PROPERTY: 'rms_active_property_id',
    ACTIONS: 'rms_actions_v2',
    TRANSACTIONS: 'rms_transactions_v2',
    INVOICES: 'rms_invoices_v3',
};

function normalizeBaseUrl(url?: string): string {
    if (!url || typeof url !== 'string') return DEFAULT_BASE_URL;
    let clean = url.trim().replace(/\/+$/, '');
    if (!clean) return DEFAULT_BASE_URL;
    if (!clean.endsWith('/api')) {
        clean = `${clean}/api`;
    }
    return clean;
}

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const DEFAULT_BASE_URL = rawBaseUrl.trim().replace(/\/+$/, '');
const DEFAULT_USE_LIVE_BACKEND = import.meta.env.VITE_USE_LIVE_BACKEND !== 'false';
const DEFAULT_SYNC_LATENCY_MS = Number(import.meta.env.VITE_SYNC_LATENCY_MS) || 12;

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
                const savedUrl = normalizeBaseUrl(parsed.baseUrl || DEFAULT_BASE_URL);
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
        const normalizedUrl = newConfig.baseUrl ? normalizeBaseUrl(newConfig.baseUrl) : this.config.baseUrl;
        this.config = {
            ...this.config,
            ...newConfig,
            baseUrl: normalizedUrl,
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
            headers['X-Property-Id'] = String(this.activePropertyId);
        }
        return headers;
    }

    private async parseResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const errorText = await response.text();

            throw new Error(
                `HTTP ${response.status}: ${errorText || response.statusText}`
            );
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
            advancePaid: item.advancePaid ?? 0,
            securityDeposit: item.advancePaid ?? 0,
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
        const url = propId ? this.getUrl(`/tenants?propertyId=${propId}`) : this.getUrl('/tenants');
        const response = await fetch(
            url,
            { headers: this.getHeaders() }
        );

        const data = await this.parseResponse<any[]>(response);
        return data.map(item => this.mapTenantFromApi(item));
    }

    public async getTenantByUid(uid: string): Promise<Tenant> {
        const response = await fetch(
            this.getUrl(`/tenants/${encodeURIComponent(uid)}`),
            { headers: this.getHeaders() }
        );

        const item = await this.parseResponse<any>(response);
        return this.mapTenantFromApi(item);
    }

    public async getTenantsByRoom(roomNo: string): Promise<Tenant[]> {
        const response = await fetch(
            this.getUrl(`/tenants/room/${encodeURIComponent(roomNo)}`),
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

        const response = await fetch(
            this.getUrl('/tenants'),
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

        const response = await fetch(
            this.getUrl(`/tenants/${encodeURIComponent(uid)}`),
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
        const response = await fetch(
            this.getUrl(`/tenants/${encodeURIComponent(uid)}`),
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
        const url = propId ? this.getUrl(`/admissions?propertyId=${propId}`) : this.getUrl('/admissions');
        const response = await fetch(
            url,
            { headers: this.getHeaders() }
        );

        const data = await this.parseResponse<any[]>(response);
        return data.map(item => this.mapAdmissionFromApi(item));
    }

    public async getAdmissionByNumber(admissionNumber: string): Promise<Admission> {
        const response = await fetch(
            this.getUrl(`/admissions/${encodeURIComponent(admissionNumber)}`),
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

        const response = await fetch(
            this.getUrl('/admissions'),
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
        const response = await fetch(
            this.getUrl(`/admissions/${encodeURIComponent(admissionNumber)}/confirm`),
            {
                method: 'PUT',
                headers: this.getHeaders(),
            }
        );

        const item = await this.parseResponse<any>(response);
        return this.mapAdmissionFromApi(item);
    }

    public async cancelAdmission(admissionNumber: string): Promise<void> {
        const response = await fetch(
            this.getUrl(`/admissions/${encodeURIComponent(admissionNumber)}`),
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
        const url = this.getUrl(`/admissions/check-existing${query ? `?${query}` : ''}`);

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        return await this.parseResponse<TenantStayCheckResult>(response);
    }

    // =========================================================
    // ROOMS (/api/rooms)
    // =========================================================

    public async getRooms(propertyId?: number): Promise<Room[]> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/rooms?propertyId=${propId}`) : this.getUrl('/rooms');

        let tenants: Tenant[] | null = null;
        try {
            tenants = await this.getTenants(propId ?? undefined);
        } catch {
            tenants = null;
        }

        const roomsResponse = await fetch(url, { headers: this.getHeaders() });
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
        const response = await fetch(
            this.getUrl(`/rooms/${encodeURIComponent(roomNo)}`),
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

        const response = await fetch(
            this.getUrl('/rooms'),
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

        const response = await fetch(
            this.getUrl(
                `/rooms/${encodeURIComponent(roomNumber)}`
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
        const response = await fetch(
            this.getUrl(
                `/rooms/${encodeURIComponent(roomNumber)}`
            ),
            {
                method: 'DELETE',
                headers: this.getHeaders(),
            }
        );

        await this.parseResponse<string>(response);
    }

    // =========================================================
    // FINANCE & BILLING (/api/invoices, /api/ledger)
    // =========================================================

    public async getTransactions(type?: string, propertyId?: number): Promise<Transaction[]> {
        const propId = propertyId ?? this.activePropertyId;
        const params = new URLSearchParams();
        if (type) params.append('type', type.toUpperCase());
        if (propId) params.append('propertyId', String(propId));

        const url = this.getUrl('/ledger' + (params.toString() ? `?${params.toString()}` : ''));
        const response = await fetch(url, { headers: this.getHeaders() });
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
            tenantUid: item.tenantUid,
            invoiceId: item.invoiceId,
            paymentId: item.paymentId,
        }));
    }

    public async getInvoices(monthYear?: string, status?: string, propertyId?: number): Promise<Invoice[]> {
        const propId = propertyId ?? this.activePropertyId;
        const params = new URLSearchParams();
        if (monthYear) params.append('monthYear', monthYear);
        if (status) params.append('status', status.toUpperCase());
        if (propId) params.append('propertyId', String(propId));

        const url = this.getUrl('/invoices' + (params.toString() ? `?${params.toString()}` : ''));
        const response = await fetch(url, { headers: this.getHeaders() });
        const data = await this.parseResponse<any[]>(response);
        return data.map((item: any): Invoice => ({
            id: String(item.id),
            invoiceNumber: item.invoiceNumber,
            tenantUid: item.tenantUid,
            tenantName: item.tenantName,
            roomNumber: item.roomNo,
            roomNo: item.roomNo,
            monthYear: item.monthYear,
            amount: item.amount,
            paidAmount: item.paidAmount ?? 0,
            remainingBalance: item.remainingBalance ?? Math.max(0, item.amount - (item.paidAmount ?? 0)),
            dueDate: item.dueDate,
            status: (item.status || 'pending').toLowerCase() as any,
            paidOn: item.paidOn,
            paymentMode: item.paymentMode,
            transactionRef: item.transactionRef,
            createdAt: item.createdAt,
            propertyId: item.propertyId,
        }));
    }

    public async createInvoice(dto: {
        tenantUid: string;
        monthYear: string;
        amount: number;
        dueDate: string;
        paymentMode?: string;
        propertyId?: number;
    }): Promise<Invoice> {
        const propId = dto.propertyId ?? this.activePropertyId;
        const response = await fetch(this.getUrl('/invoices'), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                ...dto,
                propertyId: propId ?? undefined,
            }),
        });
        const item = await this.parseResponse<any>(response);
        return {
            id: String(item.id),
            invoiceNumber: item.invoiceNumber,
            tenantUid: item.tenantUid,
            tenantName: item.tenantName,
            roomNumber: item.roomNo,
            roomNo: item.roomNo,
            monthYear: item.monthYear,
            amount: item.amount,
            paidAmount: item.paidAmount ?? 0,
            remainingBalance: item.remainingBalance ?? Math.max(0, item.amount - (item.paidAmount ?? 0)),
            dueDate: item.dueDate,
            status: (item.status || 'pending').toLowerCase() as any,
            paidOn: item.paidOn,
            paymentMode: item.paymentMode,
            transactionRef: item.transactionRef,
            createdAt: item.createdAt,
            propertyId: item.propertyId,
        };
    }

    public async generateCycleInvoices(monthYear: string, dueDate: string, propertyId?: number): Promise<any> {
        const propId = propertyId ?? this.activePropertyId;
        const response = await fetch(this.getUrl('/invoices/generate-cycle'), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                monthYear,
                dueDate,
                propertyId: propId ?? undefined,
            }),
        });
        return this.parseResponse<any>(response);
    }

    public async recordPayment(
        invoiceId: string,
        paymentMode: string,
        transactionRef?: string,
        paidOn?: string,
        amount?: number,
        idempotencyKey?: string
    ): Promise<Invoice> {
        const effectiveKey = idempotencyKey || `PAY-${invoiceId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const response = await fetch(this.getUrl(`/invoices/${encodeURIComponent(invoiceId)}/pay`), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                paymentMode,
                transactionRef: transactionRef || undefined,
                paidOn: paidOn || undefined,
                amount: amount && amount > 0 ? amount : undefined,
                idempotencyKey: effectiveKey,
            }),
        });
        const item = await this.parseResponse<any>(response);
        return {
            id: String(item.id),
            invoiceNumber: item.invoiceNumber,
            tenantUid: item.tenantUid,
            tenantName: item.tenantName,
            roomNumber: item.roomNo,
            roomNo: item.roomNo,
            monthYear: item.monthYear,
            amount: item.amount,
            paidAmount: item.paidAmount ?? 0,
            remainingBalance: item.remainingBalance ?? Math.max(0, item.amount - (item.paidAmount ?? 0)),
            dueDate: item.dueDate,
            status: (item.status || 'pending').toLowerCase() as any,
            paidOn: item.paidOn,
            paymentMode: item.paymentMode,
            transactionRef: item.transactionRef,
            createdAt: item.createdAt,
            propertyId: item.propertyId,
        };
    }

    public async createAuthoritativePayment(paymentReq: PaymentRequest): Promise<Payment> {
        const effectiveKey = paymentReq.idempotencyKey || `PAY-${paymentReq.invoiceId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const response = await fetch(this.getUrl('/payments'), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                ...paymentReq,
                idempotencyKey: effectiveKey,
            }),
        });
        return this.parseResponse<Payment>(response);
    }

    public async getPaymentsForInvoice(invoiceId: string | number): Promise<Payment[]> {
        const response = await fetch(this.getUrl(`/payments/invoice/${encodeURIComponent(String(invoiceId))}`), {
            headers: this.getHeaders(),
        });
        return this.parseResponse<Payment[]>(response);
    }

    public async getLedgerByTenant(tenantUid: string): Promise<Transaction[]> {
        const response = await fetch(this.getUrl(`/ledger/tenant/${encodeURIComponent(tenantUid)}`), {
            headers: this.getHeaders(),
        });
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
            tenantUid: item.tenantUid,
            invoiceId: item.invoiceId,
            paymentId: item.paymentId,
        }));
    }

    public async getLedgerByInvoice(invoiceId: string | number): Promise<Transaction[]> {
        const response = await fetch(this.getUrl(`/ledger/invoice/${encodeURIComponent(String(invoiceId))}`), {
            headers: this.getHeaders(),
        });
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
            tenantUid: item.tenantUid,
            invoiceId: item.invoiceId,
            paymentId: item.paymentId,
        }));
    }

    public async getLedgerBalance(propertyId?: number): Promise<number> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/ledger/balance?propertyId=${propId}`) : this.getUrl('/ledger/balance');
        const response = await fetch(url, { headers: this.getHeaders() });
        const data = await this.parseResponse<{ runningBalance: number }>(response);
        return data.runningBalance ?? 0;
    }

    // =========================================================
    // REPORTS (/api/reports)
    // =========================================================

    public async getReportSummary(propertyId?: number): Promise<ReportSummary> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/reports/summary?propertyId=${propId}`) : this.getUrl('/reports/summary');
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<ReportSummary>(response);
    }

    public async getPropertyPerformanceReports(propertyId?: number): Promise<PropertyPerformanceReport[]> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/reports/property-performance?propertyId=${propId}`) : this.getUrl('/reports/property-performance');
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<PropertyPerformanceReport[]>(response);
    }

    public async getMonthlyIntakeReports(propertyId?: number, year?: string): Promise<MonthlyIntakeReport[]> {
        const propId = propertyId ?? this.activePropertyId;
        const params = new URLSearchParams();
        if (propId) params.append('propertyId', String(propId));
        if (year) params.append('year', year);
        const url = this.getUrl('/reports/monthly-intake' + (params.toString() ? `?${params.toString()}` : ''));
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<MonthlyIntakeReport[]>(response);
    }

    public async getDemographicsReports(propertyId?: number): Promise<DemographicsReport> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/reports/demographics?propertyId=${propId}`) : this.getUrl('/reports/demographics');
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<DemographicsReport>(response);
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
        const response = await fetch(this.getUrl('/ledger'), {
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
        const response = await fetch(this.getUrl('/system/clean-database'), {
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

    private mapPropertyResponse(p: any): Property {
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
            isDeleted: p.isDeleted,
            deletedAt: p.deletedAt,
            deletedBy: p.deletedBy,
            deletionReason: p.deletionReason,
            ttlExpiresAt: p.ttlExpiresAt,
            daysRemaining: p.daysRemaining,
            archiveSnapshotId: p.archiveSnapshotId,
        };
    }

    public async getProperties(includeDeleted: boolean = false): Promise<Property[]> {
        const response = await fetch(this.getUrl(`/properties?includeDeleted=${includeDeleted}`));
        const data = await this.parseResponse<any[]>(response);
        return data.map(p => this.mapPropertyResponse(p));
    }

    public async getArchivedProperties(): Promise<Property[]> {
        const response = await fetch(this.getUrl('/properties/archived'));
        const data = await this.parseResponse<any[]>(response);
        return data.map(p => this.mapPropertyResponse(p));
    }

    public async getPropertyById(id: number): Promise<Property> {
        const response = await fetch(this.getUrl(`/properties/${id}`));
        const p = await this.parseResponse<any>(response);
        return this.mapPropertyResponse(p);
    }

    public async createProperty(propertyData: Omit<Property, 'id'>): Promise<Property> {
        const response = await fetch(this.getUrl('/properties'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(propertyData),
        });
        const p = await this.parseResponse<any>(response);
        return this.mapPropertyResponse(p);
    }

    public async updateProperty(id: number, propertyData: Partial<Property>): Promise<Property> {
        const response = await fetch(this.getUrl(`/properties/${id}`), {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(propertyData),
        });
        const p = await this.parseResponse<any>(response);
        return this.mapPropertyResponse(p);
    }

    public async softDeleteProperty(id: number, data: PropertySoftDeleteRequest): Promise<Property> {
        const response = await fetch(this.getUrl(`/properties/${id}/soft-delete`), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        const p = await this.parseResponse<any>(response);
        return this.mapPropertyResponse(p);
    }

    public async restoreProperty(id: number): Promise<Property> {
        const response = await fetch(this.getUrl(`/properties/${id}/restore`), {
            method: 'POST',
            headers: this.getHeaders(),
        });
        const p = await this.parseResponse<any>(response);
        return this.mapPropertyResponse(p);
    }

    public async getPropertySnapshot(propertyId: number): Promise<PropertyArchiveSnapshot> {
        const response = await fetch(this.getUrl(`/properties/${propertyId}/snapshot`));
        return await this.parseResponse<PropertyArchiveSnapshot>(response);
    }

    public async deleteProperty(id: number): Promise<void> {
        const response = await fetch(this.getUrl(`/properties/${id}`), {
            method: 'DELETE',
        });
        await this.parseResponse<any>(response);
    }

    // =========================================================
    // USERS (/api/users)
    // =========================================================

    public async getUsers(): Promise<User[]> {
        const response = await fetch(this.getUrl('/users'));
        const data = await this.parseResponse<any[]>(response);
        return data.map((u): User => ({
            id: u.id,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            phone: u.phone,
            status: u.status,
        }));
    }

    public async getUserById(id: number): Promise<User> {
        const response = await fetch(this.getUrl(`/users/${id}`));
        const u = await this.parseResponse<any>(response);
        return {
            id: u.id,
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            phone: u.phone,
            status: u.status,
        };
    }

    public async createUser(userData: Omit<User, 'id'>): Promise<User> {
        const response = await fetch(this.getUrl('/users'), {
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
            phone: u.phone,
            status: u.status,
        };
    }

    public async updateUser(id: number, userData: Partial<User>): Promise<User> {
        const response = await fetch(this.getUrl(`/users/${id}`), {
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
            phone: u.phone,
            status: u.status,
        };
    }

    public async deleteUser(id: number): Promise<void> {
        const response = await fetch(this.getUrl(`/users/${id}`), {
            method: 'DELETE',
        });
        await this.parseResponse<any>(response);
    }

    // =========================================================
    // TENANT VERIFICATION (/api/tenants/{uid}/verify-advance)
    // =========================================================

    public async verifyTenantAdvance(uid: string, amount?: number): Promise<Tenant> {
        const body = amount != null ? JSON.stringify({ amount }) : '{}';
        const response = await fetch(
            this.getUrl(`/tenants/${encodeURIComponent(uid)}/verify-advance`),
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
    // VACATE REQUESTS (/api/vacate-requests)
    // =========================================================

    public async getVacateRequests(status?: string, propertyId?: number): Promise<VacateRequest[]> {
        const propId = propertyId ?? this.activePropertyId;
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (propId) params.append('propertyId', String(propId));

        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const response = await fetch(
            this.getUrl(`/vacate-requests${queryStr}`),
            { headers: this.getHeaders() }
        );

        if (!response.ok) {
            return [];
        }

        return await this.parseResponse<VacateRequest[]>(response);
    }

    public async submitVacateRequest(data: Partial<VacateRequest>): Promise<VacateRequest> {
        const response = await fetch(
            this.getUrl('/vacate-requests'),
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }
        );

        return await this.parseResponse<VacateRequest>(response);
    }

    public async approveVacateRequest(id: number): Promise<VacateRequest> {
        const response = await fetch(
            this.getUrl(`/vacate-requests/${id}/approve`),
            {
                method: 'PUT',
                headers: this.getHeaders(),
            }
        );

        return await this.parseResponse<VacateRequest>(response);
    }

    public async rejectVacateRequest(id: number, reason?: string): Promise<VacateRequest> {
        const response = await fetch(
            this.getUrl(`/vacate-requests/${id}/reject`),
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            }
        );

        return await this.parseResponse<VacateRequest>(response);
    }

    public async updateVacateCharges(
        id: number,
        maintenanceCharge: number,
        breakageCharge: number,
        notes?: string
    ): Promise<VacateRequest> {
        const response = await fetch(
            this.getUrl(`/vacate-requests/${id}/charges`),
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maintenanceCharge, breakageCharge, notes }),
            }
        );

        return await this.parseResponse<VacateRequest>(response);
    }

    public async completeVacateRequest(id: number): Promise<VacateRequest> {
        const response = await fetch(
            this.getUrl(`/vacate-requests/${id}/complete`),
            {
                method: 'PUT',
                headers: this.getHeaders(),
            }
        );

        return await this.parseResponse<VacateRequest>(response);
    }

    // =========================================================
    // WHATSAPP BUSINESS QUICK LINKS (/api/notifications/whatsapp)
    // =========================================================

    public async getWhatsAppWelcomePreview(tenantUid: string): Promise<WhatsAppPackage> {
        const response = await fetch(
            this.getUrl(`/notifications/whatsapp/welcome-preview/${encodeURIComponent(tenantUid)}`),
            { headers: this.getHeaders() }
        );

        return await this.parseResponse<WhatsAppPackage>(response);
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