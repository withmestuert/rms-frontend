# Current Schema Inventory (Phase 0 Baseline)

**Document Purpose:** Comprehensive, evidence-based inventory of the active PostgreSQL database (`rms_db`) and backend JPA entity mappings as of October 18, 2026.  
**Validation Standard:** Distinguishes between:
1. **Confirmed by Current Database:** Verified directly via PostgreSQL catalogs (`information_schema`, `pg_constraint`, `pg_indexes`).
2. **Confirmed by Backend Source Code:** Verified in Spring Boot entity classes and repositories (`com.rms.backend.*`).
3. **Proposed / Unapplied:** Proposed in earlier redesign documentation or migration scripts but **not present** in the running database.

---

## 1. Database Overview

- **Database Engine:** PostgreSQL 17.0 (x86_64)
- **Database Name:** `rms_db`
- **Schema:** `public`
- **Connection Configuration:** `spring.datasource.url=jdbc:postgresql://localhost:5432/rms_db`
- **Hibernate DDL Mode:** `spring.jpa.hibernate.ddl-auto=update` *(Critical operational vulnerability identified in PR-009)*
- **Active Physical Tables (10):**
  1. `properties` (1 record)
  2. `property_archive_snapshots` (0 records)
  3. `rooms` (6 records)
  4. `tenants` (3 records)
  5. `admissions` (3 records)
  6. `vacate_requests` (0 records)
  7. `invoices` (4 records)
  8. `payments` (0 records)
  9. `ledger_transactions` (3 records)
  10. `users` (1 record)

---

## 2. Table-by-Table Schema Specification

### 1. `properties`
*Stores property/building master profiles and soft-delete governance attributes.*

| Column | Database Type | Nullable | Default | Constraints & Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | NO | Generated identity | **PK** (`properties_pkey`) [DB Confirmed] |
| `name` | `varchar(255)` | NO | None | UNIQUE (`ukp5y7iih608g0xwvro8nq20o6o`) [DB Confirmed] |
| `code` | `varchar(255)` | YES | None | UNIQUE (`uk3sct5begnveppanerhm8d3i50`) [DB Confirmed] |
| `address` | `varchar(255)` | YES | None | [DB Confirmed] |
| `city` | `varchar(255)` | YES | None | [DB Confirmed] |
| `state` | `varchar(255)` | YES | None | [DB Confirmed] |
| `pincode` | `varchar(255)` | YES | None | [DB Confirmed] |
| `property_type` | `varchar(255)` | YES | None | e.g. `'PG'`, `'HOSTEL'`, `'COLIVING'` [DB Confirmed] |
| `total_floors` | `integer` | YES | None | Denormalized planned count [DB Confirmed] |
| `total_rooms` | `integer` | YES | None | Denormalized planned count [DB Confirmed] |
| `contact_number`| `varchar(255)` | YES | None | [DB Confirmed] |
| `contact_email` | `varchar(255)` | YES | None | [DB Confirmed] |
| `status` | `varchar(255)` | NO | None | Default `'ACTIVE'` in JPA [Source Confirmed] |
| `is_deleted` | `boolean` | NO | `false` | Soft-delete flag (added via startup DDL) [DB Confirmed] |
| `deleted_at` | `timestamp` | YES | None | Soft-delete timestamp [DB Confirmed] |
| `deleted_by` | `varchar(255)` | YES | None | Admin actor [DB Confirmed] |
| `deletion_reason`| `varchar(500)`| YES | None | Audit reason [DB Confirmed] |
| `ttl_expires_at`| `timestamp` | YES | None | 30-day TTL expiry timestamp [DB Confirmed] |
| `archive_snapshot_id`| `bigint` | YES | None | Logical reference to `property_archive_snapshots` [DB Confirmed] |
| `created_at` | `timestamp` | NO | None | [DB Confirmed] |
| `updated_at` | `timestamp` | NO | None | [DB Confirmed] |

---

### 2. `property_archive_snapshots`
*Stores immutable JSON representations of properties frozen upon soft-delete.*

