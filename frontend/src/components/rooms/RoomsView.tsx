import React, { useState } from 'react';
import {
    DoorOpen,
    Plus,
    Terminal,
    UserPlus,
    Users,
    CheckCircle2,
    Calendar,
    Sparkles,
} from 'lucide-react';
import { Room, PageId } from '../../types';



interface RoomsViewProps {
    rooms: Room[];

    onAllocateRoom: (
        roomNumber: string,
        tenantName: string
    ) => void;

    onCreateRoom: (
        roomData: {
            roomNo: string;
            floor: string;
            roomType: string;
            rentPerMonth: number;
            occupancy: number;
            available: boolean;
        }
    ) => Promise<void>;

    onUpdateRoom: (
        roomNumber: string,
        roomData: {
            floor: string;
            roomType: string;
            rentPerMonth: number;
            occupancy: number;
            available: boolean;
        }
    ) => Promise<void>;

    onDeleteRoom: (
        roomNumber: string
    ) => Promise<void>;

    onNavigate: (page: PageId) => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({
    rooms,
    onAllocateRoom,
    onCreateRoom,
    onUpdateRoom,
    onDeleteRoom,
    onNavigate,
}) => {
    const [selectedFloor, setSelectedFloor] = useState<string | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'vacate' | 'full'>('all');
    const [allocatingRoom, setAllocatingRoom] = useState<Room | null>(null);
    const [tenantNameInput, setTenantNameInput] = useState('');

    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [editingRoom, setEditingRoom] =
        useState<Room | null>(null);

    const [isUpdatingRoom, setIsUpdatingRoom] =
        useState(false);

    const [roomForm, setRoomForm] = useState({
        roomNo: '',
        floor: '',
        roomType: '',
        rentPerMonth: '',
        occupancy: '1',
    });

    const [isCreatingRoom, setIsCreatingRoom] = useState(false);

    //Delete Room Handler

    const handleUpdateRoom = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        if (!editingRoom) {
            return;
        }

        try {
            setIsUpdatingRoom(true);

            await onUpdateRoom(
                editingRoom.roomNumber,
                {
                    floor: editingRoom.floor,
                    roomType:
                        editingRoom.roomType ?? '',
                    rentPerMonth:
                        editingRoom.rent,
                    occupancy:
                        editingRoom.capacity,
                    available:
                        editingRoom.occupied <
                        editingRoom.capacity,
                }
            );

            setEditingRoom(null);
        } catch (error) {
            console.error(
                'Failed to update room:',
                error
            );

            alert(
                'Failed to update room.'
            );
        } finally {
            setIsUpdatingRoom(false);
        }
    };

