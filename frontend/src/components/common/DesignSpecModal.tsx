import React, { useState } from 'react';
import {
    X,
    Copy,
    Check,
    Code,
    Palette,
    FileText,
    Server,
} from 'lucide-react';

interface DesignSpecModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const STITCH_FIGMA_PROMPT = `
# SYSTEM DESIGN SPECIFICATION & PROMPT FOR STITCH / FIGMA AI

## Persona & Product Goal
You are generating "Project RMS - Property Operations", a mission-critical desktop and web ERP for high-velocity residential, PG (Paying Guest), and student hostel operators.
The UI must deliver instant cognitive clarity, zero decorative fluff, authoritative financial and allocation accuracy, and high information density.

## Archetype & Visual Language
- Archetype: Restrained Enterprise & Architectural Utility.
- Strict anti-slop guidelines: NO purple gradients, NO glowing cyan drop shadows, NO arbitrary card nesting.
- Borders: Crisp 1px hairlines (#E2E8F0) over pure white (#FFFFFF) elevated surfaces.
- Neutral Canvas: Low-glare ergonomic working background (#F8FAFC / #F8F9FF).

## Color Tokens
- Canvas/Background: #F8F9FF
- Surface Elevation 1: #FFFFFF
- Secondary Container (Blue highlight): #316BF3
- Primary Text: #091426 (Slate 950)
- Secondary Text: #45474C (Slate 500)
- Available / Success (Emerald): BG #ECFDF5, Border #A7F3D0, Text #065F46, Dot #059669
- Occupied / Active (Navy): BG #1E293B, Text #FFFFFF
- Pending / Hold (Amber): BG #FFFBEB, Border #FDE68A, Text #92400E, Dot #D97706
- Error / Full / Maintenance (Crimson/Slate): BG #FEF2F2, Border #FECACA, Text #991B1B

## Typography Scale
- Display Headings: Plus Jakarta Sans (headline-xl 28px/700, headline-lg 22px/600, headline-md 18px/600)
- Body & Labels: Inter (title-sm 15px/600, body-md 14px/400, body-sm 13px/400, label-md 12px/600 uppercase, label-sm 11px/600 uppercase)
- Code & Masked Identifiers: JetBrains Mono (12px/500)
- Numerical Alignment: All monetary and count cells must use font-variant-numeric: tabular-nums.

## Application Shell
- Left Fixed Sidebar: 260px width
  - Property brand header with switcher ("Greenwood PG - Phase 1")
  - Navigation groups:
    - Overview: Dashboard
    - Residents: Tenants, Admissions
    - Property: Properties, Buildings, Floors, Rooms, Beds
    - Finance: Rent & Billing, Payments, Ledger
    - Communication: Notifications
    - Reports: Reports
    - System: Settings
  - Footer: Manager profile (Rajesh Sharma) & "API Online • PostgreSQL Connected" indicator
- Top Fixed Header: 56px height
  - Breadcrumb trail (RMS > Operations > Greenwood PG)
  - Universal Search bar (Ctrl + K)
  - Quick Admission button, Notification counter pill, User avatar menu
- Main Workspace: 24px padding (space-2xl), 100% fluid grid width.

## Core Views Specification
1. Dashboard:
   - Live shift indicator ("Morning Ops", IST timestamp)
   - 4 Metric cards: Total Capacity (184 beds), Occupancy Rate (88.6%), Available Beds (21), Admissions Queue (5)
   - Urgent Action Sign-Off Queue: Cards with "Review & Confirm", "Hold", "Approve Override"
   - Floor Capacity Matrix: Visual cluster of rooms across floors 1-3 with hover popovers
   - Split bottom: Recent Admissions Table (60%) + Quick Allocation Finder (40%)
2. Tenants:
   - Search + multi-criteria dropdown filters (Occupation, Building, Status)
   - Table / Grid toggle, Active filter chips
   - Table with copyable UID, masked Aadhaar (\`•••• •••• 4912\`) with audit-logged reveal eye button
   - Quick Inspector side card with Call, WhatsApp, rent balance, security deposit, guardian details
3. Admissions Workflow:
   - Multi-step stepper (Tenant Resolution -> Room & Bed Allocation -> Terms -> Confirmation)
   - Advisory lock timer (e.g. 14:48 countdown)
   - Real-time floor allocation grid with bed selection mosaic (Room 204 Bed C window view)
   - Sticky financial summary card (Base tariff, security deposit, initial due)
4. Rooms & Beds:
   - Floor selector + status filter pills (All, Available, Occupied, Maintenance)
   - Room cards showing bed slots with occupant names, available allocate buttons, held beds with countdowns
   - Slide-over inspector drawer for held bed with applicant metadata & confirm CTA

## Spring Boot REST API Contracts
- GET /api/v1/dashboard/overview -> returns capacity, occupancy, urgentActions
- GET /api/v1/tenants -> query params: search, occupation, building, status
- POST /api/v1/tenants -> create resident dossier
- GET /api/v1/rooms?floor=2 -> rooms with nested bed inventory & hold states
- POST /api/v1/rooms/{roomNumber}/beds/{bedLetter}/lock -> acquires PostgreSQL advisory lock
- POST /api/v1/admissions -> finalizes lease agreement & creates invoice
- GET /api/v1/finance/invoices & /api/v1/finance/ledger -> double-entry transaction journal
`;