| Column | Database Type | Nullable | Default | Constraints & Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | NO | Generated identity | **PK** (`property_archive_snapshots_pkey`) [DB Confirmed] |
| `property_id` | `bigint` | NO | None | Logical scalar ID - **NO Foreign Key in DB** [DB Confirmed] |
| `property_name` | `varchar(255)` | NO | None | [DB Confirmed] |
| `property_code` | `varchar(255)` | YES | None | [DB Confirmed] |
| `archived_by` | `varchar(255)` | YES | None | [DB Confirmed] |
| `deletion_reason`| `varchar(255)`| YES | None | [DB Confirmed] |
| `ttl_days` | `integer` | YES | None | [DB Confirmed] |
| `total_rooms` | `integer` | YES | None | [DB Confirmed] |
| `total_residents`| `integer`| YES | None | [DB Confirmed] |
| `total_revenue_potential`| `double precision` | YES | None | Mixed monetary precision [DB Confirmed] |
| `total_advance_held`| `double precision` | YES | None | Mixed monetary precision [DB Confirmed] |
| `snapshot_json`| `text` | NO | None | Full JSON serialization [DB Confirmed] |
| `archived_at` | `timestamp` | NO | None | [DB Confirmed] |

---

### 3. `rooms`
*Stores room inventory. Uses a natural string primary key and mutable counters.*

| Column | Database Type | Nullable | Default | Constraints & Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| `room_no` | `varchar(255)` | NO | None | **PK** (`rooms_pkey`) - Natural String Key [DB Confirmed] |
| `floor` | `varchar(255)` | YES | None | Free-text string (e.g. `'1'`, `'2'`) [DB Confirmed] |
| `room_type` | `varchar(255)` | YES | None | e.g. `'Dormitory'`, `'Four-Sharing'` [DB Confirmed] |
| `rent_per_month`| `integer` | YES | None | Default bed rent in INR [DB Confirmed] |
| `occupancy` | `integer` | YES | None | Planned capacity slots [DB Confirmed] |
| `current_occupancy`| `integer`| NO | `0` | Active resident counter [DB Confirmed] |
| `reserved_capacity`| `integer`| NO | `0` | Pending reservation counter [DB Confirmed] |
| `available` | `boolean` | YES | None | Computed availability flag [DB Confirmed] |
| `property_id` | `bigint` | YES | None | Unconstrained scalar - **NO Foreign Key in DB** [DB Confirmed] |
| `vacate_date` | `varchar(255)` | YES | None | Denormalized string date [DB Confirmed] |
| `vacate_status` | `varchar(255)`| YES | None | e.g. `'vacate_notice'` [DB Confirmed] |
| `vacating_resident`| `varchar(255)`| YES | None | Denormalized resident name [DB Confirmed] |

---

### 4. `tenants`
*Stores resident profiles coupled with transient accommodation and deposit state.*

| Column | Database Type | Nullable | Default | Constraints & Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| `uid` | `varchar(255)` | NO | None | **PK** (`tenants_pkey`) - UUID string [DB Confirmed] |
| `name` | `varchar(255)` | NO | None | [DB Confirmed] |
| `aadhaar_no` | `varchar(255)` | NO | None | UNIQUE (`uk21vvgh4sc87x5wvjrtgklqw6l`) [DB Confirmed] |
| `mobile_number` | `varchar(255)` | NO | None | [DB Confirmed] |
| `tenant_type` | `varchar(255)` | NO | None | `'WORKING'` / `'STUDENT'` [DB Confirmed] |
| `organization_name`| `varchar(255)`| NO | None | Employer or Educational Institution [DB Confirmed] |
| `parent_contact`| `varchar(255)` | YES | None | Emergency contact phone [DB Confirmed] |
| `room_no` | `varchar(255)` | NO | None | Loose string - **NO Foreign Key in DB** [DB Confirmed] |
| `advance_paid` | `integer` | NO | None | Stored deposit in whole INR [DB Confirmed] |
| `advance_paid_status`| `varchar(255)`| NO | `'PENDING'` | Enum: `PENDING`, `PAID` [DB Confirmed] |
| `standard_rent` | `integer` | NO | None | Stored monthly rent in whole INR [DB Confirmed] |
| `status` | `varchar(255)` | YES | `'ACTIVE'` | `'ACTIVE'` or `'INACTIVE'` [DB Confirmed] |
| `property_id` | `bigint` | YES | None | Unconstrained scalar - **NO Foreign Key in DB** [DB Confirmed] |

---

### 5. `admissions`
*Authoritative admission and room allocation table.*

