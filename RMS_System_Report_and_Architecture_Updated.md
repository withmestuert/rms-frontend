# Comprehensive System Status & Engineering Report: Residential Management System (RMS)

---

## Executive Summary & System Overview

The **Residential Management System (RMS)** has completed a transformative phase of architectural stabilization, database hardening, and automation upgrades. The platform manages multi-property hostels, co-living spaces, and PG accommodations across their operational lifecycle: from **inquiry and bed allocation**, to **automated cycle invoicing**, **Razorpay online gateway settlements**, **automated WhatsApp rent reminders**, and **vacate deposit reconciliations**.

The backend is built with **Spring Boot 3 (Java 21)**, **PostgreSQL 17** (governed strictly by **Flyway migrations `V0` through `V7`**), and a reactive **React / TypeScript / Vite / Tailwind CSS** frontend.

---

# Part 1: Client Briefing (Business & Operational Perspective)

> **Audience:** Property Owners, Operations Directors, Managing Stakeholders  
> **Focus:** Business value, revenue protection, operational efficiency, and resident experience.

### 1.1 What We Upgraded & Why It Matters

| Capability | Operational Benefit | Business Value |
| :--- | :--- | :--- |
| **Automated Rent Invoicing** | Automatically provisions and runs billing on the 1st of every month across all properties. | Eliminates manual calculations, missed bills, and administrative overhead. |
| **Instant Online Payments** | Seamless Razorpay gateway integration with UPI, Net Banking, and Cards. | Faster cash collections, lower default rates, and immediate digital receipts. |
| **Public Invoice Portals** | Secure unauthenticated link sent via WhatsApp/SMS directly to residents. | Tenants pay in under 30 seconds without needing complex app logins. |
| **Automated WhatsApp Reminders**| Intelligent categorization (`DUE_SOON`, `DUE_TODAY`, `OVERDUE`) with 1-click or cron dispatch. | Drastically improves collection efficiency and reduces overdue arrears. |
| **Bed-Level Inventory Precision**| Tracks individual beds (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`) within blocks and floors. | Eliminates double-booking and optimizes room yield. |
| **Frictionless Move-Out Settlements** | Formal vacate workflow with damage charge deductions and deposit offsets. | Protects property assets, speeds up turnover, and maintains clean accounting. |
| **Executive Business Intelligence**| Real-time KPIs, RevPAU, room yield curves, defaulters aging, and 1-click CSV exports. | Complete financial transparency, investor compliance, and tax readiness. |

---

# Part 2: Senior Developer & Architect Technical Report

> **Audience:** Technical Leads, Software Architects, Senior Engineers  
> **Focus:** Data integrity, partitioning, transactional guarantees, idempotency, schema evolution, and REST API contracts.

### 2.1 Database Design & Migration Evolution (`V0` → `V7`)

The database runs on **PostgreSQL 17** under strict Flyway schema management (`spring.jpa.hibernate.ddl-auto=validate`). Dynamic schema manipulation at runtime is disabled.

#### Detailed Migration Breakdown:
* **`V0__baseline_schema.sql`**: Baseline snapshot of the existing relational foundation: `properties`, `rooms`, `tenants`, `admissions`, `invoices`, `payments`, `ledger_transactions`, `vacate_requests`, `users`, `property_archive_snapshots`, `migration_exceptions`.
* **`V1__property_safeguards.sql`**: Introduces soft-delete support (`is_deleted`, `deleted_at`, `ttl_expires_at`), pre-delete snapshot preservation (`property_archive_snapshots`), and default property safeguards.
* **`V2__blocks_and_floors_hierarchy.sql`**: Decouples properties into physical sub-structures:
  - `blocks` (`id`, `name`, `code`, `property_id`)
  - `floors` (`id`, `floor_number`, `floor_name`, `block_id`, `property_id`)
* **`V3__rooms_surrogate_and_beds.sql`**:
  - Adds a surrogate primary identity `rooms.id BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE` to prevent natural-key lock contention on `room_no`.
  - Introduces `beds` (`id`, `bed_number`, `status`, `room_id`, `tenant_uid`).
* **`V4__gateway_orders.sql`**: Creates `gateway_orders` to track order generation, signature matching, Razorpay order IDs, and payment verification lifecycles.
* **`V5__rent_reminder_logs.sql`**: Establishes `reminder_logs` capturing channel (`WHATSAPP`, `SMS`), delivery status (`SENT`, `FAILED`), phone number, category (`DUE_SOON`, `DUE_TODAY`, `OVERDUE`), and payload logs.
* **`V6__reminder_scheduler.sql`**:
  - `reminder_scheduler_config`: Singleton configuration table governing cron schedules, lookahead days, and auto-dispatch enablement.
  - `reminder_scheduler_runs`: Execution audit capturing duration, candidate count, dispatch count, and failure traces.
* **`V7__invoices_monthly_partitioning.sql`**:
  - Upgrades `invoices` to a **PostgreSQL Declarative Range-Partitioned Table** partitioned on `created_at`.
  - Composite primary key: `PRIMARY KEY (id, created_at)`.
  - Stored PL/pgSQL procedures `create_invoice_monthly_partition(p_date)` and `auto_provision_invoice_partitions(months_ahead)` dynamically manage partition lifecycles.
  - Foreign key constraints from `gateway_orders`, `payments`, and `reminder_logs` were safely replaced with high-cardinality secondary indexes (`idx_payments_invoice_id`, etc.) to eliminate partition lock contention during concurrent write batches.

---

### 2.2 Relational Entity-Relationship (ER) Architecture

```
PROPERTIES ────< BLOCKS ────< FLOORS ────< ROOMS ────< BEDS
    │                                                    ▲
    │                                                    │ (assigned_to)
    └──────────< TENANTS ────────────────────────────────┘
                    │
                    ├───< ADMISSIONS
                    ├───< INVOICES (Monthly Range-Partitioned)
                    │        ├───< PAYMENTS
                    │        ├───< GATEWAY_ORDERS (Razorpay)
                    │        └───< REMINDER_LOGS (WhatsApp/SMS)
                    ├───< LEDGER_TRANSACTIONS (Double-Entry Financial Journal)
                    └───< VACATE_REQUESTS (Deposit Offset & Settlement)
```

---

### 2.3 End-to-End API Endpoint Catalog

All operational endpoints enforce multi-tenancy scoping via the `X-Property-Id: <id>` request header.

#### 1. Admissions & Enrollment Module (`/api/admissions`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `POST` | `/api/admissions` | Submit initial enrollment request (`AdmissionRequestDto`). Reserves room/bed capacity. |
| `GET` | `/api/admissions/check-existing` | Deduplication check by `aadhaarNo` or `mobileNumber`. Returns prior stay history. |
| `GET` | `/api/admissions` | Fetch all admissions (scoped to property via `X-Property-Id`). |
| `GET` | `/api/admissions/{admissionNumber}` | Fetch specific admission profile by unique admission number. |
| `PUT` | `/api/admissions/{admissionNumber}/confirm`| Confirms admission, transitions status `PENDING` → `CONFIRMED`, activates Tenant record. |
| `DELETE`| `/api/admissions/{admissionNumber}` | Cancels pending admission and de-allocates reserved room capacity. |

#### 2. Physical Hierarchy & Inventory (`/api`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `POST` | `/api/properties/{propertyId}/initialize-hierarchy` | Generates default blocks/floors hierarchy for legacy properties. |
| `GET` | `/api/properties/{propertyId}/hierarchy` | Returns full nested hierarchy: Property → Blocks → Floors → Rooms → Beds. |
| `GET` | `/api/properties/{propertyId}/blocks` | Retrieve all blocks associated with a property. |
| `POST` | `/api/properties/{propertyId}/blocks` | Create a new Block (`{"name": "...", "code": "..."}`). |
| `GET` | `/api/blocks/{blockId}` | Retrieve Block details by ID. |
| `PUT` | `/api/blocks/{blockId}` | Update Block name or code. |
| `DELETE`| `/api/blocks/{blockId}` | Delete Block (blocked if child floors/rooms exist). |
| `GET` | `/api/blocks/{blockId}/floors` | Retrieve floors belonging to a block. |
| `POST` | `/api/blocks/{blockId}/floors` | Add a floor to a block (`{"floorNumber": 1, "floorName": "First Floor"}`). |
| `GET` | `/api/floors/{floorId}` | Retrieve Floor details. |
| `PUT` | `/api/floors/{floorId}` | Update floor metadata. |
| `DELETE`| `/api/floors/{floorId}` | Delete floor. |
| `GET` | `/api/rooms` | List all rooms (filtered by `X-Property-Id`). |
| `POST` | `/api/rooms` | Create new Room with bed capacity. |
| `GET` | `/api/rooms/{roomNo}` | Fetch room details. |
| `GET` | `/api/rooms/{roomNo}/beds` | List all bed slots and occupancy states for a room. |
| `PUT` | `/api/rooms/{roomNo}` | Update room configuration and standard rent. |
| `DELETE`| `/api/rooms/{roomNo}` | Remove room (prohibited if occupied). |
| `PATCH`| `/api/beds/{bedId}/status` | Update individual bed status (`AVAILABLE`, `OCCUPIED`, `UNDER_MAINTENANCE`). |

#### 3. Properties Management (`/api/properties`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `GET` | `/api/properties` | List active properties (`is_deleted = false`). |
| `GET` | `/api/properties/archived` | List soft-deleted properties awaiting TTL purge. |
| `GET` | `/api/properties/{id}` | Get property details by ID. |
| `POST` | `/api/properties` | Create new property. |
| `PUT` | `/api/properties/{id}` | Update property metadata and configurations. |
| `POST` | `/api/properties/{id}/soft-delete`| Soft-deletes property, creates full JSON snapshot in `property_archive_snapshots`. |
| `POST` | `/api/properties/{id}/restore` | Restores soft-deleted property before TTL expiration. |
| `GET` | `/api/properties/{id}/snapshot`| Retrieve archival snapshot. |
| `DELETE`| `/api/properties/{id}` | Permanent hard purge. |

#### 4. Tenants Module (`/api/tenants`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `GET` | `/api/tenants` | List all active residents. |
| `GET` | `/api/tenants/{uid}` | Retrieve tenant profile by UID. |
| `GET` | `/api/tenants/room/{roomNo}` | List residents assigned to a specific room. |
| `POST` | `/api/tenants` | Direct tenant creation. |
| `PUT` | `/api/tenants/{uid}` | Update profile, contacts, official ID, and rent details. |
| `PUT` | `/api/tenants/{uid}/verify-advance` | Mark advance/security deposit as verified (`PAID`). |
| `DELETE`| `/api/tenants/{uid}` | Deactivate/remove tenant record. |

#### 5. Invoicing, Billing & Partitioning (`/api/invoices`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `GET` | `/api/invoices` | List invoices (optional filters: `monthYear`, `tenantUid`). |
| `GET` | `/api/invoices/partitioned` | Query partitioned table by `monthYear` (`YYYY-MM`). Leverages partition pruning. |
| `GET` | `/api/invoices/tenant-monthly-ledger` | Consolidated statement: rent, arrears, payments, and balance per tenant. |
| `GET` | `/api/invoices/{id}` | Fetch invoice record by ID. |
| `POST` | `/api/invoices` | Create single manual invoice. |
| `POST` | `/api/invoices/generate-cycle` | Trigger bulk cycle generation for all active tenants for a target billing period. |
| `GET` | `/api/invoices/auto-cycle/status` | Retrieve automated cycle scheduler execution status and next run time. |
| `POST` | `/api/invoices/auto-cycle/trigger`| Manually trigger the scheduled billing engine. |
| `POST` | `/api/invoices/{id}/pay` | Record direct payment against an invoice and write to the general ledger. |

#### 6. Double-Entry Financial Ledger (`/api/ledger`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `GET` | `/api/ledger` | Fetch transaction journal (filterable by property, date range). |
| `GET` | `/api/ledger/balance` | Get net running balance and credit/debit aggregates. |
| `POST` | `/api/ledger` | Record manual adjustment transaction. |
| `GET` | `/api/ledger/tenant/{tenantUid}` | Fetch full ledger transaction history for a specific tenant. |
| `GET` | `/api/ledger/invoice/{invoiceId}`| Fetch ledger journal entries related to a specific invoice. |

#### 7. Payments & Public Payment Gateway (`/api/payments`, `/api/public/invoices`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `POST` | `/api/payments` | Record offline payment (Cash, Bank Transfer, POS). |
| `GET` | `/api/payments` | List all historical payment records. |
| `GET` | `/api/payments/{id}` | Get payment by ID. |
| `GET` | `/api/payments/invoice/{invoiceId}` | Get all payments applied against an invoice. |
| `GET` | `/api/public/invoices/{invoiceNumber}` | Public, unauthenticated tenant checkout endpoint. Returns breakdown & active gateway order. |
| `POST` | `/api/payments/razorpay/create-order` | Create Razorpay server-side order for public checkout. |
| `POST` | `/api/payments/razorpay/verify-payment`| Cryptographically verify Razorpay signature (`HMAC-SHA256`) and apply payment. |
| `POST` | `/api/payments/razorpay/webhook` | Asynchronous Razorpay webhook processing (`order.paid`, `payment.captured`). |

#### 8. Notifications & Rent Reminder Engine (`/api/notifications`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `GET` | `/api/notifications/reminders/queue` | Get categorized reminder candidates: `UPCOMING_DUE`, `DUE_TODAY`, `OVERDUE`. |
| `POST` | `/api/notifications/reminders/send` | Dispatch batched WhatsApp/SMS notices to selected tenant queue. |
| `GET` | `/api/notifications/reminders/stats` | Aggregate metrics: total pending, sent today, failure rate. |
| `GET` | `/api/notifications/reminders/logs` | Audit trail of dispatched reminders (`ReminderLog`). |
| `GET` | `/api/notifications/reminders/scheduler/config` | Get automated reminder scheduler configuration. |
| `PUT` | `/api/notifications/reminders/scheduler/config` | Update cron schedule, auto-dispatch flags, lookahead days. |
| `POST` | `/api/notifications/reminders/scheduler/trigger`| Manually execute the reminder scheduler cycle. |
| `GET` | `/api/notifications/reminders/scheduler/runs` | List automated reminder run history and execution telemetry. |
| `GET` | `/api/notifications/whatsapp/welcome-preview/{tenantUid}` | Preview personalized WhatsApp onboarding package for resident. |
| `POST` | `/api/notifications/whatsapp/send-welcome/{tenantUid}` | Trigger WhatsApp welcome message with rules & payment details. |

#### 9. Vacate Management & Deposit Settlement (`/api/vacate-requests`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `POST` | `/api/vacate-requests` | Submit formal notice of intention to vacate (`VacateRequestDto`). |
| `GET` | `/api/vacate-requests` | List all vacate requests with status filtering (`PENDING`, `APPROVED`, etc.). |
| `GET` | `/api/vacate-requests/{id}` | Get vacate notice details. |
| `PUT` | `/api/vacate-requests/{id}/approve` | Approve vacate notice, set scheduled inspection date. |
| `PUT` | `/api/vacate-requests/{id}/reject` | Reject vacate request with reason. |
| `PUT` | `/api/vacate-requests/{id}/charges` | Itemize final charges (damages, cleaning, unpaid utilities). |
| `PUT` | `/api/vacate-requests/{id}/complete`| Execute settlement: offsets charges against deposit, releases room & bed back to `AVAILABLE`. |

#### 10. Executive Analytics & Reporting (`/api/reports`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `GET` | `/api/reports/summary` | High-level summary metrics (occupancy rate, month revenue, active defaulters). |
| `GET` | `/api/reports/property-performance` | Comparative operational performance across all properties. |
| `GET` | `/api/reports/monthly-intake` | Monthly admissions vs move-outs trends. |
| `GET` | `/api/reports/demographics` | Tenant demographic breakdown (institutions, corporate, blood groups). |
| `GET` | `/api/reports/analytics/kpis` | Core financial KPIs: Collection efficiency, RevPAU (Revenue Per Available Unit). |
| `GET` | `/api/reports/analytics/room-type-yield` | Yield analytics by room category (Single, Double, Triple). |
| `GET` | `/api/reports/analytics/revenue-trends` | 12-month trailing revenue and collection performance. |
| `GET` | `/api/reports/analytics/defaulters-aging`| Defaulters segmented by aging buckets: 0-30 days, 31-60 days, 60+ days. |
| `GET` | `/api/reports/analytics/deposits-custody`| Active security deposits held in escrow vs. pending refunds. |
| `GET` | `/api/reports/analytics/turnover` | Resident retention and average length-of-stay metrics. |
| `GET` | `/api/reports/export/rent-roll` | **Stream CSV**: Master monthly rent-roll report. |
| `GET` | `/api/reports/export/defaulters`| **Stream CSV**: Defaulters audit and arrears report. |
| `GET` | `/api/reports/export/deposits` | **Stream CSV**: Security deposits liability register. |
| `GET` | `/api/reports/export/ledger` | **Stream CSV**: Complete financial general ledger transactions. |

#### 11. Webhooks & System Controls (`/api`)
| HTTP Method | Route | Description / Parameters |
| :--- | :--- | :--- |
| `GET` | `/api/whatsapp/webhook` | Meta/WhatsApp Cloud API webhook challenge handshake verification. |
| `POST` | `/api/whatsapp/webhook` | Handles inbound WhatsApp delivery statuses and tenant reply messages. |
| `POST` | `/api/webhooks/vacate-request` | Webhook ingestion endpoint for external public vacate forms. |
| `POST` | `/api/payments/webhook` | Asynchronous payment event intake. |
| `GET` | `/api/webhooks/status` | Webhook endpoint health check. |
| `POST` | `/api/system/clean-database` | Administrative test database reset (sanitized for staging/demo environments). |

---

### 2.4 Data Flow & Concurrency Mechanics

#### A. Public Online Payment Settlement & Ledger Invariant
1. **Public Request:** Resident opens unauthenticated link `GET /api/public/invoices/{invoiceNumber}`.
2. **Order Creation:** Frontend calls `POST /api/payments/razorpay/create-order` with invoice ID and amount.
3. **Gateway Communication:** Server issues Razorpay Orders API request, stores `gateway_orders` entry in `CREATED` status.
4. **Resident Auth:** Resident completes payment via UPI/Card in Razorpay SDK modal.
5. **Cryptographic Verification:** Signature verified server-side using `HMAC-SHA256(order_id + "|" + payment_id, secret)`.
6. **Double-Entry Ledger:** `paid_amount` updated on `invoices`, a `payments` row is created, and an auditable entry is logged to `ledger_transactions` updating the running balance.

#### B. Tenant Vacate, Assessment, and Inventory Release Flow
1. **Notice Submission:** Tenant submits vacate notice (`POST /api/vacate-requests`).
2. **Inspection & Charges:** Admin inspects room and attaches damage/cleaning charges (`PUT /api/vacate-requests/{id}/charges`).
3. **Settlement & Completion:** Admin finalizes vacate (`PUT /api/vacate-requests/{id}/complete`). The system offsets charges against the advance deposit, marks the tenant `INACTIVE`, and updates the bed to `AVAILABLE`.

---

# Part 3: Junior Developer Onboarding & Implementation Guide

> **Audience:** New Engineers, Full-Stack Contributors, Support Developers  
> **Focus:** Codebase navigation, request lifecycles, key conventions, testing, and debugging.

### 3.1 Project Structure & Layering Mental Model

The backend is located in `/rms-backend` and follows standard Spring Boot DDD-lite package modularity:
$$\text{Controller (HTTP/DTO)} \longrightarrow \text{Service (Business Logic)} \longrightarrow \text{Repository (Spring Data JPA)} \longrightarrow \text{PostgreSQL 17}$$

### 3.2 Key Architectural Conventions You Must Follow

1. **Multi-Property Header Scoping:** Always verify queries scope by `propertyId` via `X-Property-Id` header.
2. **Flyway Migrations:** Never edit existing migrations (`V0` to `V7`). Always add incremental migrations (`V8__...sql`).
3. **Double-Entry Financial Ledger Invariant:** Never update invoice amounts without recording corresponding `ledger_transactions`.
4. **Phone Number Sanitization:** Ensure Indian phone numbers are formatted in E.164 (e.g. `919876543210`) for WhatsApp notifications.

### 3.3 Running and Verifying Features Locally

Python regression scripts in `/scratch/`:
- `python scratch/test_tenant_monthly_ledger_live.py` (Billing & Invoicing)
- `python scratch/test_reminders_live.py` (Rent Reminder Queue)
- `python scratch/test_razorpay_gateway_live.py` (Payment Gateway)
- `python scratch/test_vacate_live.py` (Vacate Workflow)
- `python scratch/test_analytics_live.py` (Analytics & CSV Export)

---

## Summary Matrix of System Components

| Domain | Key Entities / Tables | Primary Services | Status & Capabilities |
| :--- | :--- | :--- | :--- |
| **Properties** | `properties`, `blocks`, `floors` | `PropertyService` | Decoupled hierarchy, soft-delete with JSON snapshotting. |
| **Rooms & Beds**| `rooms`, `beds` | `RoomService` | Bed-level slot tracking (`AVAILABLE`, `OCCUPIED`). |
| **Tenants** | `tenants`, `admissions` | `TenantService`, `AdmissionService` | Aadhaar deduplication, advance verification, profile lifecycle. |
| **Billing** | `invoices` (Partitioned), `payments` | `BillingService`, `AutoRentInvoiceScheduler` | Range-partitioned monthly invoices, automated 1st-of-month cycles. |
| **Payments** | `gateway_orders`, `payments` | `RazorpayService` | HMAC-SHA256 verified Razorpay checkout, public invoice URLs. |
| **Ledger** | `ledger_transactions` | `BillingService` | Double-entry auditable credit/debit transaction log. |
| **Reminders** | `reminder_logs`, `reminder_scheduler_config`, `reminder_scheduler_runs` | `RentReminderService`, `RentReminderScheduler` | Queue triage, WhatsApp templates, configurable auto-scheduler. |
| **Vacate** | `vacate_requests` | `VacateRequestService` | Move-out charges assessment, deposit offset, bed deallocation. |
| **Reports** | Analytics DTO projections | `AnalyticsService`, `ReportExportService` | Real-time KPIs, yield curves, streaming CSV data exports. |
