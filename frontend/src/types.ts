export type PageId =
    | 'dashboard'
    | 'tenants'
    | 'admissions'
    | 'rooms'
    | 'rent-and-billing'
    | 'ledger'
    | 'reports'
    | 'settings'
    | 'payment-history';

export enum RoomTypeEnum {
    SINGLE = 'Single',
    DOUBLE = 'Double',
    TRIPLE = 'Triple',
    FOUR_SHARING = 'Four-Sharing',
    DORMITORY = 'Dormitory',
}

export const CAPACITY_TO_ROOM_TYPE_MAP: Record<number, RoomTypeEnum> = {
    1: RoomTypeEnum.SINGLE,
    2: RoomTypeEnum.DOUBLE,
    3: RoomTypeEnum.TRIPLE,
    4: RoomTypeEnum.FOUR_SHARING,
    5: RoomTypeEnum.DORMITORY,
};

export const ROOM_TYPE_TO_CAPACITY_MAP: Record<string, number> = {
    [RoomTypeEnum.SINGLE]: 1,
    'single': 1,
    'SINGLE': 1,
    [RoomTypeEnum.DOUBLE]: 2,
    'double': 2,
    'DOUBLE': 2,
    [RoomTypeEnum.TRIPLE]: 3,
    'triple': 3,
    'TRIPLE': 3,
    [RoomTypeEnum.FOUR_SHARING]: 4,
    'four-sharing': 4,
    'FOUR-SHARING': 4,
    [RoomTypeEnum.DORMITORY]: 5,
    'dormitory': 5,
    'DORMITORY': 5,
};

export const getRoomTypeForCapacity = (capacity: number): string => {
    if (CAPACITY_TO_ROOM_TYPE_MAP[capacity]) {
        return CAPACITY_TO_ROOM_TYPE_MAP[capacity];
    }
    if (capacity > 5) {
        return RoomTypeEnum.DORMITORY;
    }
    return `${capacity}-Sharing`;
};

export const getCapacityForRoomType = (roomType: string): number => {
    const trimmed = roomType?.trim();
    if (ROOM_TYPE_TO_CAPACITY_MAP[trimmed]) {
        return ROOM_TYPE_TO_CAPACITY_MAP[trimmed];
    }
    const lower = trimmed?.toLowerCase();
    if (ROOM_TYPE_TO_CAPACITY_MAP[lower]) {
        return ROOM_TYPE_TO_CAPACITY_MAP[lower];
    }
    return 1;
};

export interface Room {
    roomNumber: string;
    floor: string | number;
    roomType?: string;
    rent: number;
    capacity: number; // Can be 1, 2, 3, 4, 5, 6, etc.
    occupied: number;
    propertyId?: number;
    status: 'available' | 'full' | 'vacate_notice';
    vacateDate?: string;
    vacatingResident?: string;
    residents: string[];
    amenities?: string[];
}

export interface Tenant {
    id: string;
    name: string;
    phone: string;
    email: string;
    roomNumber: string;
    propertyId?: number;
    monthlyRent: number;
    advancePaid?: number;
    securityDeposit?: number;
    joinedDate: string;
    hometown: string;
    profession: string;
    category: 'working' | 'student' | 'other';
    aadharNumber?: string; // 12-digit continuous varchar in DB e.g. "548921049382"
    parentContact?: string;
    parentNumber?: string;
    paymentStatus?: 'verified' | 'pending';
    status: 'confirmed' | 'notice' | 'pending' | 'vacated' | 'inactive';
}

export interface Admission {
    id: string;
    residentName: string;
    phone: string;
    email?: string;
    parentContact?: string;
    parentNumber?: string;
    roomNumber: string;
    propertyId?: number;
    monthlyRent: number;
    moveInDate: string;
    hometown: string;
    profession?: string;
    category?: 'working' | 'student' | 'other';
    aadharNumber?: string; // 12-digit continuous varchar in DB e.g. "548921049382"
    status: 'confirmed' | 'pending' | 'vacated' | 'cancelled';
    tenantStatus?: string;
    allocatedAt?: string;
}

export interface TenantStayCheckResult {
    exists: boolean;
    hasActiveStay: boolean;
    activeRoomNo?: string;
    tenantUid?: string;
    tenantName?: string;
    aadhaarNo?: string;
    mobileNumber?: string;
    tenantType?: string;
    organizationName?: string;
    parentContact?: string;
    standardRent?: number;
    advancePaid?: number;
    lastStayFrom?: string;
    lastStayTo?: string;
    totalPreviousStays?: number;
}

export interface CriticalAction {
    id: string;
    code: string;
    badgeText: string;
    title: string;
    subtitle: string;
    primaryActionText: string;
}