| Column | Database Type | Nullable | Default | Constraints & Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | NO | Generated identity | **PK** (`admissions_pkey`) [DB Confirmed] |
| `admission_number`| `varchar(255)`| NO | None | UNIQUE (`uk9xrwakwuqie16aslmlotw198d`) [DB Confirmed] |
| `tenant_uid` | `varchar(255)` | NO | None | **FK** &rarr; `tenants(uid)` (`fkie3wy2hxh07dq0a28nb0u3g62`) [DB Confirmed] |
| `room_no` | `varchar(255)` | NO | None | **FK** &rarr; `rooms(room_no)` (`fk6j2g2tty4ukvdgsqwe2ymjmtq`) [DB Confirmed] |
| `status` | `varchar(255)` | NO | None | CHECK (`status IN ('PENDING', 'PAID', 'CANCELLED', 'VACATED')`) [DB Confirmed] |
| `enrollment_date`| `date` | NO | None | Stay commencement date [DB Confirmed] |
| `remarks` | `varchar(255)` | YES | None | [DB Confirmed] |
| `confirmed_on` | `timestamp` | YES | None | Confirmation timestamp [DB Confirmed] |
| `vacated_on` | `date` | YES | None | Departure date [DB Confirmed] |
| `property_id` | `bigint` | YES | None | Unconstrained scalar - **NO Foreign Key in DB** [DB Confirmed] |
| `created_at` | `timestamp` | NO | None | [DB Confirmed] |
| `updated_at` | `timestamp` | NO | None | [DB Confirmed] |

---

### 6. `vacate_requests`
*Stores resident departure notices and deposit repayment calculations.*

| Column | Database Type | Nullable | Default | Constraints & Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | NO | Generated identity | **PK** (`vacate_requests_pkey`) [DB Confirmed] |
| `request_id` | `varchar(255)` | NO | None | UNIQUE (`uk2i2c2s45pjpowt61vok8m573i`) [DB Confirmed] |
| `tenant_uid` | `varchar(255)` | YES | None | Loose string - **NO Foreign Key in DB** [DB Confirmed] |
| `tenant_name` | `varchar(255)` | NO | None | Denormalized name string [DB Confirmed] |
| `room_no` | `varchar(255)` | NO | None | Loose string - **NO Foreign Key in DB** [DB Confirmed] |
| `mobile_number` | `varchar(255)` | NO | None | Denormalized phone string [DB Confirmed] |
| `aadhaar_no` | `varchar(255)` | YES | None | Denormalized identity string [DB Confirmed] |
| `property_id` | `bigint` | YES | None | Unconstrained scalar - **NO Foreign Key in DB** [DB Confirmed] |
| `request_date` | `date` | NO | None | Notice submission date [DB Confirmed] |
| `expected_leaving_date`| `date` | NO | None | Projected departure date [DB Confirmed] |
| `notice_days` | `integer` | NO | None | Calculated notice duration [DB Confirmed] |
| `advance_paid` | `double precision`| NO | None | Deposit baseline (Float precision) [DB Confirmed] |
| `maintenance_charge`| `double precision`| YES| None | Deductions (Float precision) [DB Confirmed] |
| `breakage_charge`| `double precision`| YES | None | Deductions (Float precision) [DB Confirmed] |
| `advance_repayable`| `double precision`| NO | None | Calculated net refund (Float precision) [DB Confirmed] |
| `status` | `varchar(255)` | NO | None | **Enum in Java:** `PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED` [Source Confirmed] |
| `reason` | `text` | YES | None | Resident reason [DB Confirmed] |
| `notes` | `text` | YES | None | Staff audit notes [DB Confirmed] |
| `created_at` | `timestamp` | NO | None | [DB Confirmed] |
| `updated_at` | `timestamp` | YES | None | [DB Confirmed] |

> [!NOTE]
> **Source Discrepancy Corrected:** Previous documentation erroneously stated vacate statuses as `SUBMITTED, APPROVED, REJECTED, COMPLETED`. Source inspection of `VacateStatus.java` confirms the authoritative enum values are `PENDING`, `APPROVED`, `REJECTED`, `COMPLETED`, `CANCELLED`. Furthermore, `vacate_requests` completely lacks an `admission_id` column.

---

### 7. `invoices`
*Stores monthly rent and utility billing records.*

