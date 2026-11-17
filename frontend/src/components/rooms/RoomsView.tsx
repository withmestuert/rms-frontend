import React, { useState, useEffect, useMemo } from 'react';
import {
    DoorOpen,
    Plus,
    Terminal,
    Users,
    Building2,
    Layers,
    BedDouble,
    Wrench,
    Search,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Sparkles,
    X,
} from 'lucide-react';
import {
    Room,
    PageId,
    RoomTypeEnum,
    Block,
    Floor,
    Bed,
    getRoomTypeForCapacity,
    getCapacityForRoomType,
} from '../../types';
import { apiService } from '../../services/apiService';

interface RoomsViewProps {
    rooms?: Room[];

    onCreateRoom?: (
        roomData: {
            roomNo: string;
            floor: string;
            roomType: string;
            rentPerMonth: number;
            occupancy: number;
            available: boolean;
            blockId?: number;
            floorId?: number;
        }
    ) => Promise<void>;

    onUpdateRoom?: (
        roomNumber: string,
        roomData: {
            floor: string;
            roomType: string;
            rentPerMonth: number;
            occupancy: number;
            available: boolean;
        }
    ) => Promise<void>;

    onDeleteRoom?: (
        roomNumber: string
    ) => Promise<void>;

    onNavigate?: (page: PageId) => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({
    rooms: propRooms,
    onCreateRoom,
    onUpdateRoom,
    onDeleteRoom,
    onNavigate,
}) => {
    // Rooms state: uses prop if provided, else internally managed
    const [internalRooms, setInternalRooms] = useState<Room[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);

    // Blocks & Floors Hierarchy
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<number | 'all'>('all');
    const [selectedFloor, setSelectedFloor] = useState<string | 'all'>('all');

    // Filters & Search
    const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'vacate' | 'full'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Beds Inventory Map: roomNo -> Bed[]
    const [bedsByRoom, setBedsByRoom] = useState<Record<string, Bed[]>>({});
    const [isLoadingBeds, setIsLoadingBeds] = useState(false);
    const [updatingBedId, setUpdatingBedId] = useState<number | null>(null);
    const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});

    // Modals
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [showCreateBlock, setShowCreateBlock] = useState(false);
    const [showCreateFloor, setShowCreateFloor] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);

    // Form states
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
    const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
    const [isSubmittingFloor, setIsSubmittingFloor] = useState(false);
    const [createRoomError, setCreateRoomError] = useState<string | null>(null);
    const [isInitializingHierarchy, setIsInitializingHierarchy] = useState(false);

    const [roomForm, setRoomForm] = useState({
        roomNo: '',
        blockId: '',
        floor: '',
        roomType: RoomTypeEnum.SINGLE,
        rentPerMonth: '',
        occupancy: '1',
    });

    const [blockForm, setBlockForm] = useState({
        name: '',
        code: '',
    });

    const [floorForm, setFloorForm] = useState({
        blockId: '',
        floorNumber: '',
        name: '',
    });

    // Effective rooms list
    const currentRooms = propRooms ?? internalRooms;

    // Load rooms if not provided as prop
    const loadRooms = async () => {
        try {
            setIsLoadingRooms(true);
            const data = await apiService.getRooms();
            setInternalRooms(data);
        } catch (err) {
            console.error('Failed to load rooms:', err);
        } finally {
            setIsLoadingRooms(false);
        }
    };

    // Load blocks for active property
    const loadBlocks = async () => {
        try {
            const data = await apiService.getBlocks();
            setBlocks(data);
            if (data.length > 0 && selectedBlockId !== 'all') {
                const found = data.find(b => b.id === selectedBlockId);
                if (found) {
                    loadFloorsForBlock(found.id);
                }
            } else {
                const propertyFloors = await apiService.getPropertyFloors();
                setFloors(propertyFloors);
            }
        } catch (err) {
            console.warn('Could not load blocks:', err);
        }
    };

    const handleInitializeHierarchy = async () => {
        try {
            setIsInitializingHierarchy(true);
            await apiService.initializePropertyHierarchy();
            await loadBlocks();
            if (!propRooms) {
                await loadRooms();
            }
        } catch (err: any) {
            console.error('Failed to initialize hierarchy:', err);
            alert(err?.message || 'Failed to initialize building hierarchy.');
        } finally {
            setIsInitializingHierarchy(false);
        }
    };

    // Load floors for a given block
    const loadFloorsForBlock = async (blockId: number) => {
        try {
            const data = await apiService.getFloors(blockId);
            setFloors(data);
        } catch (err) {
            console.warn(`Could not load floors for block ${blockId}:`, err);
        }
    };

    // Load beds for all displayed rooms
    const loadBedsForRooms = async (roomsToFetch: Room[]) => {
        if (roomsToFetch.length === 0) return;
        setIsLoadingBeds(true);
        try {
            const entries = await Promise.all(
                roomsToFetch.map(async (r) => {
                    try {
                        const beds = await apiService.getRoomBeds(r.roomNumber);
                        return [r.roomNumber, beds] as [string, Bed[]];
                    } catch {
                        return [r.roomNumber, []] as [string, Bed[]];
                    }
                })
            );
            setBedsByRoom(prev => {
                const updated = { ...prev };
                for (const [roomNo, beds] of entries) {
                    updated[roomNo] = beds;
                }
                return updated;
            });
        } catch (err) {
            console.warn('Failed to load beds for rooms:', err);
        } finally {
            setIsLoadingBeds(false);
        }
    };

    // Initial mount effects
    useEffect(() => {
        if (!propRooms) {
            loadRooms();
        }
        loadBlocks();
    }, []);

    // Whenever currentRooms updates, fetch physical beds for each room
    useEffect(() => {
        if (currentRooms.length > 0) {
            loadBedsForRooms(currentRooms);
            // Default expand bed slots for all rooms
            const initialExpanded: Record<string, boolean> = {};
            currentRooms.forEach(r => { initialExpanded[r.roomNumber] = true; });
            setExpandedRooms(initialExpanded);
        }
    }, [currentRooms.length]);

    // When selected block changes, load its floors
    useEffect(() => {
        if (typeof selectedBlockId === 'number') {
            loadFloorsForBlock(selectedBlockId);
        } else {
            setFloors([]);
            setSelectedFloor('all');
        }
    }, [selectedBlockId]);

    // Capacity -> Room Type chaining
    const handleAddRoomCapacityChange = (val: string) => {
        const parsed = parseInt(val, 10);
        const validCapacity = isNaN(parsed) || parsed < 1 ? 1 : parsed;
        const linkedType = getRoomTypeForCapacity(validCapacity);
        setRoomForm(prev => ({
            ...prev,
            occupancy: val,
            roomType: linkedType as RoomTypeEnum,
        }));
    };

    const handleAddRoomTypeChange = (selectedType: string) => {
        const linkedCapacity = getCapacityForRoomType(selectedType);
        setRoomForm(prev => ({
            ...prev,
            roomType: selectedType as RoomTypeEnum,
            occupancy: String(linkedCapacity),
        }));
    };

    const handleEditRoomCapacityChange = (val: string) => {
        if (!editingRoom) return;
        const parsed = parseInt(val, 10);
        const validCapacity = isNaN(parsed) || parsed < 1 ? 1 : parsed;
        const linkedType = getRoomTypeForCapacity(validCapacity);
        setEditingRoom({
            ...editingRoom,
            capacity: validCapacity,
            roomType: linkedType,
        });
    };

    const handleEditRoomTypeChange = (selectedType: string) => {
        if (!editingRoom) return;
        const linkedCapacity = getCapacityForRoomType(selectedType);
        setEditingRoom({
            ...editingRoom,
            roomType: selectedType,
            capacity: linkedCapacity,
        });
    };

    // Toggle Bed Status (AVAILABLE <-> MAINTENANCE)
    const handleToggleBedStatus = async (bed: Bed, roomNo: string) => {
        if (bed.status === 'OCCUPIED' || bed.status === 'RESERVED') {
            alert(`Bed ${bed.bedNumber} is currently ${bed.status.toLowerCase()} and cannot be toggled directly to maintenance.`);
            return;
        }

        const targetStatus = bed.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
        try {
            setUpdatingBedId(bed.id);
            const updated = await apiService.updateBedStatus(bed.id, targetStatus);
            setBedsByRoom(prev => ({
                ...prev,
                [roomNo]: (prev[roomNo] || []).map(b => (b.id === bed.id ? updated : b)),
            }));
        } catch (err) {
            console.error('Failed to update bed status:', err);
            alert('Failed to update bed status. Please try again.');
        } finally {
            setUpdatingBedId(null);
        }
    };

    // Real-time duplicate check for Room Creation
    const isDuplicateRoomNo = useMemo(() => {
        const trimmed = roomForm.roomNo.trim().toLowerCase();
        if (!trimmed) return false;
        return currentRooms.some(r => r.roomNumber.trim().toLowerCase() === trimmed);
    }, [roomForm.roomNo, currentRooms]);

    // Create Room Handler
    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateRoomError(null);

        const roomNo = roomForm.roomNo.trim();
        const floor = roomForm.floor.trim();
        const occupancy = Number(roomForm.occupancy);
        const rent = Number(roomForm.rentPerMonth);

        if (!roomNo || !floor || !roomForm.roomType || !rent || !occupancy) {
            setCreateRoomError('Please fill all required room fields.');
            return;
        }

        if (isDuplicateRoomNo) {
            setCreateRoomError(`Room ${roomNo} already exists in this property. Duplicate room numbers are prohibited.`);
            return;
        }

        try {
            setIsCreatingRoom(true);
            const selectedBlock = roomForm.blockId ? blocks.find(b => String(b.id) === String(roomForm.blockId)) : null;
            const matchingFloor = floors.find(f =>
                (selectedBlock ? f.blockId === selectedBlock.id : true) &&
                (String(f.floorNumber) === String(floor) || f.name.toLowerCase() === floor.toLowerCase())
            );

            const payload = {
                roomNo,
                floor,
                roomType: roomForm.roomType,
                rentPerMonth: rent,
                occupancy,
                available: true,
                blockId: selectedBlock ? selectedBlock.id : undefined,
                floorId: matchingFloor ? matchingFloor.id : undefined,
            };

            if (onCreateRoom) {
                await onCreateRoom(payload);
            } else {
                await apiService.createRoom(payload);
                await loadRooms();
            }

            // Fetch newly provisioned physical beds for this room
            try {
                const newBeds = await apiService.getRoomBeds(roomNo);
                setBedsByRoom(prev => ({ ...prev, [roomNo]: newBeds }));
                setExpandedRooms(prev => ({ ...prev, [roomNo]: true }));
            } catch {
                // Non-blocking bed sync
            }

            setRoomForm({
                roomNo: '',
                blockId: '',
                floor: '',
                roomType: RoomTypeEnum.SINGLE,
                rentPerMonth: '',
                occupancy: '1',
            });
            setShowCreateRoom(false);
        } catch (error: any) {
            console.error('Failed to create room:', error);
            const msg = error?.message || 'Failed to create room. Please verify details.';
            setCreateRoomError(msg);
        } finally {
            setIsCreatingRoom(false);
        }
    };

    // Update Room Handler
    const handleUpdateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRoom) return;

        try {
            setIsUpdatingRoom(true);
            const payload = {
                floor: String(editingRoom.floor),
                roomType: editingRoom.roomType ?? getRoomTypeForCapacity(editingRoom.capacity),
                rentPerMonth: editingRoom.rent,
                occupancy: editingRoom.capacity,
                available: editingRoom.occupied < editingRoom.capacity,
            };

            if (onUpdateRoom) {
                await onUpdateRoom(editingRoom.roomNumber, payload);
            } else {
                await apiService.updateRoom(editingRoom.roomNumber, payload);
                await loadRooms();
            }

            // Re-sync beds for this room
            try {
                const refreshedBeds = await apiService.getRoomBeds(editingRoom.roomNumber);
                setBedsByRoom(prev => ({ ...prev, [editingRoom.roomNumber]: refreshedBeds }));
            } catch {
                // Non-blocking
            }

            setEditingRoom(null);
        } catch (error) {
            console.error('Failed to update room:', error);
            alert('Failed to update room configuration.');
        } finally {
            setIsUpdatingRoom(false);
        }
    };

    // Delete Room Handler
    const handleDeleteRoom = async (room: Room) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete Room ${room.roomNumber}?\n\nThis will remove the room and its associated physical bed records.`
        );
        if (!confirmed) return;

        try {
            if (onDeleteRoom) {
                await onDeleteRoom(room.roomNumber);
            } else {
                await apiService.deleteRoom(room.roomNumber);
                await loadRooms();
            }
            setBedsByRoom(prev => {
                const copy = { ...prev };
                delete copy[room.roomNumber];
                return copy;
            });
        } catch (error) {
            console.error('Failed to delete room:', error);
            alert('Unable to delete this room. Check whether active residents or admissions are still assigned.');
        }
    };

    // Create Block Handler
    const handleCreateBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!blockForm.name.trim() || !blockForm.code.trim()) {
            alert('Block name and code are required.');
            return;
        }

        try {
            setIsSubmittingBlock(true);
            const activePropId = apiService.getActivePropertyId() || 1;
            await apiService.createBlock(activePropId, {
                name: blockForm.name.trim(),
                code: blockForm.code.trim().toUpperCase(),
            });
            await loadBlocks();
            setBlockForm({ name: '', code: '' });
            setShowCreateBlock(false);
        } catch (err: any) {
            console.error('Failed to create block:', err);
            alert(err?.message || 'Failed to create block. Code may already exist.');
        } finally {
            setIsSubmittingBlock(false);
        }
    };

    // Create Floor Handler
    const handleCreateFloor = async (e: React.FormEvent) => {
        e.preventDefault();
        const blockId = Number(floorForm.blockId);
        const floorNumber = parseInt(floorForm.floorNumber, 10);

        if (!blockId || isNaN(floorNumber)) {
            alert('Please select a block and specify a numeric floor number.');
            return;
        }

        try {
            setIsSubmittingFloor(true);
            await apiService.createFloor(blockId, {
                floorNumber,
                name: floorForm.name.trim() || `Floor ${floorNumber}`,
            });
            await loadFloorsForBlock(blockId);
            setFloorForm({ blockId: '', floorNumber: '', name: '' });
            setShowCreateFloor(false);
        } catch (err: any) {
            console.error('Failed to create floor:', err);
            alert(err?.message || 'Failed to create floor. Floor number may already exist in this block.');
        } finally {
            setIsSubmittingFloor(false);
        }
    };

    // Metrics calculations
    const totalRooms = currentRooms.length;
    const totalCapacity = currentRooms.reduce((acc, r) => acc + r.capacity, 0);
    const totalOccupied = currentRooms.reduce((acc, r) => acc + r.occupied, 0);
    const availableRooms = currentRooms.filter(r => r.occupied < r.capacity || r.status === 'vacate_notice').length;
    const totalVacantBeds = Math.max(0, totalCapacity - totalOccupied);

    // Count physical beds across rooms
    const allKnownBeds: Bed[] = (Object.values(bedsByRoom) as Bed[][]).flat();
    const maintenanceBedsCount = allKnownBeds.filter(b => b.status === 'MAINTENANCE').length;

    // Filtered rooms
    const filteredRooms = currentRooms.filter(r => {
        // Floor filter
        if (selectedFloor !== 'all' && String(r.floor) !== String(selectedFloor)) return false;

        // Block filter (if room has blockId or if block's floors match room floor)
        if (selectedBlockId !== 'all') {
            if (r.blockId && r.blockId !== selectedBlockId) return false;
        }

        // Status filter
        if (statusFilter === 'available') {
            if (r.occupied >= r.capacity) return false;
        } else if (statusFilter === 'vacate') {
            if (r.status !== 'vacate_notice') return false;
        } else if (statusFilter === 'full') {
            if (r.occupied < r.capacity) return false;
        }

        // Search query
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            const matchesRoom = r.roomNumber.toLowerCase().includes(query);
            const matchesResident = r.residents.some(name => name.toLowerCase().includes(query));
            const matchesFloor = String(r.floor).toLowerCase().includes(query);
            if (!matchesRoom && !matchesResident && !matchesFloor) return false;
        }

        return true;
    });

    // Preview beds for room creation
    const previewBedCount = Math.max(1, parseInt(roomForm.occupancy, 10) || 1);
    const previewBedNames = Array.from({ length: Math.min(previewBedCount, 8) }).map((_, i) =>
        roomForm.roomNo.trim() ? `Bed ${roomForm.roomNo.trim()}-${i + 1}` : `Bed Slot ${i + 1}`
    );

    return (
        <div className="flex flex-col w-full gap-6">
            {/* Header & Hierarchy Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-[#091426] tracking-tight font-display">
                            Rooms & Physical Beds
                        </h1>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Phase 1 Hierarchy
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Structured Inventory Hierarchy: Property &rarr; Blocks &rarr; Floors &rarr; Rooms &rarr; Physical Beds
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        disabled={isInitializingHierarchy}
                        onClick={handleInitializeHierarchy}
                        className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200/90 flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                        title="Auto-provisions Main Block and Floors 1..N based on property configuration"
                    >
                        {isInitializingHierarchy ? (
                            <RefreshCw className="w-3.5 h-3.5 text-cyan-600 animate-spin" />
                        ) : (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span>{isInitializingHierarchy ? 'Initializing...' : 'Initialize Hierarchy'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowCreateBlock(true)}
                        className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200/90 flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Add Block</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (blocks.length > 0) {
                                setFloorForm(prev => ({ ...prev, blockId: String(blocks[0].id) }));
                            }
                            setShowCreateFloor(true);
                        }}
                        className="h-9 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200/90 flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>Add Floor</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setRoomForm({
                                roomNo: '',
                                blockId: blocks.length > 0 ? String(blocks[0].id) : '',
                                floor: '1',
                                roomType: RoomTypeEnum.SINGLE,
                                rentPerMonth: '',
                                occupancy: '1',
                            });
                            setCreateRoomError(null);
                            setShowCreateRoom(true);
                        }}
                        className="h-9 px-4 bg-[#091426] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Room</span>
                    </button>
                </div>
            </div>

            {/* 4 Production Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Rooms */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            Total Rooms
                        </span>
                        <DoorOpen className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="mt-2">
                        <div className="text-3xl font-bold text-[#091426] tracking-tight tabular-nums font-display">
                            {totalRooms}
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span>Configured Blocks</span>
                        <span className="font-semibold text-slate-900">{blocks.length || 1} Block{blocks.length === 1 ? '' : 's'}</span>
                    </div>
                </div>

                {/* Physical Bed Inventory */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            Physical Beds
                        </span>
                        <BedDouble className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div className="mt-2">
                        <div className="text-3xl font-bold text-[#091426] tracking-tight tabular-nums font-display">
                            {totalCapacity}
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Occupied vs Total</span>
                        <span className="font-mono font-semibold text-slate-900">
                            {totalOccupied} / {totalCapacity}
                        </span>
                    </div>
                </div>

                {/* Available Beds */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            Available Beds
                        </span>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="mt-2">
                        <div className="text-3xl font-bold text-emerald-700 tracking-tight tabular-nums font-display">
                            {totalVacantBeds}
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Ready for Admission</span>
                        <span className="font-bold text-emerald-700">Immediate</span>
                    </div>
                </div>

                {/* Maintenance & Notices */}
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                            Maintenance / Notices
                        </span>
                        <Wrench className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="mt-2">
                        <div className="text-3xl font-bold text-amber-700 tracking-tight tabular-nums font-display">
                            {maintenanceBedsCount}
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Vacate Notices</span>
                        <span className="font-bold text-amber-700">
                            {currentRooms.filter(r => r.status === 'vacate_notice').length} Rooms
                        </span>
                    </div>
                </div>
            </div>

            {/* Block & Hierarchy Tabs Bar */}
            {blocks.length > 0 && (
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0 mr-1">
                            <Building2 className="w-3.5 h-3.5" /> Block:
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedBlockId('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                                selectedBlockId === 'all'
                                    ? 'bg-[#091426] text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            All Blocks
                        </button>
                        {blocks.map(b => (
                            <button
                                key={b.id}
                                type="button"
                                onClick={() => setSelectedBlockId(b.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                                    selectedBlockId === b.id
                                        ? 'bg-[#091426] text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                <span>{b.name}</span>
                                <span className={`text-[10px] px-1 rounded ${
                                    selectedBlockId === b.id ? 'bg-slate-800 text-cyan-300' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {b.code}
                                </span>
                            </button>
                        ))}
                    </div>

                    {floors.length > 0 && selectedBlockId !== 'all' && (
                        <div className="flex items-center gap-2 overflow-x-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                                <Layers className="w-3.5 h-3.5" /> Floor:
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedFloor('all')}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                    selectedFloor === 'all' ? 'bg-cyan-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                All
                            </button>
                            {floors.map(f => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setSelectedFloor(String(f.floorNumber))}
                                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                        selectedFloor === String(f.floorNumber)
                                            ? 'bg-cyan-900 text-white font-semibold'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {f.name || `Floor ${f.floorNumber}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            statusFilter === 'all'
                                ? 'bg-[#091426] text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        All Rooms ({currentRooms.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('available')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            statusFilter === 'available'
                                ? 'bg-[#091426] text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Has Vacancy ({currentRooms.filter(r => r.occupied < r.capacity).length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('vacate')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            statusFilter === 'vacate'
                                ? 'bg-[#091426] text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Vacate Notices ({currentRooms.filter(r => r.status === 'vacate_notice').length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('full')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            statusFilter === 'full'
                                ? 'bg-[#091426] text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Fully Occupied ({currentRooms.filter(r => r.occupied >= r.capacity).length})
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-56">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search Room / Resident..."
                            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <div className="hidden lg:flex items-center gap-3 text-xs font-medium text-slate-600 shrink-0">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Notice
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span> Full
                        </span>
                    </div>
                </div>
            </div>

            {/* Room Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRooms.length === 0 ? (
                    <div className="col-span-full bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400 shadow-xs">
                        <DoorOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-700">No rooms match criteria</p>
                        <p className="text-xs text-slate-500 mt-1">
                            {searchQuery
                                ? 'Try adjusting your search query or filters.'
                                : 'Create a room using the "New Room" button above.'}
                        </p>
                    </div>
                ) : (
                    filteredRooms.map(room => {
                        const isFull = room.occupied >= room.capacity;
                        const hasNotice = room.status === 'vacate_notice';
                        const vacancyCount = Math.max(0, room.capacity - room.occupied);
                        const occupancyPercent = Math.round((room.occupied / room.capacity) * 100);
                        const roomBeds = bedsByRoom[room.roomNumber] || [];
                        const isBedsExpanded = expandedRooms[room.roomNumber] !== false;

                        return (
                            <div
                                key={room.roomNumber}
                                className="group bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between gap-4 transition-all duration-200 hover:border-cyan-500/70 hover:ring-2 hover:ring-cyan-400/20 hover:shadow-md"
                            >
                                {/* Card Top */}
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-[#091426] group-hover:text-cyan-400 text-slate-700 flex items-center justify-center transition-colors">
                                                <Terminal className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="font-mono text-base font-bold text-slate-900 group-hover:text-cyan-950 transition-colors">
                                                        Room {room.roomNumber}
                                                    </h2>
                                                    {room.id && (
                                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200/70 px-1 py-0.2 rounded">
                                                            #{room.id}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                    <span>Floor {room.floor}</span>
                                                    <span>•</span>
                                                    <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                                        {room.roomType || getRoomTypeForCapacity(room.capacity)}
                                                    </span>
                                                </div>
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
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-50 text-emerald-800 border border-emerald-200/60">
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
                                                className={`h-1.5 rounded-full transition-all ${
                                                    isFull
                                                        ? 'bg-slate-700'
                                                        : hasNotice
                                                        ? 'bg-amber-500'
                                                        : 'bg-emerald-600'
                                                }`}
                                                style={{ width: `${occupancyPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Interactive Physical Bed Slots Inventory */}
                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                <BedDouble className="w-3.5 h-3.5 text-cyan-600" />
                                                <span>Physical Bed Units ({roomBeds.length || room.capacity})</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setExpandedRooms(prev => ({
                                                        ...prev,
                                                        [room.roomNumber]: !isBedsExpanded,
                                                    }));
                                                }}
                                                className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
                                            >
                                                {isBedsExpanded ? (
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                ) : (
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>

                                        {isBedsExpanded && (
                                            <div className="grid grid-cols-2 gap-2 mt-1.5">
                                                {roomBeds.length > 0 ? (
                                                    roomBeds.map((bed, idx) => {
                                                        const isAvail = bed.status === 'AVAILABLE';
                                                        const isOcc = bed.status === 'OCCUPIED';
                                                        const isMaint = bed.status === 'MAINTENANCE';
                                                        const isRes = bed.status === 'RESERVED';
                                                        const isUpdating = updatingBedId === bed.id;

                                                        return (
                                                            <div
                                                                key={bed.id}
                                                                className={`p-2 rounded-lg border text-xs flex flex-col justify-between gap-1.5 transition-all ${
                                                                    isAvail
                                                                        ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                                                                        : isOcc
                                                                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                                                                        : isMaint
                                                                        ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                                                                        : 'bg-amber-50/60 border-amber-200 text-amber-900'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-mono font-bold text-[11px]">
                                                                        {bed.bedNumber}
                                                                    </span>
                                                                    <span
                                                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                                                            isAvail
                                                                                ? 'bg-emerald-200/70 text-emerald-800'
                                                                                : isOcc
                                                                                ? 'bg-slate-200 text-slate-800'
                                                                                : isMaint
                                                                                ? 'bg-rose-200 text-rose-800'
                                                                                : 'bg-amber-200 text-amber-800'
                                                                        }`}
                                                                    >
                                                                        {bed.status}
                                                                    </span>
                                                                </div>

                                                                {/* Occupant or Toggle Action */}
                                                                {isOcc ? (
                                                                    <span className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                                                        <Users className="w-2.5 h-2.5 text-slate-400" />
                                                                        {room.residents[idx] || 'Active Resident'}
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        disabled={isUpdating}
                                                                        onClick={() => handleToggleBedStatus(bed, room.roomNumber)}
                                                                        title={isAvail ? 'Flag Bed for Housekeeping / Maintenance' : 'Mark Bed as Available'}
                                                                        className={`text-[10px] font-semibold underline text-left flex items-center gap-1 transition-opacity ${
                                                                            isUpdating ? 'opacity-50' : 'hover:opacity-80'
                                                                        }`}
                                                                    >
                                                                        {isUpdating ? (
                                                                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                                                        ) : isMaint ? (
                                                                            'Mark Available'
                                                                        ) : (
                                                                            'Set Maintenance'
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    // Fallback mock visualization if beds are loading
                                                    Array.from({ length: room.capacity }).map((_, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="p-2 rounded-lg border border-slate-100 bg-slate-50/50 text-[11px] text-slate-400 flex items-center justify-between"
                                                        >
                                                            <span>Bed {idx + 1}</span>
                                                            <span className="text-[9px] font-mono">
                                                                {idx < room.occupied ? 'Occupied' : 'Available'}
                                                            </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
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
                                                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                                        res === room.vacatingResident
                                                            ? 'bg-amber-100 text-amber-900 line-through'
                                                            : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    {res}
                                                </span>
                                            ))}
                                            {room.residents.length === 0 && (
                                                <span className="text-[11px] text-slate-400 italic">No residents assigned</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEditingRoom({
                                                    ...room,
                                                    roomType:
                                                        room.roomType ||
                                                        getRoomTypeForCapacity(room.capacity),
                                                })
                                            }
                                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors text-center"
                                        >
                                            Edit Room
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDeleteRoom(room)}
                                            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>

                                    {hasNotice ? (
                                        <button
                                            type="button"
                                            onClick={() => onNavigate && onNavigate('admissions')}
                                            className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <span>Enrol for Vacating Slot ({room.vacateDate})</span>
                                        </button>
                                    ) : !isFull ? (
                                        <button
                                            type="button"
                                            onClick={() => onNavigate && onNavigate('admissions')}
                                            className="w-full py-2 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Enrol into Room {room.roomNumber}</span>
                                        </button>
                                    ) : (
                                        <div className="text-center py-1.5 text-xs text-slate-400 font-medium">
                                            Room is at full physical capacity
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* CREATE ROOM MODAL */}
            {showCreateRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091426]/50 backdrop-blur-xs">
                    <form
                        onSubmit={handleCreateRoom}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5 border border-slate-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                                    <span>Create New Room</span>
                                    <span className="text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-mono">
                                        Auto-Provisions Beds
                                    </span>
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Adds room to property hierarchy and provisions physical bed inventory in 3NF schema.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateRoom(false);
                                    setCreateRoomError(null);
                                }}
                                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {createRoomError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div>{createRoomError}</div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            {/* Block Dropdown */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                    <span>Block</span>
                                    <span className="text-[10px] text-slate-400 font-normal">Hierarchy</span>
                                </label>
                                <select
                                    value={roomForm.blockId}
                                    onChange={e => {
                                        const bId = e.target.value;
                                        setRoomForm(prev => ({ ...prev, blockId: bId }));
                                        if (bId) loadFloorsForBlock(Number(bId));
                                    }}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-xs font-medium text-slate-800"
                                >
                                    <option value="">Default Block</option>
                                    {blocks.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.name} ({b.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Floor Input or Select */}
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
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-xs"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                <span>Room Number *</span>
                                {isDuplicateRoomNo && (
                                    <span className="text-[10px] text-red-600 font-bold">
                                        Duplicate: Already exists in property!
                                    </span>
                                )}
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
                                placeholder="e.g. 301"
                                className={`h-9 px-3 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none text-xs font-mono ${
                                    isDuplicateRoomNo
                                        ? 'border-red-500 text-red-700 ring-1 ring-red-500'
                                        : 'border-slate-200'
                                }`}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                    <span>Capacity (Beds) *</span>
                                    <span className="text-[10px] text-blue-600 font-medium">1-10</span>
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={roomForm.occupancy}
                                    onChange={e => handleAddRoomCapacityChange(e.target.value)}
                                    placeholder="1"
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-mono text-xs"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                    <span>Room Type *</span>
                                    <span className="text-[10px] text-emerald-600 font-medium">Chained</span>
                                </label>

                                <select
                                    value={roomForm.roomType}
                                    onChange={e => handleAddRoomTypeChange(e.target.value)}
                                    className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-xs font-medium text-slate-800"
                                >
                                    <option value={RoomTypeEnum.SINGLE}>Single (1 Person)</option>
                                    <option value={RoomTypeEnum.DOUBLE}>Double (2 Persons)</option>
                                    <option value={RoomTypeEnum.TRIPLE}>Triple (3 Persons)</option>
                                    <option value={RoomTypeEnum.FOUR_SHARING}>Four-Sharing (4 Persons)</option>
                                    <option value={RoomTypeEnum.DORMITORY}>Dormitory (5+ Persons)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">
                                Monthly Rent (₹) *
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
                                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-xs font-mono"
                                required
                            />
                        </div>

                        {/* Live Physical Bed Slot Provisioning Preview */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                    <BedDouble className="w-3.5 h-3.5 text-cyan-600" />
                                    <span>Automatic Physical Bed Inventory Preview</span>
                                </span>
                                <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                                    {previewBedCount} Record{previewBedCount > 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {previewBedNames.map((name, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-1 rounded bg-white border border-slate-200 text-[10px] font-mono font-medium text-slate-700 shadow-2xs"
                                    >
                                        🛏️ {name}
                                    </span>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2">
                                ⚡ Enforces DB Normalization: Child beds will be saved with scoped unique constraint <code className="font-mono text-slate-600">uk_beds_room_number</code>.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateRoom(false);
                                    setCreateRoomError(null);
                                }}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={isCreatingRoom || isDuplicateRoomNo}
                                className="px-4 py-2 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isCreatingRoom ? 'Creating Room & Beds...' : 'Create Room'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* CREATE BLOCK MODAL */}
            {showCreateBlock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091426]/50 backdrop-blur-xs">
                    <form
                        onSubmit={handleCreateBlock}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 flex flex-col gap-4"
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-cyan-600" />
                                <span>Create Block</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCreateBlock(false)}
                                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">
                                Block Name *
                            </label>
                            <input
                                type="text"
                                value={blockForm.name}
                                onChange={e => setBlockForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. North Wing or Block B"
                                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-xs"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">
                                Block Code *
                            </label>
                            <input
                                type="text"
                                value={blockForm.code}
                                onChange={e => setBlockForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                placeholder="e.g. BLK-B"
                                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-mono text-xs uppercase"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowCreateBlock(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingBlock}
                                className="px-4 py-2 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                            >
                                {isSubmittingBlock ? 'Saving...' : 'Add Block'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* CREATE FLOOR MODAL */}
            {showCreateFloor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091426]/50 backdrop-blur-xs">
                    <form
                        onSubmit={handleCreateFloor}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 border border-slate-200 flex flex-col gap-4"
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-cyan-600" />
                                <span>Add Floor to Block</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCreateFloor(false)}
                                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">
                                Target Block *
                            </label>
                            <select
                                value={floorForm.blockId}
                                onChange={e => setFloorForm(prev => ({ ...prev, blockId: e.target.value }))}
                                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-xs font-medium"
                                required
                            >
                                <option value="">Select Block</option>
                                {blocks.map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} ({b.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">
                                Floor Number *
                            </label>
                            <input
                                type="number"
                                value={floorForm.floorNumber}
                                onChange={e => setFloorForm(prev => ({ ...prev, floorNumber: e.target.value }))}
                                placeholder="e.g. 3"
                                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none font-mono text-xs"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">
                                Floor Label (Optional)
                            </label>
                            <input
                                type="text"
                                value={floorForm.name}
                                onChange={e => setFloorForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. Third Floor"
                                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none text-xs"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowCreateFloor(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmittingFloor}
                                className="px-4 py-2 bg-[#091426] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                            >
                                {isSubmittingFloor ? 'Saving...' : 'Add Floor'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* EDIT ROOM MODAL */}
            {editingRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091426]/50 backdrop-blur-xs">
                    <form
                        onSubmit={handleUpdateRoom}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 border border-slate-200 flex flex-col gap-4"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Edit Room {editingRoom.roomNumber}
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Updating capacity will automatically synchronize physical bed records.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setEditingRoom(null)}
                                className="text-slate-400 hover:text-slate-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
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
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                        <span>Capacity (Beds)</span>
                                        <span className="text-[10px] text-blue-600 font-medium">Auto-Sync</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={editingRoom.capacity}
                                        onChange={e => handleEditRoomCapacityChange(e.target.value)}
                                        className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                                        <span>Room Type</span>
                                        <span className="text-[10px] text-emerald-600 font-medium">Chained</span>
                                    </label>
                                    <select
                                        value={editingRoom.roomType ?? getRoomTypeForCapacity(editingRoom.capacity)}
                                        onChange={e => handleEditRoomTypeChange(e.target.value)}
                                        className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                                    >
                                        <option value={RoomTypeEnum.SINGLE}>Single (1 Person)</option>
                                        <option value={RoomTypeEnum.DOUBLE}>Double (2 Persons)</option>
                                        <option value={RoomTypeEnum.TRIPLE}>Triple (3 Persons)</option>
                                        <option value={RoomTypeEnum.FOUR_SHARING}>Four-Sharing (4 Persons)</option>
                                        <option value={RoomTypeEnum.DORMITORY}>Dormitory (5+ Persons)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Monthly Rent (₹)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editingRoom.rent}
                                    onChange={e =>
                                        setEditingRoom({
                                            ...editingRoom,
                                            rent: Number(e.target.value),
                                        })
                                    }
                                    className="mt-1 w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                                    required
                                />
                            </div>

                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-center justify-between">
                                <span>Current Occupancy:</span>
                                <strong className="font-mono text-slate-900">{editingRoom.occupied} residents</strong>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingRoom(null)}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingRoom}
                                    className="px-5 py-2 bg-[#091426] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                                >
                                    {isUpdatingRoom ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