export interface Transaction {
    id: string;
    date: string;
    referenceNumber: string;
    propertyId?: number;
    type: 'credit' | 'debit';
    accountHead: 'Rent Payment' | 'Security Deposit' | 'Maintenance Expense' | 'Utility Payment' | 'Vendor Payout';
    description: string;
    tenantOrVendor: string;
    amount: number;
    paymentMode: 'UPI' | 'NEFT' | 'Credit Card' | 'Cash' | string;
    runningBalance: number;
    tenantUid?: string;
    invoiceId?: number;
    paymentId?: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    tenantUid?: string;
    tenantName: string;
    roomNumber: string;
    roomNo?: string;
    propertyId?: number;
    monthYear: string;
    amount: number;
    paidAmount?: number;
    remainingBalance?: number;
    dueDate: string;
    status: 'paid' | 'partially_paid' | 'pending' | 'overdue';
    paidOn?: string;
    paymentMode?: string;
    transactionRef?: string;
    createdAt?: string;
}

export interface Payment {
    id?: number;
    paymentReference: string;
    invoiceId: number;
    invoiceNumber?: string;
    tenantUid: string;
    tenantName?: string;
    amount: number;
    paymentMode: string;
    transactionReference?: string;
    idempotencyKey: string;
    status: string;
    createdAt?: string;
    propertyId?: number;
    invoiceTotalAmount?: number;
    invoicePaidAmount?: number;
    invoiceRemainingBalance?: number;
    invoiceStatus?: string;
}

export interface PaymentRequest {
    invoiceId: number;
    tenantUid?: string;
    amount?: number;
    paymentMode: string;
    transactionReference?: string;
    idempotencyKey: string;
    paidOn?: string;
    propertyId?: number;
}

export interface Property {
    id: number;
    name: string;
    code: string;
    address?: string;
    city?: string;
    state?: string;
    propertyType?: string;
    totalFloors?: number;
    totalRooms?: number;
    contactNumber?: string;
    contactEmail?: string;
    status: string;
    isDeleted?: boolean;
    deletedAt?: string;
    deletedBy?: string;
    deletionReason?: string;
    ttlExpiresAt?: string;
    daysRemaining?: number;
    archiveSnapshotId?: number;
}

export interface PropertySoftDeleteRequest {
    confirmationName: string;
    adminPin: string;
    reason: string;
    ttlDays?: number;
    deletedBy?: string;
}

export interface PropertyArchiveSnapshot {
    id: number;
    propertyId: number;
    propertyName: string;
    propertyCode?: string;
    archivedBy: string;
    deletionReason?: string;
    ttlDays: number;
    totalRooms: number;
    totalResidents: number;
    totalRevenuePotential: number;
    totalAdvanceHeld: number;
    snapshotJson: string;
    archivedAt: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: string; // ADMIN | PROPERTY_MANAGER | STAFF
    phone?: string;
    status: string;
}

export interface TenantPaymentRecord {
    id: string;
    tenantId: string;
    tenantName: string;
    roomNumber: string;
    date: string;
    periodOrType: string;
    category: 'advance_deposit' | 'monthly_rent' | 'amenity_maintenance';
    amount: number;
    paymentMode: 'UPI' | 'NEFT' | 'Bank Transfer' | 'Cash' | 'Card';
    receiptNumber: string;
    referenceNumber: string;
    status: 'verified' | 'pending';
    notes?: string;
}

export interface VacateRequest {
    id: number;
    requestId: string;
    tenantUid?: string;
    tenantName: string;
    roomNo: string;
    mobileNumber: string;
    aadhaarNo?: string;
    propertyId?: number;
    requestDate: string;
    expectedLeavingDate: string;
    noticeDays: number;
    advancePaid: number;
    maintenanceCharge: number;
    breakageCharge: number;
    advanceRepayable: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
    reason?: string;
    notes?: string;
    calculationBreakdown?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface WhatsAppPackage {
    tenantUid: string;
    tenantName: string;
    phone: string;
    message: string;
    whatsappUrl: string;
    vacateFormUrl: string;
    payRentUrl: string;
    upiPayLink: string;
    receiptNumber: string;
}

export interface ReportSummary {
    totalTargetRent: number;
    totalCollectedRent: number;
    portfolioEfficiency: number;
    totalEnrolments: number;
    workingTenantsCount: number;
    otherTenantsCount: number;
    workingPercent: number;
    otherPercent: number;
    totalHometowns: number;
    topHometown: string;
    topHometownPercent: number;
}

export interface PropertyPerformanceReport {
    id: number;
    name: string;
    totalRooms: number;
    targetRent: number;
    collectedRent: number;
    rate: number;
    status: string;
}

export interface MonthlyIntakeReport {
    month: string;
    count: number;
    label: string;
}

export interface DemographicsReport {
    professions: {
        name: string;
        count: number;
        percent: number;
    }[];
    hometowns: {
        city: string;
        count: number;
        percent: number;
        color: string;
    }[];
}