| Column | Database Type | Nullable | Default | Constraints & Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | NO | Generated identity | **PK** (`invoices_pkey`) [DB Confirmed] |
| `invoice_number`| `varchar(255)`| NO | None | UNIQUE (`ukl1x55mfsay7co0r3m9ynvipd5`) [DB Confirmed] |
| `tenant_uid` | `varchar(255)` | NO | None | Loose string - **NO Foreign Key in DB** [DB Confirmed] |
| `tenant_name` | `varchar(255)` | NO | None | Denormalized resident name [DB Confirmed] |
| `room_no` | `varchar(255)` | NO | None | Denormalized room string [DB Confirmed] |
| `month_year` | `varchar(255)` | NO | None | e.g. `'October 2026'` [DB Confirmed] |
| `amount` | `integer` | NO | None | Total billed amount in INR [DB Confirmed] |
| `paid_amount` | `integer` | NO | `0` | Total collected amount in INR [DB Confirmed] |
| `due_date` | `varchar(255)` | NO | None | String date representation (`YYYY-MM-DD`) [DB Confirmed] |
| `status` | `varchar(255)` | NO | None | Enum: `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE` [Source Confirmed] |
| `paid_on` | `varchar(255)` | YES | None | String date representation (`YYYY-MM-DD`) [DB Confirmed] |
| `payment_mode` | `varchar(255)` | YES | None | e.g. `'Cash'`, `'UPI'` [DB Confirmed] |
| `transaction_ref`| `varchar(255)`| YES | None | Matches `ledger_transactions.reference_number` [DB Confirmed] |
| `property_id` | `bigint` | YES | None | Unconstrained scalar - **NO Foreign Key in DB** [DB Confirmed] |
| `created_at` | `timestamp` | NO | None | [DB Confirmed] |
- **Composite Unique Constraint:** `uk_invoices_tenant_month` on `(tenant_uid, month_year)` [DB Confirmed]

---

### 8. `payments`
*Stores authoritative transaction receipts.*

| Column | Database Type | Nullable | Default | Constraints & Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | NO | Generated identity | **PK** (`payments_pkey`) [DB Confirmed] |
| `payment_reference`| `varchar(255)`| NO | None | UNIQUE (`uk_payments_payment_ref`) [DB Confirmed] |
| `invoice_id` | `bigint` | NO | None | Unconstrained scalar - **NO Foreign Key in DB** [DB Confirmed] |
| `tenant_uid` | `varchar(255)` | NO | None | Loose string - **NO Foreign Key in DB** [DB Confirmed] |
| `amount` | `integer` | NO | None | Payment amount in INR [DB Confirmed] |
| `payment_mode` | `varchar(255)` | NO | None | `CASH`, `UPI`, `CARD`, `BANK_TRANSFER` [DB Confirmed] |
| `transaction_reference`| `varchar(255)`| YES | None | External UTR / bank reference [DB Confirmed] |
| `idempotency_key`| `varchar(255)`| NO | None | UNIQUE (`uk_payments_idempotency_key`) [DB Confirmed] |
| `status` | `varchar(255)` | NO | None | `'SUCCESS'`, `'FAILED'` [DB Confirmed] |
| `property_id` | `bigint` | YES | None | Unconstrained scalar - **NO Foreign Key in DB** [DB Confirmed] |
| `created_at` | `timestamp` | NO | None | [DB Confirmed] |

> [!NOTE]
> In the active database, `payments` has 0 records. The existing 4 invoices were settled via direct mutation of `invoices.paid_amount` and appending to `ledger_transactions`.

---

### 9. `ledger_transactions`
*Operational double-entry cash and bank ledger.*

| Column | Database Type | Nullable | Default | Constraints & Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | NO | Generated identity | **PK** (`ledger_transactions_pkey`) [DB Confirmed] |
| `reference_number`| `varchar(255)`| NO | None | UNIQUE (`uktlg9em4tcqoxxapcsc3a4tbdo`) [DB Confirmed] |
| `date` | `varchar(255)` | NO | None | String date (`YYYY-MM-DD`) [DB Confirmed] |
| `type` | `varchar(255)` | NO | None | Enum: `CREDIT`, `DEBIT` [DB Confirmed] |
| `account_head` | `varchar(255)` | NO | None | e.g. `'Rent Payment'` [DB Confirmed] |
| `description` | `varchar(255)` | NO | None | Audit narrative [DB Confirmed] |
| `tenant_or_vendor`| `varchar(255)`| NO | None | Counterparty name [DB Confirmed] |
| `amount` | `integer` | NO | None | Transaction value in INR [DB Confirmed] |
| `payment_mode` | `varchar(255)` | NO | None | e.g. `'Cash'`, `'UPI'` [DB Confirmed] |
| `running_balance`| `bigint` | NO | None | Property cash snapshot [DB Confirmed] |
| `property_id` | `bigint` | YES | None | Unconstrained scalar - **NO Foreign Key in DB** [DB Confirmed] |
| `tenant_uid` | `varchar(255)` | YES | None | Loose string (empty string in legacy rows) [DB Confirmed] |
| `invoice_id` | `bigint` | YES | None | Unconstrained scalar (NULL in legacy rows) [DB Confirmed] |
| `payment_id` | `bigint` | YES | None | Unconstrained scalar (NULL in legacy rows) [DB Confirmed] |
| `created_at` | `timestamp` | NO | None | [DB Confirmed] |

