import {
    CriticalAction,
    Tenant,
    Admission,
    Room,
    Block,
    Floor,
    Bed,
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
    AnalyticsKpis,
    RoomTypeYield,
    RevenueTrend,
    DefaulterAgingReport,
    SecurityDepositReport,
    TurnoverAnalytics,
    TenantMonthlyPayItem,
    Payment,
    PaymentRequest,
    RazorpayOrderResponse,
    RazorpayVerifyRequest,
    PublicInvoice,
    RentReminderItem,
    SendReminderRequest,
    SendReminderResult,
    ReminderStats,
    ReminderLog,
    ReminderSchedulerConfig,
    ReminderSchedulerRunResult,
    ReminderSchedulerRun,
} from '../types';

export interface ApiConfig {
    baseUrl: string;
    useLiveBackend: boolean;
    syncLatencyMs: number;
}

const STORAGE_KEYS = {
    CONFIG: 'rms_api_config',
    ACTIVE_PROPERTY: 'rms_active_property_id',
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
            bedId: item.bedId,
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
            bedId: item.bedId,
            bedNumber: item.bedNumber,
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
        return [];
    }

    public async dismissCriticalAction(_id: string): Promise<void> {
        // No-op for real backend integration
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
            aadhaarNo: tenant.aadharNumber || '',
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
            organizationName: tenantData.profession || '',
            parentContact: tenantData.parentContact || tenantData.parentNumber || null,
            advancePaid: 0,
            standardRent: tenantData.monthlyRent ?? 0,
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
            bedId: admissionData.bedId ?? undefined,
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
                id: item.id,
                roomNumber: item.roomNo,
                floor: String(item.floor ?? 0),
                floorId: item.floorId,
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
            id: item.id,
            roomNumber: item.roomNo,
            floor: String(item.floor ?? 0),
            floorId: item.floorId,
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
        blockId?: number;
        floorId?: number;
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
            id: item.id,
            roomNumber: item.roomNo,
            floor: String(item.floor ?? 0),
            floorId: item.floorId,
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
    // BLOCKS, FLOORS & BEDS (/api/properties/:id/blocks, /api/blocks/:id/floors, /api/rooms/:roomNo/beds, /api/beds/:id/status)
    // =========================================================

    public async getBlocks(propertyId?: number): Promise<Block[]> {
        const propId = propertyId ?? this.activePropertyId;
        if (!propId) return [];
        const response = await fetch(this.getUrl(`/properties/${propId}/blocks`), {
            headers: this.getHeaders(),
        });
        return await this.parseResponse<Block[]>(response);
    }

    public async createBlock(propertyId: number, data: { name: string; code: string }): Promise<Block> {
        const response = await fetch(this.getUrl(`/properties/${propertyId}/blocks`), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return await this.parseResponse<Block>(response);
    }

    public async getFloors(blockId: number): Promise<Floor[]> {
        const response = await fetch(this.getUrl(`/blocks/${blockId}/floors`), {
            headers: this.getHeaders(),
        });
        return await this.parseResponse<Floor[]>(response);
    }

    public async createFloor(blockId: number, data: { floorNumber: number; name?: string }): Promise<Floor> {
        const response = await fetch(this.getUrl(`/blocks/${blockId}/floors`), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return await this.parseResponse<Floor>(response);
    }

    public async getRoomBeds(roomNo: string): Promise<Bed[]> {
        const response = await fetch(
            this.getUrl(`/rooms/${encodeURIComponent(roomNo)}/beds`),
            { headers: this.getHeaders() }
        );
        return await this.parseResponse<Bed[]>(response);
    }

    public async updateBedStatus(
        bedId: number,
        status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE'
    ): Promise<Bed> {
        const response = await fetch(this.getUrl(`/beds/${bedId}/status`), {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify({ status }),
        });
        return await this.parseResponse<Bed>(response);
    }

    public async initializePropertyHierarchy(propertyId?: number): Promise<any> {
        const propId = propertyId ?? this.activePropertyId;
        if (!propId) throw new Error('No active property ID');
        const response = await fetch(this.getUrl(`/properties/${propId}/initialize-hierarchy`), {
            method: 'POST',
            headers: this.getHeaders(),
        });
        return await this.parseResponse<any>(response);
    }

    public async getPropertyFloors(propertyId?: number): Promise<Floor[]> {
        const propId = propertyId ?? this.activePropertyId;
        if (!propId) return [];
        const response = await fetch(this.getUrl(`/properties/${propId}/floors`), {
            headers: this.getHeaders(),
        });
        return await this.parseResponse<Floor[]>(response);
    }

    public async getPropertyHierarchy(propertyId?: number): Promise<any> {
        const propId = propertyId ?? this.activePropertyId;
        if (!propId) return null;
        const response = await fetch(this.getUrl(`/properties/${propId}/hierarchy`), {
            headers: this.getHeaders(),
        });
        return await this.parseResponse<any>(response);
    }

    public async getBlock(blockId: number): Promise<Block> {
        const response = await fetch(this.getUrl(`/blocks/${blockId}`), {
            headers: this.getHeaders(),
        });
        return await this.parseResponse<Block>(response);
    }

    public async updateBlock(blockId: number, data: Partial<Block>): Promise<Block> {
        const response = await fetch(this.getUrl(`/blocks/${blockId}`), {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return await this.parseResponse<Block>(response);
    }

    public async deleteBlock(blockId: number): Promise<void> {
        const response = await fetch(this.getUrl(`/blocks/${blockId}`), {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.parseResponse<any>(response);
    }

    public async getFloor(floorId: number): Promise<Floor> {
        const response = await fetch(this.getUrl(`/floors/${floorId}`), {
            headers: this.getHeaders(),
        });
        return await this.parseResponse<Floor>(response);
    }

    public async updateFloor(floorId: number, data: Partial<Floor>): Promise<Floor> {
        const response = await fetch(this.getUrl(`/floors/${floorId}`), {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return await this.parseResponse<Floor>(response);
    }

    public async deleteFloor(floorId: number): Promise<void> {
        const response = await fetch(this.getUrl(`/floors/${floorId}`), {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        await this.parseResponse<any>(response);
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

    public async getTenantMonthlyLedger(params?: {
        tenantUid?: string;
        search?: string;
        monthYear?: string;
        propertyId?: number;
    }): Promise<TenantMonthlyPayItem[]> {
        const propId = params?.propertyId ?? this.activePropertyId;
        const query = new URLSearchParams();
        if (propId) query.append('propertyId', String(propId));
        if (params?.tenantUid) query.append('tenantUid', params.tenantUid);
        if (params?.search) query.append('search', params.search);
        if (params?.monthYear) query.append('monthYear', params.monthYear);

        const url = this.getUrl('/invoices/tenant-monthly-ledger' + (query.toString() ? `?${query.toString()}` : ''));
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<TenantMonthlyPayItem[]>(response);
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

    public async getAnalyticsKpis(propertyId?: number): Promise<AnalyticsKpis> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/reports/analytics/kpis?propertyId=${propId}`) : this.getUrl('/reports/analytics/kpis');
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<AnalyticsKpis>(response);
    }

    public async getRoomTypeYields(propertyId?: number): Promise<RoomTypeYield[]> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/reports/analytics/room-type-yield?propertyId=${propId}`) : this.getUrl('/reports/analytics/room-type-yield');
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<RoomTypeYield[]>(response);
    }

    public async getRevenueTrends(propertyId?: number, months: number = 6): Promise<RevenueTrend[]> {
        const propId = propertyId ?? this.activePropertyId;
        const params = new URLSearchParams();
        if (propId) params.append('propertyId', String(propId));
        params.append('months', String(months));
        const url = this.getUrl(`/reports/analytics/revenue-trends?${params.toString()}`);
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<RevenueTrend[]>(response);
    }

    public async getDefaultersAging(propertyId?: number): Promise<DefaulterAgingReport> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/reports/analytics/defaulters-aging?propertyId=${propId}`) : this.getUrl('/reports/analytics/defaulters-aging');
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<DefaulterAgingReport>(response);
    }

    public async getSecurityDepositsReport(propertyId?: number): Promise<SecurityDepositReport> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/reports/analytics/deposits-custody?propertyId=${propId}`) : this.getUrl('/reports/analytics/deposits-custody');
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<SecurityDepositReport>(response);
    }

    public async getTurnoverAnalytics(propertyId?: number): Promise<TurnoverAnalytics> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/reports/analytics/turnover?propertyId=${propId}`) : this.getUrl('/reports/analytics/turnover');
        const response = await fetch(url, { headers: this.getHeaders() });
        return await this.parseResponse<TurnoverAnalytics>(response);
    }

    public async downloadReportCsv(reportType: 'rent-roll' | 'defaulters' | 'deposits' | 'ledger', propertyId?: number): Promise<void> {
        const propId = propertyId ?? this.activePropertyId;
        const url = propId ? this.getUrl(`/reports/export/${reportType}?propertyId=${propId}`) : this.getUrl(`/reports/export/${reportType}`);
        const response = await fetch(url, { headers: this.getHeaders() });
        if (!response.ok) {
            throw new Error(`Failed to download report: ${response.statusText}`);
        }
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
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
     * Wipes all backend database mock/transactional records and clears local storage.
     */
    public async cleanDatabase(): Promise<{ status: string; message: string; timestamp: string }> {
        const response = await fetch(this.getUrl('/system/clean-database'), {
            method: 'POST',
            headers: this.getHeaders(),
        });
        const result = await this.parseResponse<{ status: string; message: string; timestamp: string }>(response);
        this.resetAllData();
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
        const propId = data.propertyId ?? this.activePropertyId;
        const response = await fetch(
            this.getUrl('/vacate-requests'),
            {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    ...data,
                    propertyId: propId ?? undefined,
                }),
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
                headers: this.getHeaders(),
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
                headers: this.getHeaders(),
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
    // RAZORPAY 3RD-PARTY GATEWAY & PUBLIC INVOICES
    // =========================================================

    public async getPublicInvoice(invoiceNumber: string): Promise<PublicInvoice> {
        const response = await fetch(
            this.getUrl(`/public/invoices/${encodeURIComponent(invoiceNumber)}`),
            { headers: { 'Content-Type': 'application/json' } }
        );

        return await this.parseResponse<PublicInvoice>(response);
    }

    public async createRazorpayOrder(invoiceNumber: string, amount?: number): Promise<RazorpayOrderResponse> {
        const response = await fetch(
            this.getUrl('/payments/razorpay/create-order'),
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceNumber, amount }),
            }
        );

        return await this.parseResponse<RazorpayOrderResponse>(response);
    }

    public async verifyRazorpayPayment(payload: RazorpayVerifyRequest): Promise<Payment> {
        const response = await fetch(
            this.getUrl('/payments/razorpay/verify-payment'),
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }
        );

        return await this.parseResponse<Payment>(response);
    }

    // =========================================================
    // AUTOMATED RENT REMINDERS & COLLECTION DISPATCH
    // =========================================================

    public async getRentRemindersQueue(category?: string, propertyId?: number): Promise<RentReminderItem[]> {
        const queryParams = new URLSearchParams();
        if (category && category !== 'ALL') {
            queryParams.append('category', category);
        }
        const effectivePropId = propertyId ?? this.activePropertyId;
        if (effectivePropId != null) {
            queryParams.append('propertyId', String(effectivePropId));
        }

        const query = queryParams.toString();
        const url = this.getUrl(`/notifications/reminders/queue${query ? `?${query}` : ''}`);

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        return await this.parseResponse<RentReminderItem[]>(response);
    }

    public async dispatchRentReminders(request: SendReminderRequest, propertyId?: number): Promise<SendReminderResult> {
        const queryParams = new URLSearchParams();
        const effectivePropId = propertyId ?? this.activePropertyId;
        if (effectivePropId != null) {
            queryParams.append('propertyId', String(effectivePropId));
        }

        const query = queryParams.toString();
        const url = this.getUrl(`/notifications/reminders/send${query ? `?${query}` : ''}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(request),
        });

        return await this.parseResponse<SendReminderResult>(response);
    }

    public async getReminderStats(propertyId?: number): Promise<ReminderStats> {
        const queryParams = new URLSearchParams();
        const effectivePropId = propertyId ?? this.activePropertyId;
        if (effectivePropId != null) {
            queryParams.append('propertyId', String(effectivePropId));
        }

        const query = queryParams.toString();
        const url = this.getUrl(`/notifications/reminders/stats${query ? `?${query}` : ''}`);

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        return await this.parseResponse<ReminderStats>(response);
    }

    public async getReminderLogs(params?: { propertyId?: number; tenantUid?: string; invoiceId?: number }): Promise<ReminderLog[]> {
        const queryParams = new URLSearchParams();
        const effectivePropId = params?.propertyId ?? this.activePropertyId;
        if (effectivePropId != null) {
            queryParams.append('propertyId', String(effectivePropId));
        }
        if (params?.tenantUid) {
            queryParams.append('tenantUid', params.tenantUid);
        }
        if (params?.invoiceId != null) {
            queryParams.append('invoiceId', String(params.invoiceId));
        }

        const query = queryParams.toString();
        const url = this.getUrl(`/notifications/reminders/logs${query ? `?${query}` : ''}`);

        const response = await fetch(url, {
            headers: this.getHeaders(),
        });

        return await this.parseResponse<ReminderLog[]>(response);
    }

    // =========================================================
    // AUTOMATED MORNING CRON SCHEDULER
    // =========================================================

    public async getReminderSchedulerConfig(): Promise<ReminderSchedulerConfig> {
        const url = this.getUrl('/notifications/reminders/scheduler/config');
        const response = await fetch(url, {
            headers: this.getHeaders(),
        });
        return await this.parseResponse<ReminderSchedulerConfig>(response);
    }

    public async updateReminderSchedulerConfig(config: Partial<ReminderSchedulerConfig>): Promise<ReminderSchedulerConfig> {
        const url = this.getUrl('/notifications/reminders/scheduler/config');
        const response = await fetch(url, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(config),
        });
        return await this.parseResponse<ReminderSchedulerConfig>(response);
    }

    public async triggerReminderSchedulerRun(propertyId?: number): Promise<ReminderSchedulerRunResult> {
        const queryParams = new URLSearchParams();
        const effectivePropId = propertyId ?? this.activePropertyId;
        if (effectivePropId != null) {
            queryParams.append('propertyId', String(effectivePropId));
        }
        const query = queryParams.toString();
        const url = this.getUrl(`/notifications/reminders/scheduler/trigger${query ? `?${query}` : ''}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
        });
        return await this.parseResponse<ReminderSchedulerRunResult>(response);
    }

    public async getReminderSchedulerRuns(limit = 15): Promise<ReminderSchedulerRun[]> {
        const url = this.getUrl(`/notifications/reminders/scheduler/runs?limit=${limit}`);
        const response = await fetch(url, {
            headers: this.getHeaders(),
        });
        return await this.parseResponse<ReminderSchedulerRun[]>(response);
    }

    // =========================================================
    // RESET
    // =========================================================

    public resetAllData(): void {
        localStorage.removeItem('rms_actions_v2');
        localStorage.removeItem('rms_transactions_v2');
        localStorage.removeItem('rms_invoices_v3');
    }
}

export const apiService =
    new ApiService();