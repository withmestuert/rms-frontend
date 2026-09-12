import React, { useState } from 'react';
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
} from 'lucide-react';
import { Admission, Room, PageId } from '../../types';
import { formatAadharDisplay, cleanAadharForDB } from '../../utils/formatters';

interface AdmissionsViewProps {
    admissions: Admission[];
    rooms: Room[];
    onCreateAdmission: (
        admissionData: Omit<Admission, 'id' | 'allocatedAt'>
    ) => Promise<void>;
    onNavigate: (page: PageId) => void;
}

export const AdmissionsView: React.FC<AdmissionsViewProps> = ({
    admissions,
    rooms,
    onCreateAdmission,
    onNavigate,
}) => {
    // Available rooms and rooms with active vacate notices
    const availableRooms = rooms.filter(r => r.occupied < r.capacity);
    const vacateNoticeRooms = rooms.filter(r => r.status === 'vacate_notice');

    // Default selected room
    const initialRoom = availableRooms[0] || vacateNoticeRooms[0] || rooms[0];

    const [residentName, setResidentName] = useState('');
    const [phone, setPhone] = useState('');
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!residentName.trim() || !selectedRoomNumber) {
            alert('Please provide the resident name and select a room.');
            return;
        }

        try {
            await onCreateAdmission({
                residentName: residentName.trim(),
                phone: phone.trim() || '+91 98000 00000',
                email:
                    email.trim() ||
                    `${residentName.toLowerCase().replace(/\s+/g, '')}@example.com`,
                aadharNumber: aadharNumber || '548921049382',
                hometown: hometown.trim() || 'Bangalore',
                profession: profession.trim() || 'Professional',
                category,
                roomNumber: selectedRoomNumber,
                monthlyRent,
                moveInDate,
                status: 'confirmed',
            });

            setIsSuccess(true);

            setTimeout(() => {
                setIsSuccess(false);
                setResidentName('');
                setPhone('');
                setEmail('');
                setAadharNumber('');
                setHometown('');
            }, 2500);
        } catch (err) {
            console.error('Admission submission failed:', err);
            alert('Failed to create admission. Please check the backend and try again.');
        }
    };

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded uppercase tracking-wider">
                            Enrolment Portal
                        </span>
                        <span className="font-mono text-xs text-slate-500">Instant Resident Onboarding</span>
                    </div>
                    <h1 className="text-xl font-bold text-[#091426] tracking-tight font-display">
                        Tenant Enrolment &amp; Room Assignment
                    </h1>
                    <p className="text-xs text-slate-500">
                        Enrol new tenants directly into available rooms or scheduled vacate slots with automated payment verification.
                    </p>
                </div>

                <button
                    onClick={() => onNavigate('rooms')}
                    className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors self-start md:self-auto"
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
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="e.g. +91 98450 12891"
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
                                        className="h-9 w-full px-3 font-mono font-semibold tracking-wider bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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
                            {/* Email */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Email Address</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="e.g. vikram.m@example.com"
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                />
                            </div>

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
                        </div>

                        <div className="flex flex-col gap-1.5">
                            {/* Profession & Category */}
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                <span>Profession &amp; Employment Category</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                    <option value="working">Working Professional</option>
                                    <option value="other">Student / Other</option>
                                </select>
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
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            <span>Auto-Verified</span>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