---

### 10. `users`
*System staff and administrator accounts.*

| Column | Database Type | Nullable | Default | Constraints & Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | NO | Generated identity | **PK** (`users_pkey`) [DB Confirmed] |
| `username` | `varchar(255)` | NO | None | UNIQUE (`ukr43af9ap4edm43mmtq01oddj6`) [DB Confirmed] |
| `email` | `varchar(255)` | NO | None | UNIQUE (`uk6dotkott2kjsp8vw4d0m25fb7`) [DB Confirmed] |
| `full_name` | `varchar(255)` | NO | None | [DB Confirmed] |
| `phone` | `varchar(255)` | YES | None | [DB Confirmed] |
| `role` | `varchar(255)` | NO | None | e.g. `'PROPERTY_MANAGER'`, `'ADMIN'` [DB Confirmed] |
| `status` | `varchar(255)` | NO | None | `'ACTIVE'`, `'INACTIVE'` [DB Confirmed] |
| `created_at` | `timestamp` | NO | None | [DB Confirmed] |
| `updated_at` | `timestamp` | NO | None | [DB Confirmed] |

---

## 3. Verified Physical Foreign Keys vs Application-Enforced Conventions

| Origin Column | Target Column | Physical DB Constraint Exists? | Constraint Name | Delete Rule | Update Rule |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `admissions.room_no` | `rooms.room_no` | **YES** | `fk6j2g2tty4ukvdgsqwe2ymjmtq` | `NO ACTION` | `NO ACTION` |
| `admissions.tenant_uid` | `tenants.uid` | **YES** | `fkie3wy2hxh07dq0a28nb0u3g62` | `NO ACTION` | `NO ACTION` |
| `rooms.property_id` | `properties.id` | **NO** (Application logic only) | — | — | — |
| `tenants.property_id` | `properties.id` | **NO** (Application logic only) | — | — | — |
| `tenants.room_no` | `rooms.room_no` | **NO** (Application logic only) | — | — | — |
| `admissions.property_id` | `properties.id` | **NO** (Application logic only) | — | — | — |
| `vacate_requests.tenant_uid` | `tenants.uid` | **NO** (Application logic only) | — | — | — |
| `vacate_requests.room_no` | `rooms.room_no` | **NO** (Application logic only) | — | — | — |
| `vacate_requests.property_id` | `properties.id` | **NO** (Application logic only) | — | — | — |
| `invoices.tenant_uid` | `tenants.uid` | **NO** (Application logic only) | — | — | — |
| `invoices.property_id` | `properties.id` | **NO** (Application logic only) | — | — | — |
| `payments.invoice_id` | `invoices.id` | **NO** (Application logic only) | — | — | — |
| `payments.tenant_uid` | `tenants.uid` | **NO** (Application logic only) | — | — | — |
| `payments.property_id` | `properties.id` | **NO** (Application logic only) | — | — | — |
| `ledger_transactions.property_id` | `properties.id` | **NO** (Application logic only) | — | — | — |
| `ledger_transactions.tenant_uid` | `tenants.uid` | **NO** (Application logic only) | — | — | — |
| `ledger_transactions.invoice_id` | `invoices.id` | **NO** (Application logic only) | — | — | — |
| `ledger_transactions.payment_id` | `payments.id` | **NO** (Application logic only) | — | — | — |

---

## 4. Summary of Critical Baseline Findings

1. **Only 2 physical foreign keys exist** in the entire live database.
2. **Missing Hierarchy Elements:** No `blocks`, `floors`, or `beds` tables exist.
3. **Natural Keys:** Natural string keys are primary keys on `rooms` (`room_no`) and `tenants` (`uid`).
4. **Denormalization:** `rooms` holds transient counters; `tenants` holds accommodation and rent terms; `invoices` and `vacate_requests` duplicate tenant names and room numbers.
5. **Decoupled Vacate Process:** `vacate_requests` has no link to `admissions`, leaving admissions open when vacating.
6. **Mixed Monetary Precision:** Financial fields alternate between `integer` and `double precision`.
7. **Legacy Ledger Gaps:** Existing ledger rows have NULL invoice/payment references and empty tenant UIDs.
8. **Deletion Vulnerability:** Existing `PropertyTtlScheduler` attempts physical property deletion upon TTL expiry (`propertyRepository.delete()`), which will fail under `ON DELETE RESTRICT` or risk catastrophic history loss if cascading was enabled. Physical deletion of records with financial or occupancy history must be strictly prohibited.
