# Walkthrough: Advance Payment Status Migration & Verification

We executed and verified the database migration for `advance_paid_status` against the live PostgreSQL database (`rms_db`), ensuring all existing tenant records remain intact and defaulted to `PENDING`.

---

## 1. Executed Migration Strategy (`migration_advance_paid_status.sql`)

The migration followed these exact steps:

```sql
-- Step 1: Add advance_paid_status column safely if not exists
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS advance_paid_status VARCHAR(20);

-- Step 2 & 4: Backfill any existing rows where advance_paid_status is NULL to 'PENDING'
-- (Never infer PAID merely because advance_paid > 0)
UPDATE tenants 
SET advance_paid_status = 'PENDING' 
WHERE advance_paid_status IS NULL;

-- Step 5: Enforce DEFAULT 'PENDING' and NOT NULL constraint for future records
ALTER TABLE tenants ALTER COLUMN advance_paid_status SET DEFAULT 'PENDING';
ALTER TABLE tenants ALTER COLUMN advance_paid_status SET NOT NULL;
```

---

## 2. Live PostgreSQL Schema Verification

Direct query on `information_schema.columns` for table `tenants`:

| Column Name | Data Type | Is Nullable | Column Default |
| :--- | :--- | :--- | :--- |
| `uid` | `character varying` | `NO` | |
| `name` | `character varying` | `NO` | |
| `aadhaar_no` | `character varying` | `NO` | |
| `mobile_number` | `character varying` | `NO` | |
| `tenant_type` | `character varying` | `NO` | |
| `organization_name` | `character varying` | `NO` | |
| `parent_contact` | `character varying` | `YES` | |
| `room_no` | `character varying` | `NO` | |
| `advance_paid` | `integer` | `NO` | |
| **`advance_paid_status`** | **`character varying`** | **`NO`** | **`'PENDING'::character varying`** |
| `standard_rent` | `integer` | `NO` | |

---

## 3. Existing Data Verification

Query: `SELECT uid, name, room_no, advance_paid, advance_paid_status, standard_rent FROM tenants;`

```
  uid  |        name         | room_no | advance_paid | advance_paid_status | standard_rent 
-------+---------------------+---------+--------------+---------------------+---------------
 T-101 | Rahul Kumar Updated | 102     |        12000 | PENDING             |          8000
(1 row)
```

**Key Verification Highlights**:
1. **Existing Record Preserved**: Tenant `T-101` with `advance_paid = 12000` was retained intact without dropping or recreating the table.
2. **Payment History Rule Enforced**: Despite having an advance amount recorded (`12000`), the status was strictly set to `PENDING` (never inferred as `PAID`).
3. **Database Constraints Active**: The column is `NOT NULL` with a default of `'PENDING'`, guaranteeing schema consistency for all future records.
4. **Automated Test Validation**: Ran `./mvnw.cmd test` — all **16/16 tests passed** (including live PostgreSQL bootstrap via `RmsBackendApplicationTests`).
