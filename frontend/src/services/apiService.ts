import {
    CriticalAction,
    Tenant,
    Admission,
    Room,
    Transaction,
    Invoice,
} from '../types';

import {
    INITIAL_CRITICAL_ACTIONS,
    INITIAL_TENANTS,
    INITIAL_ADMISSIONS,
    INITIAL_ROOMS,
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
    ACTIONS: 'rms_actions_v2',
    TRANSACTIONS: 'rms_transactions_v2',
    INVOICES: 'rms_invoices_v3',
};

class ApiService {
    private config: ApiConfig = {
        baseUrl: 'http://localhost:8080/api',
        useLiveBackend: true,
        syncLatencyMs: 12,
    };

    constructor() {
        this.loadConfig();
    }

    // ---------------------------------------------------------
    // CONFIGURATION
    // ---------------------------------------------------------

    private loadConfig(): void {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);

            if (saved) {
                this.config = {
                    ...this.config,
                    ...JSON.parse(saved),
                };
            }
        } catch {
            // Keep default configuration.
        }
    }

    public getConfig(): ApiConfig {
        return { ...this.config };
    }

    public updateConfig(newConfig: Partial<ApiConfig>): void {
        this.config = {
            ...this.config,
            ...newConfig,
        };

        localStorage.setItem(
            STORAGE_KEYS.CONFIG,
            JSON.stringify(this.config)
        );
    }

    // ---------------------------------------------------------
    // COMMON HTTP HELPERS
    // ---------------------------------------------------------

    private getUrl(path: string): string {
        return `${this.config.baseUrl}${path}`;
    }

    private async parseResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const errorText = await response.text();

            throw new Error(
                `HTTP ${response.status}: ${errorText || response.statusText}`
            );
        }

        return response.json() as Promise<T>;
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
            INITIAL_CRITICAL_ACTIONS
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
    // TENANTS
    // =========================================================

    public async getTenants(): Promise<Tenant[]> {
        const response = await fetch(
            this.getUrl('/tenants')
        );

        const data = await this.parseResponse<any[]>(response);

        return data.map((item): Tenant => ({
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
                item.paymentStatus === 'VERIFIED'
                    ? 'verified'
                    : 'pending',
            status:
                item.status === 'ACTIVE'
                    ? 'confirmed'
                    : 'pending',
            aadharNumber: item.aadhaarNo ?? '',
        }));
    }

    public async addTenant(
        tenant: Omit<Tenant, 'id'>
    ): Promise<Tenant> {
        const requestBody = {
            name: tenant.name,
            aadhaarNo: tenant.aadharNumber,
            mobileNumber: tenant.phone,
            tenantType:
                tenant.category === 'working'
                    ? 'WORKING'
                    : 'STUDENT',
            organizationName: tenant.profession || '',
            parentContact: null,
            advancePaid: 0,
            standardRent: tenant.monthlyRent,
            roomNo: tenant.roomNumber,
            enrollmentDate: tenant.joinedDate,
            remarks: null,
        };

        const response = await fetch(
            this.getUrl('/tenants'),
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            }
        );

        const item = await this.parseResponse<any>(response);

        return {
            id: item.uid,
            name: item.name,
            phone: item.mobileNumber,
            email: item.email ?? '',
            roomNumber: item.roomNo,
            monthlyRent: item.standardRent ?? item.rent ?? 0,
            joinedDate:
                item.joinedDate ??
                item.enrollmentDate ??
                '',
            hometown: item.hometown ?? '',
            profession: item.organizationName ?? '',
            category:
                item.tenantType === 'STUDENT'
                    ? 'student'
                    : 'working',
            paymentStatus:
                item.paymentStatus === 'VERIFIED'
                    ? 'verified'
                    : 'pending',
            status:
                item.status === 'ACTIVE'
                    ? 'confirmed'
                    : 'pending',
            aadharNumber: item.aadhaarNo ?? '',
        };
    }

    // =========================================================
    // ADMISSIONS
    // =========================================================

    public async getAdmissions(): Promise<Admission[]> {
        const response = await fetch(
            this.getUrl('/admissions')
        );

        const data = await this.parseResponse<any[]>(response);

        return data.map(
            (item): Admission => ({
                id: item.admissionNumber,
                residentName: item.tenantName,
                phone: item.mobileNumber,
                email: '',
                roomNumber: item.roomNo,
                monthlyRent: item.roomRent ?? 0,
                moveInDate: item.enrollmentDate,
                hometown: '',
                profession: '',
                category:
                    item.tenantType === 'STUDENT'
                        ? 'student'
                        : 'working',
                aadharNumber: item.aadhaarNo,
                status:
                    item.status === 'PAID'
                        ? 'confirmed'
                        : 'pending',
                allocatedAt: item.confirmedOn
                    ? new Date(
                        item.confirmedOn
                    ).toLocaleString('en-IN')
                    : undefined,
            })
        );
    }

    public async createAdmission(
        admissionData: Omit<
            Admission,
            'id' | 'allocatedAt'
        >
    ): Promise<Admission> {
        console.log(
            '[ApiService] Creating admission:',
            admissionData
        );

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
            parentContact: null,
            advancePaid: 0,
            standardRent: admissionData.monthlyRent,
            roomNo: admissionData.roomNumber,
            enrollmentDate: admissionData.moveInDate,
            remarks: null,
        };

        console.log(
            '[ApiService] POST /admissions:',
            requestBody
        );

        const response = await fetch(
            this.getUrl('/admissions'),
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            }
        );

        const item =
            await this.parseResponse<any>(response);

        console.log(
            '[ApiService] Admission created:',
            item
        );

        return {
            id: item.admissionNumber,
            residentName: item.tenantName,
            phone: item.mobileNumber,
            email: '',
            roomNumber: item.roomNo,
            monthlyRent: item.roomRent ?? 0,
            moveInDate: item.enrollmentDate,
            hometown: '',
            profession:
                item.organizationName ?? '',
            category:
                item.tenantType === 'STUDENT'
                    ? 'student'
                    : 'working',
            aadharNumber: item.aadhaarNo,
            status:
                item.status === 'PAID'
                    ? 'confirmed'
                    : 'pending',
            allocatedAt: item.confirmedOn
                ? new Date(
                    item.confirmedOn
                ).toLocaleString('en-IN')
                : undefined,
        };
    }

    // =========================================================
    // ROOMS
    // =========================================================

    public async getRooms(): Promise<Room[]> {
        const response = await fetch(
            this.getUrl('/rooms')
        );

        const data = await this.parseResponse<any[]>(response);

        return data.map(
            (item): Room => ({
                roomNumber: item.roomNo,
                floor: String(item.floor ?? 0),
                roomType: item.roomType ?? '',
                rent: item.rentPerMonth ?? 0,
                capacity: item.occupancy ?? 0,
                occupied: item.currentOccupancy ?? 0,

                status:
                    item.currentOccupancy >= item.occupancy
                        ? 'full'
                        : 'available',

                residents: item.residents ?? [],
            })
        );
    }

    public async updateRoom(
        roomNumber: string,
        roomData: {
            floor: string;
            roomType: string;
            rentPerMonth: number;
            occupancy: number;
            available: boolean;
        }
    ): Promise<Room> {
        const response = await fetch(
            this.getUrl(
                `/rooms/${encodeURIComponent(roomNumber)}`
            ),
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomNo: roomNumber,
                    ...roomData,
                }),
            }
        );

        const item =
            await this.parseResponse<any>(response);

        return {
            roomNumber: item.roomNo,
            floor: String(item.floor ?? ''),
            rent: item.rentPerMonth ?? 0,
            capacity: item.occupancy ?? 0,
            occupied: item.currentOccupancy ?? 0,
            roomType: item.roomType ?? 'Single',
            status:
                item.currentOccupancy >= item.occupancy
                    ? 'full'
                    : 'available',
            residents: item.residents ?? [],
        };
    }

    public async createRoom(roomData: {
        roomNo: string;
        floor: string;
        roomType: string;
        rentPerMonth: number;
        occupancy: number;
        available: boolean;
    }): Promise<Room> {
        const response = await fetch(
            this.getUrl('/rooms'),
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(roomData),
            }
        );

        const item =
            await this.parseResponse<any>(response);

        return {
            roomNumber: item.roomNo,
            floor: String(item.floor ?? 0),
            rent: item.rentPerMonth ?? 0,
            capacity: item.occupancy ?? 0,
            occupied: item.currentOccupancy ?? 0,
            roomType: item.roomType ?? 'Single',

            status:
                item.currentOccupancy >= item.occupancy
                    ? 'full'
                    : 'available',

            residents: item.residents ?? [],
        };
    }

    //Delete Room 

    public async deleteRoom(
        roomNumber: string
    ): Promise<void> {
        const response = await fetch(
            this.getUrl(
                `/rooms/${encodeURIComponent(roomNumber)}`
            ),
            {
                method: 'DELETE',
            }
        );

        await this.parseResponse<string>(response);
    }

    public async allocateRoom(
        roomNumber: string,
        tenantName: string
    ): Promise<Room> {
        const currentRoom = await this.getRooms();

        const room = currentRoom.find(
            item =>
                item.roomNumber === roomNumber
        );

        if (!room) {
            throw new Error(
                `Room ${roomNumber} not found`
            );
        }

        const response = await fetch(
            this.getUrl(`/rooms/${encodeURIComponent(roomNumber)}`),
            {
                method: 'PUT',
                headers: {
                    'Content-Type':
                        'application/json',
                },
                body: JSON.stringify({
                    roomNo: room.roomNumber,
                    floor: room.floor,
                    roomType: room.roomType ?? '',
                    rentPerMonth: room.rent,
                    occupancy: room.capacity,
                    available: room.occupied + 1 < room.capacity,
                    currentOccupancy: room.occupied + 1,
                    residents: [
                        ...room.residents,
                        tenantName,
                    ],
                }),
            }
        );

        const item =
            await this.parseResponse<any>(response);

        return {
            roomNumber: item.roomNo ?? item.roomNumber,
            floor: String(item.floor ?? ''),
            roomType: item.roomType ?? '',
            capacity: item.occupancy ?? 0,
            occupied: item.currentOccupancy ?? 0,
            status:
                (item.currentOccupancy ?? 0) >= (item.occupancy ?? 1)
                    ? 'full'
                    : 'available',
            residents: item.residents ?? [],
            rent: item.rentPerMonth ?? 0,
        };
    }

    // =========================================================
    // FINANCE
    // =========================================================

    public async getTransactions(): Promise<Transaction[]> {
        return this.getStorage(
            STORAGE_KEYS.TRANSACTIONS,
            INITIAL_TRANSACTIONS
        );
    }

    public async getInvoices(): Promise<Invoice[]> {
        return this.getStorage(
            STORAGE_KEYS.INVOICES,
            INITIAL_INVOICES
        );
    }

    public async recordPayment(
        invoiceId: string,
        paymentMode: string
    ): Promise<void> {
        const invoices = await this.getInvoices();

        let paidAmount = 0;
        let tenantName = '';
        let roomNumber = '';

        const updatedInvoices =
            invoices.map(inv => {
                if (inv.id === invoiceId) {
                    paidAmount = inv.amount;
                    tenantName =
                        inv.tenantName;
                    roomNumber =
                        inv.roomNumber;

                    return {
                        ...inv,
                        status: 'paid' as const,
                        paidOn:
                            new Date().toLocaleDateString(
                                'en-GB',
                                {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                }
                            ),
                        paymentMode,
                    };
                }

                return inv;
            });

        this.setStorage(
            STORAGE_KEYS.INVOICES,
            updatedInvoices
        );

        const transactions =
            await this.getTransactions();

        const lastBalance =
            transactions[0]?.runningBalance ??
            450000;

        const newTransaction: Transaction = {
            id: `tx-${Date.now()}`,
            date:
                new Date().toLocaleDateString(
                    'en-GB',
                    {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                    }
                ) +
                ' • ' +
                new Date().toLocaleTimeString(
                    'en-US',
                    {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                    }
                ) +
                ' IST',
            referenceNumber:
                `${paymentMode}/` +
                Math.floor(
                    10000000000 +
                    Math.random() *
                    90000000000
                ),
            type: 'credit',
            accountHead: 'Rent Payment',
            description:
                `Monthly Rent - ${roomNumber} (${tenantName})`,
            tenantOrVendor: tenantName,
            amount: paidAmount,
            paymentMode: paymentMode as any,
            runningBalance:
                lastBalance + paidAmount,
        };

        this.setStorage(
            STORAGE_KEYS.TRANSACTIONS,
            [
                newTransaction,
                ...transactions,
            ]
        );
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