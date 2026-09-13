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

export interface Room {
    roomNumber: string;
    floor: string | number;
    roomType?: string;
    rent: number;
    capacity: number; // Can be 1, 2, 3, 4, 5, 6, etc.
    occupied: number;
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
    monthlyRent: number;
    joinedDate: string;
    hometown: string;
    profession: string;
    category: 'working' | 'student' | 'other';
    aadharNumber?: string; // 12-digit continuous varchar in DB e.g. "548921049382"
    paymentStatus?: 'verified' | 'pending';
    status: 'confirmed' | 'notice' | 'pending';
}

export interface Admission {
    id: string;
    residentName: string;
    phone: string;
    email?: string;
    roomNumber: string;
    monthlyRent: number;
    moveInDate: string;
    hometown: string;
    profession?: string;
    category?: 'working' | 'student' | 'other';
    aadharNumber?: string; // 12-digit continuous varchar in DB e.g. "548921049382"
    status: 'confirmed' | 'pending';
    allocatedAt?: string;
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
    type: 'credit' | 'debit';
    accountHead: 'Rent Payment' | 'Security Deposit' | 'Maintenance Expense' | 'Utility Payment' | 'Vendor Payout';
    description: string;
    tenantOrVendor: string;
    amount: number;
    paymentMode: 'UPI' | 'NEFT' | 'Credit Card' | 'Cash';
    runningBalance: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    tenantName: string;
    roomNumber: string;
    monthYear: string;
    amount: number;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue';
    paidOn?: string;
    paymentMode?: string;
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

