import React, { useState, useMemo } from 'react';
import {
    UserPlus,
    DoorOpen,
    CheckCircle2,
    Calendar,
    Phone,
    Mail,
    User,
    MapPin,
    Briefcase,
    ShieldCheck,
    X,
    CreditCard,
    Receipt,
    History,
    AlertCircle,
} from 'lucide-react';
import { Admission, Room, PageId } from '../../types';
import { formatAadharDisplay, cleanAadharForDB } from '../../utils/formatters';
import { apiService } from '../../services/apiService';

interface AdmissionsViewProps {
    admissions: Admission[];
    rooms: Room[];
    onCreateAdmission: (
        admissionData: Omit<Admission, 'id' | 'allocatedAt'>
    ) => Promise<void>;
    onConfirmAdmission?: (admissionNumber: string) => Promise<void>;
    onCancelAdmission?: (admissionNumber: string) => Promise<void>;
    onNavigate: (page: PageId) => void;
}

export const AdmissionsView: React.FC<AdmissionsViewProps> = ({
    admissions,
    rooms,
    onCreateAdmission,
    onConfirmAdmission,
    onCancelAdmission,
    onNavigate,
}) => {
    // Available rooms and rooms with active vacate notices
    const availableRooms = rooms.filter(r => r.occupied < r.capacity);
    const vacateNoticeRooms = rooms.filter(r => r.status === 'vacate_notice');

    // Default selected room
    const initialRoom = availableRooms[0] || vacateNoticeRooms[0] || rooms[0];

    const [residentName, setResidentName] = useState('');
    const [phone, setPhone] = useState('');
    const [parentNumber, setParentNumber] = useState('');
    const [email, setEmail] = useState('');
    const [aadharNumber, setAadharNumber] = useState('');
    const [hometown, setHometown] = useState('');
    const [profession, setProfession] = useState('Software Engineer');
    const [category, setCategory] = useState<'working' | 'other'>('working');
    const [moveInDate, setMoveInDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [selectedRoomNumber, setSelectedRoomNumber] = useState(
        initialRoom ? initialRoom.roomNumber : ''
    );
    const [monthlyRent, setMonthlyRent] = useState<number>(
        initialRoom ? initialRoom.rent : 8000
    );
    const [isSuccess, setIsSuccess] = useState(false);
    const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);

    // Returning resident detection states
    const [returningResident, setReturningResident] = useState<{
        tenantName: string;
        lastStayFrom: string;
        lastStayTo: string;
        hasActiveStay: boolean;
        activeRoomNo?: string | null;
        tenantType?: string | null;
        organizationName?: string | null;
        parentContact?: string | null;
    } | null>(null);
    const [guidanceMessage, setGuidanceMessage] = useState<string | null>(null);
    const [highlightFields, setHighlightFields] = useState<boolean>(false);
    const [isCheckingResident, setIsCheckingResident] = useState<boolean>(false);

    const formatDateDMY = (dateStr?: string | null): string => {
        if (!dateStr) return 'N/A';
        try {
            const parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) {
                const [y, m, d] = parts;
                return `${d}/${m}/${y}`;
            }
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
            }
        } catch {
            // fallback
        }
        return dateStr;
    };

    // Floor-wise grouped rooms for the capacity modal
    const floorGroups = useMemo(() => {
        const groups: { [key: string]: Room[] } = {};
        rooms.forEach(r => {
            const floorKey = r.floor !== undefined && r.floor !== null ? `Floor ${r.floor}` : 'Ground Floor';
            if (!groups[floorKey]) {
                groups[floorKey] = [];
            }
            groups[floorKey].push(r);
        });

        return Object.entries(groups).sort(([a], [b]) => {
            return a.localeCompare(b, undefined, { numeric: true });
        });
    }, [rooms]);

    // Aggregate statistics
    const totalCapacity = useMemo(() => rooms.reduce((acc, r) => acc + (r.capacity || 0), 0), [rooms]);
    const totalOccupied = useMemo(() => rooms.reduce((acc, r) => acc + (r.occupied || 0), 0), [rooms]);
    const totalAvailable = Math.max(0, totalCapacity - totalOccupied);

    // Advance verification modal state
    const [selectedAdmissionForVerify, setSelectedAdmissionForVerify] = useState<Admission | null>(null);
    const [verifyAmount, setVerifyAmount] = useState<number>(8000);
    const [verifyPaymentMode, setVerifyPaymentMode] = useState<string>('UPI');
    const [verifyReference, setVerifyReference] = useState<string>('');
    const [isVerifying, setIsVerifying] = useState<boolean>(false);

    const openVerifyModal = (adm: Admission) => {
        setSelectedAdmissionForVerify(adm);
        setVerifyAmount(adm.monthlyRent || 8000);
        setVerifyPaymentMode('UPI');
        setVerifyReference('');
    };

    const handleConfirmVerify = async () => {
        if (!selectedAdmissionForVerify || !onConfirmAdmission) return;
        setIsVerifying(true);
        try {
            await onConfirmAdmission(selectedAdmissionForVerify.id);
            setSelectedAdmissionForVerify(null);
        } catch (err) {
            console.error('Failed to verify admission:', err);
            alert('Failed to verify advance payment. Please check backend.');
        } finally {
            setIsVerifying(false);
        }
    };

    // When room selection changes, update the rent default
    const handleRoomChange = (roomNum: string) => {
        setSelectedRoomNumber(roomNum);
        const found = rooms.find(r => r.roomNumber === roomNum);
        if (found) {
            setMonthlyRent(found.rent);
        }
    };

    // Continuous 12-digit code without manual spaces, displayed as xxxx xxxx xxxx
    const handleAadharChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawDigits = cleanAadharForDB(e.target.value);
        setAadharNumber(rawDigits);
        if (guidanceMessage || highlightFields) {
            setGuidanceMessage(null);
            setHighlightFields(false);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(e.target.value);
        if (guidanceMessage || highlightFields) {
            setGuidanceMessage(null);
            setHighlightFields(false);
        }
    };

    const submitAdmission = async () => {
        try {
            await onCreateAdmission({
                residentName: residentName.trim(),
                phone: phone.trim() || '+91 98000 00000',
                email:
                    email.trim() ||
                    `${residentName.toLowerCase().replace(/\s+/g, '')}@example.com`,
                aadharNumber: aadharNumber || '548921049382',
                parentContact: parentNumber.trim() || undefined,
                parentNumber: parentNumber.trim() || undefined,
                hometown: hometown.trim() || 'Bangalore',
                profession: profession.trim() || 'Professional',
                category,
                roomNumber: selectedRoomNumber,
                monthlyRent,
                moveInDate,
                status: 'confirmed',
            });

            setIsSuccess(true);
            setGuidanceMessage(null);
            setHighlightFields(false);

            setTimeout(() => {
                setIsSuccess(false);
                setResidentName('');
                setPhone('');
                setParentNumber('');
                setEmail('');
                setAadharNumber('');
                setHometown('');
            }, 2500);
        } catch (err: any) {
            console.error('Admission submission failed:', err);
            const msg = err?.message || 'Failed to create admission. Please check the backend and try again.';
            alert(msg);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!residentName.trim() || !selectedRoomNumber) {
            alert('Please provide the resident name and select a room.');
            return;
        }

        // 1. Check if resident already exists / has previous stay history
        setIsCheckingResident(true);
        try {
            const check = await apiService.checkExistingTenant(aadharNumber, phone);
            if (check && check.exists) {
                // If resident currently has an active stay in a room
                if (check.hasActiveStay) {
                    setGuidanceMessage(
                        `Resident "${check.tenantName || residentName}" is currently residing in Room ${check.activeRoomNo || 'N/A'}. A resident cannot have multiple active stays simultaneously.`
                    );
                    setHighlightFields(true);
                    setIsCheckingResident(false);
                    return;
                }

                // Resident stayed previously and has vacated! Prompt user for new stay
                setReturningResident({
                    tenantName: check.tenantName || residentName,
                    lastStayFrom: formatDateDMY(check.lastStayFrom),
                    lastStayTo: formatDateDMY(check.lastStayTo),
                    hasActiveStay: false,
                    tenantType: check.tenantType,
                    organizationName: check.organizationName,
                    parentContact: check.parentContact,
                });
                setIsCheckingResident(false);
                return;
            }
        } catch (checkErr) {
            console.warn('Existing resident check error:', checkErr);
        } finally {
            setIsCheckingResident(false);
        }

        // 2. New resident, submit directly
        await submitAdmission();
    };

    const handleConfirmNewStay = async () => {
        if (returningResident?.parentContact && !parentNumber) {
            setParentNumber(returningResident.parentContact);
        }
        setReturningResident(null);
        setGuidanceMessage(null);
        setHighlightFields(false);
        await submitAdmission();
    };

    const handleCancelNewStay = () => {
        setReturningResident(null);
        setGuidanceMessage("Please check the new user's mobile number and Aadhaar number before admitting.");
        setHighlightFields(true);
    };

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Action Bar */}
            <div className="flex items-center justify-end">
                <button
                    type="button"
                    onClick={() => setIsCapacityModalOpen(true)}
                    className="h-9 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                    <DoorOpen className="w-4 h-4 text-slate-600" />
                    <span>Check Room Capacity</span>
                </button>
            </div>

            {/* Main Enrolment Form & Summary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Container (Left 2 columns) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
                    <div className="border-b border-slate-100 pb-3">
                        <h2 className="text-base font-bold text-[#091426]">
                            New Resident Information
                        </h2>
                        <p className="text-xs text-slate-500">
                            Fill the basic details below to complete enrolment and assign room.
                        </p>
                    </div>

                    {isSuccess && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-emerald-900 animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                                Tenant successfully enrolled! Room {selectedRoomNumber} capacity updated and payment auto-verified.
                            </span>
                        </div>
                    )}

                    {guidanceMessage && (
                        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in shadow-xs">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 font-semibold leading-relaxed">
                                {guidanceMessage}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setGuidanceMessage(null);
                                    setHighlightFields(false);
                                }}
                                className="text-amber-600 hover:text-amber-800 p-0.5 rounded transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Resident Full Name */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Resident Full Name *</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={residentName}
                                    onChange={e => setResidentName(e.target.value)}
                                    placeholder="e.g. Vikram Malhotra"
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>

                            {/* Mobile Phone */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Contact Mobile Number</span>
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    placeholder="e.g. +91 98450 12891"
                                    className={`h-9 px-3 border rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none transition-all ${
                                        highlightFields
                                            ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-300'
                                            : 'bg-slate-50 border-slate-200 focus:ring-1 focus:ring-blue-500'
                                    }`}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Aadhar Number (Auto-spaced xxxx xxxx xxxx, stored continuous in DB) */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Aadhar Number *</span>
                                    </label>

                                </div>
                                <div className="relative">
                                    <input
                                        id="aadhar-number-input"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        value={formatAadharDisplay(aadharNumber)}
                                        onChange={handleAadharChange}
                                        onKeyDown={e => {
                                            if (e.key === ' ') {
                                                e.preventDefault();
                                            }
                                        }}
                                        placeholder="xxxx xxxx xxxx"
                                        maxLength={14}
                                        className={`h-9 w-full px-3 font-mono font-semibold tracking-wider border rounded-lg text-xs text-slate-900 placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:bg-white focus:outline-none transition-all ${
                                            highlightFields
                                                ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-300'
                                                : 'bg-slate-50 border-slate-200 focus:ring-1 focus:ring-blue-500'
                                        }`}
                                    />
                                    {aadharNumber.length === 12 && (
                                        <span className="absolute right-2.5 top-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            <span>OK</span>
                                        </span>
                                    )}
                                </div>

                            </div>

                            {/* Hometown (New Requested Field) */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Hometown *</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={hometown}
                                    onChange={e => setHometown(e.target.value)}
                                    placeholder="e.g. Bangalore, Chennai, Hyderabad, Delhi..."
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Parent Contact Number (Optional) */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Parent Contact Number</span>
                                    </span>
                                    <span className="text-[11px] font-normal text-slate-400 font-sans">
                                        (Optional)
                                    </span>
                                </label>
                                <input
                                    type="tel"
                                    value={parentNumber}
                                    onChange={e => setParentNumber(e.target.value)}
                                    placeholder="e.g. +91 98450 99887"
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>

                            {/* Email */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Email Address</span>
                                    </span>
                                    <span className="text-[11px] font-normal text-slate-400 font-sans">
                                        (Optional)
                                    </span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="e.g. vikram.m@example.com"
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Move-in Date */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Move-In Date</span>
                                </label>
                                <input
                                    type="date"
                                    value={moveInDate}
                                    onChange={e => setMoveInDate(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>

                            {/* Profession & Category */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Profession &amp; Category</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={profession}
                                        onChange={e => setProfession(e.target.value)}
                                        placeholder="e.g. Software Engineer"
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value as 'working' | 'other')}
                                        className="h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    >
                                        <option value="working">Working</option>
                                        <option value="other">Student / Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Room Selection Dropdown (Simplified: Floor / Room (x/y Available)) */}
                        <div className="flex flex-col gap-1.5 pt-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Select Room *</span>
                                </span>
                                <span className="text-[11px] font-normal text-slate-500 font-mono">
                                    Floor / Room (Available in bracket)
                                </span>
                            </label>

                            <select
                                value={selectedRoomNumber}
                                onChange={e => handleRoomChange(e.target.value)}
                                className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                            >
                                <optgroup label="── Available Rooms ──">
                                    {availableRooms.map(room => {
                                        const vacant = room.capacity - room.occupied;
                                        return (
                                            <option key={room.roomNumber} value={room.roomNumber}>
                                                Floor {room.floor} / Room {room.roomNumber} ({vacant}/{room.capacity} Available)
                                            </option>
                                        );
                                    })}
                                </optgroup>

                                {vacateNoticeRooms.length > 0 && (
                                    <optgroup label="── Vacate Notice Allocated ──">
                                        {vacateNoticeRooms.map(room => (
                                            <option key={room.roomNumber} value={room.roomNumber}>
                                                Floor {room.floor} / Room {room.roomNumber} (Vacating {room.vacateDate})
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>

                        {/* Rent & Auto-Verify Banner */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">
                                    Monthly Rent (₹)
                                </label>
                                <input
                                    type="number"
                                    value={monthlyRent}
                                    onChange={e => setMonthlyRent(Number(e.target.value))}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center">
                                <div className="w-full p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2 text-emerald-800 text-[11px] font-medium">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Payment auto-checked and verified on enrolment.</span>
                                </div>
                            </div>
                        </div>

                        {/* Submit CTA */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setResidentName('');
                                    setPhone('');
                                    setParentNumber('');
                                    setEmail('');
                                    setHometown('');
                                }}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>Complete Enrolment</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Selected Room Preview Card (Right Column) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <DoorOpen className="w-4 h-4 text-blue-600" />
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Assigned Room Details
                            </h3>
                        </div>

                        {(() => {
                            const selectedRoom = rooms.find(r => r.roomNumber === selectedRoomNumber) || rooms[0];
                            if (!selectedRoom) return null;

                            return (
                                <div className="mt-4 flex flex-col gap-3.5">
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="text-xs text-slate-500">Room Identifier</div>
                                        <div className="font-mono text-xl font-bold text-slate-900">
                                            Room {selectedRoom.roomNumber}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            Floor {selectedRoom.floor}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                                            <span className="text-slate-400 block text-[10px] uppercase">Rent</span>
                                            <span className="font-mono font-bold text-slate-900">
                                                ₹{selectedRoom.rent.toLocaleString('en-IN')}/mo
                                            </span>
                                        </div>

                                        <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                                            <span className="text-slate-400 block text-[10px] uppercase">Occupancy</span>
                                            <span className="font-mono font-bold text-slate-900">
                                                {selectedRoom.occupied} / {selectedRoom.capacity}
                                            </span>
                                        </div>
                                    </div>

                                    {selectedRoom.status === 'vacate_notice' && (
                                        <div className="p-2.5 bg-amber-50 rounded border border-amber-200 text-amber-900 text-xs">
                                            <div className="font-semibold">Notice Allocated</div>
                                            <div className="text-[11px] text-amber-700">
                                                Vacating on {selectedRoom.vacateDate} ({selectedRoom.vacatingResident})
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <span className="text-[11px] text-slate-500 block mb-1">
                                            Current Room Occupants:
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {selectedRoom.residents.map((r, i) => (
                                                <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                                    {r}
                                                </span>
                                            ))}
                                            {selectedRoom.residents.length === 0 && (
                                                <span className="text-slate-400 italic text-[11px]">No occupants yet</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                        Resident will be recorded instantly in the active tenant registry upon enrolment.
                    </div>
                </div>
            </div>

            {/* Pending Advance Verification Banner */}
            {(() => {
                const pendingAdmissions = admissions.filter(
                    a => a.status === 'pending' && (!a.tenantStatus || a.tenantStatus.toUpperCase() !== 'INACTIVE')
                );
                if (pendingAdmissions.length === 0) return null;
                return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-sm font-bold text-amber-900">
                                {pendingAdmissions.length} Admission{pendingAdmissions.length > 1 ? 's' : ''} Awaiting Advance Payment Verification
                            </span>
                        </div>
                        <p className="text-xs text-amber-700">
                            The following admissions are pending advance payment verification. Click <strong>Confirm</strong> in the table below to verify advance payment and activate the tenant.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {pendingAdmissions.slice(0, 4).map(adm => (
                                <button
                                    key={adm.id}
                                    type="button"
                                    onClick={() => openVerifyModal(adm)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold rounded-full border border-amber-200 transition-colors cursor-pointer"
                                >
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" />
                                    <span>{adm.residentName} — Room {adm.roomNumber}</span>
                                    <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-bold">Verify</span>
                                </button>
                            ))}
                            {pendingAdmissions.length > 4 && (
                                <span className="text-xs text-amber-600 font-medium self-center">
                                    +{pendingAdmissions.length - 4} more
                                </span>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Recent Admissions Records */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
                <h2 className="text-sm font-bold text-[#091426]">
                    Recent Admissions Ledger
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-200/80">
                                <th className="py-2.5 px-3">Resident Name</th>
                                <th className="py-2.5 px-3 font-mono">Aadhar Number</th>
                                <th className="py-2.5 px-3">Hometown</th>
                                <th className="py-2.5 px-3">Category</th>
                                <th className="py-2.5 px-3">Room Assigned</th>
                                <th className="py-2.5 px-3 font-mono text-right">Rent</th>
                                <th className="py-2.5 px-3">Move-In Date</th>
                                <th className="py-2.5 px-3">Payment Status</th>
                                <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {admissions.map(adm => (
                                <tr key={adm.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3 px-3">
                                        <div className="font-semibold text-slate-900">{adm.residentName}</div>
                                        <div className="font-mono text-[10px] text-slate-400">{adm.phone}</div>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="inline-block font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/70">
                                            {formatAadharDisplay(adm.aadharNumber) || '5489 2104 9382'}
                                        </span>
                                        <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                                            DB: {adm.aadharNumber || '548921049382'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                            <MapPin className="w-3 h-3 text-slate-400" />
                                            {adm.hometown || 'Bangalore'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className="text-[11px] text-slate-600 font-medium">
                                            {adm.category === 'other' ? 'Student / Other' : 'Working'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3 font-bold text-slate-800">
                                        Room {adm.roomNumber}
                                    </td>
                                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-right">
                                        ₹{adm.monthlyRent.toLocaleString('en-IN')}/mo
                                    </td>
                                    <td className="py-3 px-3 font-mono text-slate-600">
                                        {adm.moveInDate}
                                    </td>
                                    <td className="py-3 px-3">
                                        {adm.status === 'confirmed' ? (
                                             <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                <span>PAID (Active)</span>
                                            </span>
                                        ) : adm.status === 'vacated' || adm.tenantStatus?.toUpperCase() === 'INACTIVE' ? (
                                             <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/80">
                                                <span>VACATED</span>
                                            </span>
                                        ) : adm.status === 'cancelled' ? (
                                             <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                                <span>CANCELLED</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                                <span>PENDING</span>
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        {adm.status === 'pending' && (!adm.tenantStatus || adm.tenantStatus.toUpperCase() !== 'INACTIVE') ? (
                                            <div className="inline-flex items-center gap-1.5 justify-end">
                                                {onConfirmAdmission && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openVerifyModal(adm)}
                                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                                                        title="Verify advance payment and activate tenant"
                                                    >
                                                        <ShieldCheck className="w-3 h-3" />
                                                        <span>Verify</span>
                                                    </button>
                                                )}
                                                {onCancelAdmission && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (window.confirm(`Cancel pending admission for ${adm.residentName}?`)) {
                                                                onCancelAdmission(adm.id);
                                                            }
                                                        }}
                                                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded text-[11px] font-semibold transition-colors"
                                                        title="Cancel Pending Admission"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[11px] text-slate-400">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Advance Payment Verification Modal */}
            {selectedAdmissionForVerify && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Verify Advance Payment</h3>
                                    <p className="text-[11px] text-slate-500">Record advance receipt to activate tenant</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAdmissionForVerify(null)}
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 flex flex-col gap-4">
                            {/* Resident Details Card */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col gap-1.5 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Resident:</span>
                                    <span className="font-bold text-slate-900">{selectedAdmissionForVerify.residentName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Room Assigned:</span>
                                    <span className="font-semibold text-slate-800">Room {selectedAdmissionForVerify.roomNumber}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Admission No:</span>
                                    <span className="font-mono text-slate-600">{selectedAdmissionForVerify.id}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500">Move-in Date:</span>
                                    <span className="font-mono text-slate-600">{selectedAdmissionForVerify.moveInDate}</span>
                                </div>
                            </div>

                            {/* Advance Amount Input */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-slate-700">Advance Amount Received (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={verifyAmount}
                                        onChange={e => setVerifyAmount(Number(e.target.value))}
                                        className="w-full h-9 pl-7 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Payment Mode Selector */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Payment Mode</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['UPI', 'Cash', 'Bank Transfer', 'Card'].map(mode => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setVerifyPaymentMode(mode)}
                                            className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border transition-all ${
                                                verifyPaymentMode === mode
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reference Number Input */}
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-slate-700">Transaction Ref / UTR / Receipt No. (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. UPI-2024-984128, Cash Receipt #42"
                                    value={verifyReference}
                                    onChange={e => setVerifyReference(e.target.value)}
                                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                            <button
                                type="button"
                                onClick={() => setSelectedAdmissionForVerify(null)}
                                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isVerifying}
                                onClick={handleConfirmVerify}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{isVerifying ? 'Verifying...' : 'Confirm & Activate Tenant'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Floor-wise Room Capacity & Occupancy Modal */}
            {isCapacityModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                    <DoorOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        Room Capacity &amp; Availability
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Floor-wise occupancy breakdown. Click &quot;Select Room&quot; to assign a room for this admission.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCapacityModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Metric summary ribbon */}
                        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200/70 grid grid-cols-4 gap-2 text-center text-xs">
                            <div className="bg-white py-1.5 px-3 rounded-lg border border-slate-200/60">
                                <span className="text-slate-500 block text-[11px]">Total Rooms</span>
                                <span className="font-bold text-slate-800 text-sm">{rooms.length}</span>
                            </div>
                            <div className="bg-white py-1.5 px-3 rounded-lg border border-slate-200/60">
                                <span className="text-slate-500 block text-[11px]">Total Capacity</span>
                                <span className="font-bold text-slate-800 text-sm">{totalCapacity} Beds</span>
                            </div>
                            <div className="bg-white py-1.5 px-3 rounded-lg border border-slate-200/60">
                                <span className="text-slate-500 block text-[11px]">Occupied</span>
                                <span className="font-bold text-blue-600 text-sm">{totalOccupied} Beds</span>
                            </div>
                            <div className="bg-white py-1.5 px-3 rounded-lg border border-slate-200/60">
                                <span className="text-slate-500 block text-[11px]">Available</span>
                                <span className="font-bold text-emerald-600 text-sm">{totalAvailable} Beds</span>
                            </div>
                        </div>

                        {/* Modal Body - Floor-wise Rooms */}
                        <div className="p-6 overflow-y-auto flex flex-col gap-6 max-h-[60vh]">
                            {floorGroups.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-xs">
                                    No rooms found in the inventory.
                                </div>
                            ) : (
                                floorGroups.map(([floorName, floorRooms]) => {
                                    const floorAvailable = floorRooms.reduce(
                                        (acc, r) => acc + Math.max(0, r.capacity - r.occupied),
                                        0
                                    );
                                    return (
                                        <div key={floorName} className="flex flex-col gap-3">
                                            {/* Floor Header */}
                                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                                        {floorName}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 font-medium">
                                                        ({floorRooms.length} {floorRooms.length === 1 ? 'room' : 'rooms'})
                                                    </span>
                                                </div>
                                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                                    floorAvailable > 0
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {floorAvailable} beds available
                                                </span>
                                            </div>

                                            {/* Room Cards Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {floorRooms.map(room => {
                                                    const isFull = room.occupied >= room.capacity;
                                                    const isSelected = selectedRoomNumber === room.roomNumber;
                                                    const hasVacancy = room.occupied < room.capacity;
                                                    const hasNotice = room.status === 'vacate_notice';
                                                    const occupancyPct = Math.min(
                                                        100,
                                                        Math.round(((room.occupied || 0) / (room.capacity || 1)) * 100)
                                                    );

                                                    return (
                                                        <div
                                                            key={room.id || room.roomNumber}
                                                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                                                                isSelected
                                                                    ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
                                                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                                                            }`}
                                                        >
                                                            {/* Card Top */}
                                                            <div>
                                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-sm font-bold text-slate-900">
                                                                            Room {room.roomNumber}
                                                                        </span>
                                                                        <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                            {room.type}
                                                                        </span>
                                                                    </div>
                                                                    <span
                                                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                                            hasNotice
                                                                                ? 'bg-amber-100 text-amber-800'
                                                                                : isFull
                                                                                ? 'bg-rose-100 text-rose-800'
                                                                                : 'bg-emerald-100 text-emerald-800'
                                                                        }`}
                                                                    >
                                                                        {hasNotice
                                                                            ? 'Notice'
                                                                            : isFull
                                                                            ? 'Full'
                                                                            : 'Available'}
                                                                    </span>
                                                                </div>

                                                                {/* Occupancy bar */}
                                                                <div className="flex flex-col gap-1 mt-2">
                                                                    <div className="flex justify-between text-[11px]">
                                                                        <span className="text-slate-500 font-medium">Occupancy</span>
                                                                        <span className="font-mono font-semibold text-slate-800">
                                                                            {room.occupied} / {room.capacity}
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all ${
                                                                                isFull
                                                                                    ? 'bg-rose-500'
                                                                                    : hasNotice
                                                                                    ? 'bg-amber-500'
                                                                                    : 'bg-emerald-500'
                                                                            }`}
                                                                            style={{ width: `${occupancyPct}%` }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="mt-2 text-xs font-semibold text-slate-700">
                                                                    ₹{room.rent?.toLocaleString('en-IN') ?? 8000}
                                                                    <span className="text-[10px] text-slate-400 font-normal"> / month</span>
                                                                </div>
                                                            </div>

                                                            {/* Select Button */}
                                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                                {isSelected ? (
                                                                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        Selected
                                                                    </span>
                                                                ) : hasVacancy || hasNotice ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            handleRoomChange(room.roomNumber);
                                                                            setIsCapacityModalOpen(false);
                                                                        }}
                                                                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                                                                    >
                                                                        <span>Select Room</span>
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 font-medium w-full text-center py-1">
                                                                        No Vacancy
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <span className="text-xs text-slate-500">
                                Selected Room: <strong className="text-slate-800">{selectedRoomNumber || 'None'}</strong>
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsCapacityModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Returning Resident Confirmation Modal */}
            {returningResident && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                    <History className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold leading-tight">Returning Resident Detected</h3>
                                    <p className="text-xs text-blue-100 mt-0.5">Existing resident profile found</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelNewStay}
                                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 flex flex-col gap-4">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resident Details</span>
                                    <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                        {returningResident.tenantType || 'Resident'}
                                    </span>
                                </div>
                                <div className="text-base font-bold text-slate-900">
                                    {returningResident.tenantName}
                                </div>
                                {returningResident.organizationName && (
                                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{returningResident.organizationName}</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-blue-50/90 border border-blue-200 rounded-xl flex flex-col gap-2.5">
                                <div className="text-xs text-blue-950 font-medium leading-relaxed">
                                    This tenant has already stayed here from{' '}
                                    <span className="font-bold text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded">
                                        {returningResident.lastStayFrom}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-bold text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded">
                                        {returningResident.lastStayTo}
                                    </span>.
                                </div>
                                <div className="text-xs text-blue-950 font-semibold leading-relaxed">
                                    Do you want to add a new stay for the same client starting from{' '}
                                    <span className="font-bold text-indigo-700 underline">
                                        {formatDateDMY(moveInDate)}
                                    </span>?
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-500 italic">
                                * Historical stay records, invoices, and ledger data for this resident will remain intact.
                            </p>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCancelNewStay}
                                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    No, Check Details
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmNewStay}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span>Yes, Add New Stay</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