    const handleDeleteRoom = async (
        room: Room
    ) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete Room ${room.roomNumber}?`
        );

        if (!confirmed) {
            return;
        }

        try {
            await onDeleteRoom(room.roomNumber);
        } catch (error) {
            console.error(
                'Failed to delete room:',
                error
            );

            alert(
                'Unable to delete this room. Check whether it is still associated with residents or admissions.'
            );
        }
    };

    // Calculations
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.occupied < r.capacity || r.status === 'vacate_notice').length;
    const totalOccupied = rooms.reduce((acc, r) => acc + r.occupied, 0);
    const totalCapacity = rooms.reduce((acc, r) => acc + r.capacity, 0);
    const totalVacant = Math.max(0, totalCapacity - totalOccupied);

    // Filtered rooms
    const filteredRooms = rooms.filter(r => {
        if (selectedFloor !== 'all' && r.floor !== selectedFloor) return false;
        if (statusFilter === 'available') return r.occupied < r.capacity;
        if (statusFilter === 'vacate') return r.status === 'vacate_notice';
        if (statusFilter === 'full') return r.occupied >= r.capacity;
        return true;
    });

    const handleCreateRoom = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        if (
            !roomForm.roomNo.trim() ||
            !roomForm.floor.trim() ||
            !roomForm.roomType.trim() ||
            !roomForm.rentPerMonth ||
            !roomForm.occupancy
        ) {
            alert('Please fill all required room fields.');
            return;
        }

        try {
            setIsCreatingRoom(true);

            await onCreateRoom({
                roomNo: roomForm.roomNo.trim(),
                floor: roomForm.floor.trim(),
                roomType: roomForm.roomType.trim(),
                rentPerMonth: Number(roomForm.rentPerMonth),
                occupancy: Number(roomForm.occupancy),
                available: true,
            });

            setRoomForm({
                roomNo: '',
                floor: '',
                roomType: '',
                rentPerMonth: '',
                occupancy: '1',
            });

            setShowCreateRoom(false);
        } catch (error) {
            console.error(
                'Failed to create room:',
                error
            );

            alert(
                'Failed to create room. Please check the room details.'
            );
        } finally {
            setIsCreatingRoom(false);
        }
    };



    return (
        <div className="flex flex-col w-full gap-6">
            {/* Action Bar */}
            <div className="flex items-center justify-end">
                <button
                    onClick={() => setShowCreateRoom(true)}
                    className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                    <Plus className="w-4 h-4" />
                    <span>New Room</span>
                </button>
            </div>

            {/* 4 Minimal Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Rooms */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Total Rooms
                    </span>
                    <div className="mt-2">
                        <div className="text-3xl font-bold text-[#091426] tracking-tight tabular-nums font-display">
                            {totalRooms}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Configured inventory units</div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span>Building Status</span>
                        <span className="font-semibold text-emerald-700">Operational</span>
                    </div>
                </div>

                {/* Available Rooms */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Available Rooms
                    </span>
                    <div className="mt-2">
                        <div className="text-3xl font-bold text-emerald-700 tracking-tight tabular-nums font-display">
                            {availableRooms}
                        </div>
                        <div className="text-xs text-emerald-600 mt-1">Rooms with open capacity</div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Ready for check-in</span>
                        <span className="font-bold text-emerald-700">Immediate</span>
                    </div>
                </div>

                {/* Total Occupancy */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Occupancy
                    </span>
                    <div className="mt-2">
                        <div className="text-3xl font-bold text-[#091426] tracking-tight tabular-nums font-display">
                            {totalOccupied}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Residents living currently</div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span>Capacity</span>
                        <span className="font-mono font-semibold text-slate-900">{totalOccupied} / {totalCapacity}</span>
                    </div>
                </div>

                {/* Vacant Capacity */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                        Vacancies
                    </span>
                    <div className="mt-2">
                        <div className="text-3xl font-bold text-blue-700 tracking-tight tabular-nums font-display">
                            {totalVacant}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">Open spots ready to allocate</div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Vacate Notice</span>
                        <span className="font-bold text-amber-700">
                            {rooms.filter(r => r.status === 'vacate_notice').length} Units
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === 'all'
                            ? 'bg-[#091426] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        All Rooms ({rooms.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('available')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === 'available'
                            ? 'bg-[#091426] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        Has Vacancy ({rooms.filter(r => r.occupied < r.capacity).length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('vacate')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === 'vacate'
                            ? 'bg-[#091426] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        Vacate Notices ({rooms.filter(r => r.status === 'vacate_notice').length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('full')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === 'full'
                            ? 'bg-[#091426] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        Fully Occupied ({rooms.filter(r => r.occupied >= r.capacity).length})
                    </button>
                </div>

                <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Vacate Notice
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span> Full
                    </span>
                </div>
            </div>

            {/* Clean Room Cards Grid with Terminal Hover Transformation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map(room => {
                    const isFull = room.occupied >= room.capacity;
                    const hasNotice = room.status === 'vacate_notice';
                    const vacancyCount = Math.max(0, room.capacity - room.occupied);
                    const occupancyPercent = Math.round((room.occupied / room.capacity) * 100);

                    return (
                        <div
                            key={room.roomNumber}
                            className="group bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between gap-4 transition-all duration-200 hover:border-cyan-500/70 hover:ring-2 hover:ring-cyan-400/20 hover:shadow-md"
                        >
                            {/* Card Top */}
                            <div>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-950 group-hover:text-cyan-400 text-slate-700 flex items-center justify-center transition-colors">
                                            <Terminal className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h2 className="font-mono text-base font-bold text-slate-900 group-hover:text-cyan-950 transition-colors">
                                                Room {room.roomNumber}
                                            </h2>
                                            <span className="text-xs text-slate-500">
                                                Floor {room.floor}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    {hasNotice ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-100 text-amber-900">
                                            Notice: {room.vacateDate}
                                        </span>
                                    ) : isFull ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-700">
                                            Fully Occupied
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-50 text-emerald-800">
                                            {vacancyCount} Spot{vacancyCount > 1 ? 's' : ''} Open
                                        </span>
                                    )}
                                </div>

                                {/* Rent & Occupancy */}
                                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                                            Monthly Rent
                                        </span>
                                        <span className="font-mono text-base font-bold text-slate-900">
                                            ₹{room.rent.toLocaleString('en-IN')}
                                            <span className="text-xs font-normal text-slate-500">/mo</span>
                                        </span>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                                            Occupancy
                                        </span>
                                        <span className="font-mono text-base font-bold text-slate-900">
                                            {room.occupied} / {room.capacity}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="mt-2.5">
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-1.5 rounded-full transition-all ${isFull ? 'bg-slate-700' : hasNotice ? 'bg-amber-500' : 'bg-emerald-600'
                                                }`}
                                            style={{ width: `${occupancyPercent}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Residents List */}
                                <div className="mt-3.5">
                                    <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                                        Current Residents ({room.residents.length}):
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {room.residents.map((res, i) => (
                                            <span
                                                key={i}
                                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${res === room.vacatingResident
                                                    ? 'bg-amber-100 text-amber-900 line-through'
                                                    : 'bg-slate-100 text-slate-700'
                                                    }`}
                                            >
                                                {res}
                                            </span>
                                        ))}
                                        {room.residents.length === 0 && (
                                            <span className="text-[11px] text-slate-400 italic">No residents yet</span>
                                        )}
                                    </div>
                                </div>

                                {/* Amenities */}
                                {room.amenities && room.amenities.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {room.amenities.map((am, i) => (
                                            <span key={i} className="text-[10px] bg-slate-50 border border-slate-200/80 text-slate-500 px-1.5 py-0.5 rounded">
                                                {am}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action Button */}
                            <div className="flex items-center gap-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingRoom(room)}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    Edit Room
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleDeleteRoom(room)}
                                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                            {hasNotice ? (
                                <button
                                    onClick={() => onNavigate('admissions')}
                                    className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <span>Enrol for Vacating Slot ({room.vacateDate})</span>
                                </button>
                            ) : !isFull ? (
                                <button
                                    onClick={() => setAllocatingRoom(room)}
                                    className="w-full py-2 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Enrol into Room {room.roomNumber}</span>
                                </button>
                            ) : (
                                <div className="text-center py-1.5 text-xs text-slate-400 font-medium">
                                    Room is at full capacity
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Quick Enrol Modal for Selected Room */}
            {
                allocatingRoom && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091426]/50 backdrop-blur-xs">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 flex flex-col gap-4">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900 font-display">
                                    Enrol into Room {allocatingRoom.roomNumber}
                                </h3>
                                <button
                                    onClick={() => setAllocatingRoom(null)}
                                    className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase">Room Rent</span>
                                    <span className="font-mono font-bold text-slate-900">₹{allocatingRoom.rent.toLocaleString('en-IN')}/mo</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-slate-400 block text-[10px] uppercase">Current Occupancy</span>
                                    <span className="font-mono font-bold text-slate-900">{allocatingRoom.occupied} / {allocatingRoom.capacity}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 text-xs">
                                <label className="font-semibold text-slate-700">Resident Name</label>
                                <input
                                    type="text"
                                    value={tenantNameInput}
                                    onChange={e => setTenantNameInput(e.target.value)}
                                    placeholder="e.g. Rahul Verma"
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="p-2.5 bg-emerald-50 rounded text-emerald-800 text-[11px] flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Payment will be automatically checked and verified.</span>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setAllocatingRoom(null)}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (!tenantNameInput.trim()) return;
                                        onAllocateRoom(allocatingRoom.roomNumber, tenantNameInput.trim());
                                        setAllocatingRoom(null);
                                        setTenantNameInput('');
                                    }}
                                    className="px-4 py-1.5 bg-[#091426] text-white rounded-lg text-xs font-bold"
                                >
                                    Confirm Enrolment
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                showCreateRoom && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091426]/50 backdrop-blur-xs">
                        <form
                            onSubmit={handleCreateRoom}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 border border-slate-200 flex flex-col gap-4"
                        >
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 font-display">
                                        Create New Room
                                    </h3>

                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Add a new room to the inventory
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowCreateRoom(false)}
                                    className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Room Number *
                                    </label>

                                    <input
                                        type="text"
                                        value={roomForm.roomNo}
                                        onChange={e =>
                                            setRoomForm(prev => ({
                                                ...prev,
                                                roomNo: e.target.value,
                                            }))
                                        }
                                        placeholder="e.g. 101"
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Floor *
                                    </label>

                                    <input
                                        type="text"
                                        value={roomForm.floor}
                                        onChange={e =>
                                            setRoomForm(prev => ({
                                                ...prev,
                                                floor: e.target.value,
                                            }))
                                        }
                                        placeholder="e.g. 1"
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">
                                    Room Type *
                                </label>

                                <input
                                    type="text"
                                    value={roomForm.roomType}
                                    onChange={e =>
                                        setRoomForm(prev => ({
                                            ...prev,
                                            roomType: e.target.value,
                                        }))
                                    }
                                    placeholder="e.g. SINGLE / DOUBLE"
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Monthly Rent *
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        value={roomForm.rentPerMonth}
                                        onChange={e =>
                                            setRoomForm(prev => ({
                                                ...prev,
                                                rentPerMonth: e.target.value,
                                            }))
                                        }
                                        placeholder="8000"
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Capacity *
                                    </label>

                                    <input
                                        type="number"
                                        min="1"
                                        value={roomForm.occupancy}
                                        onChange={e =>
                                            setRoomForm(prev => ({
                                                ...prev,
                                                occupancy: e.target.value,
                                            }))
                                        }
                                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateRoom(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={isCreatingRoom}
                                    className="px-4 py-2 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                                >
                                    {isCreatingRoom
                                        ? 'Creating...'
                                        : 'Create Room'}
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }
            {
                editingRoom && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091426]/50 backdrop-blur-xs">
                        <form
                            onSubmit={handleUpdateRoom}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 border border-slate-200"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Edit Room {editingRoom.roomNumber}
                                    </h3>

                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Update room configuration
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setEditingRoom(null)
                                    }
                                    className="text-slate-400 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex flex-col gap-4 pt-4">

                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Floor
                                    </label>

                                    <input
                                        value={editingRoom.floor}
                                        onChange={e =>
                                            setEditingRoom({
                                                ...editingRoom,
                                                floor: e.target.value,
                                            })
                                        }
                                        className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Room Type
                                    </label>

                                    <input
                                        value={editingRoom.roomType}
                                        onChange={e =>
                                            setEditingRoom({
                                                ...editingRoom,
                                                roomType: e.target.value,
                                            })
                                        }
                                        className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">

                                    <div>
                                        <label className="text-xs font-semibold text-slate-700">
                                            Monthly Rent
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            value={editingRoom.rent}
                                            onChange={e =>
                                                setEditingRoom({
                                                    ...editingRoom,
                                                    rent: Number(
                                                        e.target.value
                                                    ),
                                                })
                                            }
                                            className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-slate-700">
                                            Capacity
                                        </label>

                                        <input
                                            type="number"
                                            min="1"
                                            value={editingRoom.capacity}
                                            onChange={e =>
                                                setEditingRoom({
                                                    ...editingRoom,
                                                    capacity: Number(
                                                        e.target.value
                                                    ),
                                                })
                                            }
                                            className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                                        />
                                    </div>

                                </div>

                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                                    Current occupancy:
                                    <strong className="ml-1">
                                        {editingRoom.occupied}
                                    </strong>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingRoom(null)
                                        }
                                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isUpdatingRoom}
                                        className="px-5 py-2 bg-[#091426] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                                    >
                                        {isUpdatingRoom
                                            ? 'Updating...'
                                            : 'Save Changes'}
                                    </button>

                                </div>
                            </div>
                        </form>
                    </div>
                )
            }
        </div >
    );
};