export const SPRING_BOOT_REST_SPEC = `
// Java Spring Boot REST Controller Contracts for Project RMS

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class PropertyOperationsController {

    // 1. Dashboard Overview
    @GetMapping("/dashboard/overview")
    public ResponseEntity<DashboardOverviewDTO> getDashboardOverview(
            @RequestParam(defaultValue = "1") Long propertyId) { ... }

    // 2. Tenant Directory & KYC
    @GetMapping("/tenants")
    public ResponseEntity<Page<TenantDTO>> searchTenants(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String occupation,
            @RequestParam(required = false) String building,
            @RequestParam(required = false) TenantStatus status,
            Pageable pageable) { ... }

    @GetMapping("/tenants/{uid}/aadhaar-reveal")
    public ResponseEntity<AadhaarRevealDTO> revealAadhaarWithAuditLog(
            @PathVariable String uid,
            @AuthenticationPrincipal UserDetails user) { ... }

    // 3. Rooms & Real-time Bed Concurrency
    @GetMapping("/properties/{propertyId}/floors/{floorNumber}/rooms")
    public ResponseEntity<List<RoomDTO>> getFloorRooms(
            @PathVariable Long propertyId,
            @PathVariable Integer floorNumber) { ... }

    @PostMapping("/rooms/{roomNumber}/beds/{bedLetter}/acquire-lock")
    public ResponseEntity<BedHoldLockDTO> acquireAdvisoryLock(
            @PathVariable String roomNumber,
            @PathVariable String bedLetter,
            @RequestBody LockRequestDTO request) {
        // Executes: SELECT pg_try_advisory_lock(:lockKey)
    }

    @PostMapping("/rooms/{roomNumber}/beds/{bedLetter}/release-lock")
    public ResponseEntity<Void> releaseAdvisoryLock(
            @PathVariable String roomNumber,
            @PathVariable String bedLetter) { ... }

    // 4. Resident Admissions Workflow
    @PostMapping("/admissions")
    public ResponseEntity<AdmissionDTO> createAdmission(
            @Valid @RequestBody CreateAdmissionRequest request) { ... }

    // 5. Billing & Ledger
    @GetMapping("/finance/invoices")
    public ResponseEntity<List<InvoiceDTO>> getInvoices(
            @RequestParam(required = false) InvoiceStatus status) { ... }

    @PostMapping("/finance/invoices/{id}/record-payment")
    public ResponseEntity<TransactionDTO> recordPayment(
            @PathVariable String id,
            @RequestBody RecordPaymentRequest request) { ... }
}
`;

export const DesignSpecModal: React.FC<DesignSpecModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'prompt' | 'spring'>('prompt');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const contentToCopy = activeTab === 'prompt' ? STITCH_FIGMA_PROMPT : SPRING_BOOT_REST_SPEC;

    const handleCopy = () => {
        navigator.clipboard.writeText(contentToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#091426]/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#091426] text-white flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 font-display">
                                UI/UX Design Specification &amp; Spring Boot REST API
                            </h2>
                            <p className="text-xs text-slate-500">
                                Approved tokens, component states, and backend integration contracts
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab switch */}
                <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('prompt')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${activeTab === 'prompt'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <Palette className="w-3.5 h-3.5 text-blue-600" />
                            Stitch / Figma AI Design Prompt
                        </button>
                        <button
                            onClick={() => setActiveTab('spring')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${activeTab === 'spring'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <Server className="w-3.5 h-3.5 text-emerald-600" />
                            Java Spring Boot REST Contract
                        </button>
                    </div>

                    <button
                        onClick={handleCopy}
                        className="px-3 py-1.5 bg-[#091426] text-white hover:bg-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
                    </button>
                </div>

                {/* Code Content */}
                <div className="p-6 overflow-y-auto font-mono text-xs text-slate-800 bg-slate-50/50 leading-relaxed">
                    <pre className="whitespace-pre-wrap selection:bg-blue-100 p-4 bg-white rounded-lg border border-slate-200 shadow-2xs">
                        {contentToCopy}
                    </pre>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-blue-600" />
                        <span>Tauri React frontend currently operating with mock REST client + live backend toggle.</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
