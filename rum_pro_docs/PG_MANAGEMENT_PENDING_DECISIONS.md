# PG Management System — Pending Decisions and Technical Gaps

Companion to [PG_MANAGEMENT_ARCHITECTURE.md](PG_MANAGEMENT_ARCHITECTURE.md).

The architecture establishes the foundation, but some business rules are assumed rather than confirmed, and several technical details need tightening before implementation. This document records those outstanding points; it does not authorize implementation or change the architecture decisions.

## 1. Already confirmed

These do not need another decision:

- India-based operations using INR.
- Staff-only first release.
- Operational double-entry ledger, with external statutory accounting.
- Planning only; no feature development yet.

The architecture recommends PostgreSQL, a modular monolith, explicit beds, historical allocations, versioned agreements, and separate invoices/payments. These are architectural recommendations, not unresolved business questions.

## 2. Business decisions requiring confirmation

All entries below are pending unless subsequently recorded in the decision log. A current proposal is not an approved business policy.

### Organization and access

| ID | Decision needed | Current proposal |
|---|---|---|
| B01 | Can one organization contain multiple legal businesses or tax registrations? | One legal operating business per organization; registration details may vary by property. The actual registration structure needs confirmation. |
| B02 | Can the same user manage multiple organizations? | Yes, through separate memberships. |
| B03 | Do property administrators manage staff, or only the owner? | Owner manages users and roles initially. |
| B04 | Are preset roles sufficient, or can owners create custom roles? | Custom roles supported, with protected owner permissions. |
| B05 | Which staff can view identity documents and full personal information? | Explicit permission, separate from ordinary tenant viewing. |
| B06 | Is a second person available to approve refunds? | Refund requester and approver must differ. This would block a business operated by a single authorized person. |
| B07 | Is MFA acceptable for owners and refund approvers? | Mandatory for those roles. |
| B08 | Can platform support access business records during troubleshooting? | Explicit, time-limited, audited access only. |

### Accommodation and admission

| ID | Decision needed | Current proposal |
|---|---|---|
| B09 | Do you rent individual beds only, or entire rooms as well? | Beds only in v1. Exclusive-room bookings are deferred. |
| B10 | Must applications reserve a bed before joining? | No reservation or temporary hold in v1. |
| B11 | Can one resident occupy or pay for multiple beds simultaneously? | One overlapping stay and one occupied bed per resident within an organization. |
| B12 | Which documents and personal fields are mandatory for admission? | Not finalized; needs a required-field/document checklist. |
| B13 | Must the full deposit be received before admission? | Requirement or approved waiver is contemplated, but the actual rule is unset. |
| B14 | Are minors allowed, and when are guardian details mandatory? | No age/guardian policy is defined yet. |
| B15 | How is an agreement accepted—uploaded signature, staff confirmation, or electronic signing? | A signed agreement is required, but signing evidence is not specified. |
| B16 | Can transfers be scheduled for the future? | Immediate transfers only in v1. |
| B17 | What happens to money during a cross-property transfer? | New stay at the destination; old-property balances remain separate. No automatic credit transfer. |
| B18 | How should gender restrictions and exceptions work? | Restricted/unrestricted rooms are proposed; eligibility and override rules remain undefined. |
| B19 | What permits readmission of a previously restricted resident? | Explicit review and authorized restriction removal; approval rules are unset. |

### Rent and billing

| ID | Decision needed | Current proposal |
|---|---|---|
| B20 | Is rent billed in advance or arrears? | Examples support advance billing, but the actual operational default is not explicitly fixed. |
| B21 | When is the monthly bill issued, and when is it due? | Calendar-month billing; a due-offset field exists, but its reference date needs definition. |
| B22 | Do you need anniversary billing in the first release? | Supported in the proposed model; calendar month is the default. |
| B23 | Is actual-days proration acceptable? | Actual days in the billing cycle; other policies available. |
| B24 | Is the departure day chargeable? What about same-day arrival/departure? | Departure date excluded; same-day minimum charge is not specified. |
| B25 | Which charges prorate independently—food, parking, internet, maintenance? | Per-charge policies supported; actual defaults are unset. |
| B26 | How are electricity and water calculated? | Charges can be entered, but meter readings, tariffs, sharing, and allocation rules are not designed. |
| B27 | Do temporary absences reduce rent or food charges? | No absence/rebate policy is defined. |
| B28 | What discounts can staff approve, and for how long? | Explicit discounts; approval limits and recurring-versus-one-time rules are unset. |
| B29 | What notice is required for rent increases? Can increases be backdated? | Effective-dated revisions; issued bills are corrected through adjustment documents. |
| B30 | Are late fees required? | Disabled initially; grace period, calculation, frequency, and cap need definition if enabled. |
| B31 | What tax treatment applies to each charge? | No assumed exemption. Registration, rates, inclusive/exclusive pricing, and document requirements need the business accountant’s confirmation. |

### Payments, deposits, and expenses

| ID | Decision needed | Current proposal |
|---|---|---|
| B32 | Who confirms that a bank/UPI/card payment actually arrived? | Staff record external receipts; evidence and verification responsibilities are unset. |
| B33 | Should available advance automatically settle invoices? | Off by default; agreement-specific authorization can enable it. |
| B34 | When paying several invoices, what is the allocation order? | Explicit selection is supported; automatic oldest-due-first ordering is not yet fixed. |
| B35 | When may a security deposit be used? | Explicit authorization; no automatic monthly rent deduction. |
| B36 | Can advance be reclassified as deposit, or vice versa? | Not currently supported by an explicit workflow. |
| B37 | How are bounced cheques, disputed receipts, payment fees, and short settlements handled? | Basic pending/confirmed/reversed states exist; detailed rules are missing. |
| B38 | Are refunds partial, deadline-bound, or restricted to the original payer/payment method? | Partial funding is possible; destination verification and timing policy are unset. |
| B39 | Who may waive debt or approve a write-off? | Controlled write-offs are mentioned, but authority and thresholds are unset. |
| B40 | Are expense approvals and supporting receipts mandatory? | Expenses are included; approval thresholds and evidence requirements are unset. |
| B41 | Should shared organization expenses be distributed across properties? | Only property-level expenses are currently modeled. |

### Notice, checkout, and settlement

| ID | Decision needed | Current proposal |
|---|---|---|
| B42 | What is the notice period and how is short notice charged? | Thirty days appears as a default; fee calculation is not defined. |
| B43 | Can a resident withdraw notice or extend the departure date? | Withdrawal is supported; extension approval and recalculation rules need definition. |
| B44 | Can a resident depart while owing money? | Yes; physical departure and financial closure are separate. |
| B45 | How are disputed damage charges handled? | Assessment and approval exist; dispute handling is not specified. |
| B46 | How long after departure can additional charges be raised? | Post-departure corrections are contemplated; cutoff and approval rules are unset. |
| B47 | Can a settlement close with refundable money still held, or with a small residual balance? | No unresolved balance by default; tolerance and unclaimed-money handling are unset. |
| B48 | Who can reopen a completed settlement? | No explicit reopening workflow is defined. |

## 3. Release and operational decisions

These can wait until the relevant stage, but must be settled before production.

| ID | Decision needed | Current proposal |
|---|---|---|
| O01 | Hosting provider, region, and monthly infrastructure budget | Managed cloud services; provider and budget unselected. |
| O02 | Availability requirement | One or two backend instances depending on acceptable downtime. |
| O03 | Recovery targets | Proposed RPO of 15 minutes and RTO of four hours. |
| O04 | Retention periods by record category | Proposed defaults only; financial and identity-document retention remain unapproved. |
| O05 | Initial notification channels | In-app/email/SMS/WhatsApp architecture exists; actual launch channels and providers are unselected. |
| O06 | Notification consent, recipients, language, and reminder frequency | Not specified. |
| O07 | Accounting export destination | External accounting is confirmed; product and export format are not. |
| O08 | Required invoice/receipt/agreement templates | Branding, numbering format, language, and required fields are unsettled. |
| O09 | Who handles alerts, backups, failed jobs, and reconciliation incidents? | Operational responsibilities are not assigned. |
| O10 | Existing-data migration scope | Awaiting DDL, data volumes, known inconsistencies, acceptable downtime, and opening-balance approval. |
| O11 | First-release delivery boundary | The roadmap includes all modules; which stages must launch together is not confirmed. |

## 4. Technical gaps to resolve

These are engineering design responsibilities, not questions the business owner needs to answer. The architecture should not yet be treated as a fully executable schema specification. Tighten these details after the relevant business choices above.

| ID | Gap | What needs clarification or correction |
|---|---|---|
| T01 | Invoice voiding | The outstanding formula currently subtracts allocations only. Voided invoices need explicit exclusion/reversal semantics so they do not retain a false receivable. |
| T02 | Cancelled billing drafts | Recurring uniqueness plus cancellation needs a precise retry/replacement rule. A cancelled draft must not permanently block a legitimate bill. |
| T03 | Agreement version immutability | Closing an open effective interval technically changes a row. Define the permitted audited boundary update versus an immutable correction version. |
| T04 | Calendar calculations | Define anniversary dates on the 29th–31st, due-date anchoring, same-day stays, and the financial effective date of a same-day transfer. |
| T05 | Utility billing | If meter-based/shared utility charging is required, add meter, reading, tariff, and allocation-history design. Current incidental charges alone do not cover it. |
| T06 | Deposit/advance consumption | Specify exact refund-reservation states, release behavior, and whether pending approvals reserve money indefinitely. |
| T07 | Uncertain refund outcome | A timeout or unknown bank outcome must not be treated as a definite failure and retried as another payment. Add reconciliation/manual-review semantics. |
| T08 | Reversal completeness | Define document-to-reversal links and dependency handling for refunds, credit notes, expenses, and already-recognized revenue. |
| T09 | Write-off implementation | Write-offs are promised, but lack a dedicated business document/workflow and complete reconciliation treatment. |
| T10 | Opening balances | Credit lots currently require a payment or credit-note origin. Migration may need an explicit opening-balance origin rather than fabricated receipts. |
| T11 | Revenue recognition | Fix recognition cadence, rounding, catch-up behavior, and corrections spanning locked accounting periods. |
| T12 | Settlement scope | Define exactly which property/stay balances a settlement includes, plus stale-preview detection, supersession, and reopening. |
| T13 | Authorization edge cases | Define visibility of shared person records when a resident has history in properties the current staff member cannot access. |
| T14 | Support access | Time-limited support access is promised, but its grant/revocation records are not modeled. |
| T15 | Audit coverage | Organization-scoped audit records need a companion treatment for platform actions and pre-organization operations. |
| T16 | Historical corrections | Define how erroneous occupancy records are corrected without erasing the original evidence or defeating temporal constraints. |
| T17 | Durable asynchronous work | Large exports and document scanning need explicit job/result/retry ownership; the current design describes them more generally than billing jobs. |
| T18 | Detailed security parameters | Specify refresh/session lifetimes, signing-key rotation, MFA recovery, CORS origins, and throttling thresholds. |
| T19 | Final schema precision | Expand shorthand into exact FK targets, unique-index predicates, state transitions, trigger rules, and deletion behavior before writing migrations. |

## 5. What should be confirmed first

The highest-impact decisions are:

1. **Beds versus exclusive rooms, and whether reservations are needed.**
2. **Admission requirements, deposit prerequisites, and agreement signing.**
3. **Advance/arrears billing, due dates, proration, and utility calculation.**
4. **Deposit usage, refund approval, and debt write-off rules.**
5. **Notice charges, departure-day billing, and final-settlement closure.**
6. **Tax treatment and retention policies with the appropriate business advisers.**
7. **Existing-data migration and the actual first-release boundary.**

The remaining operational choices can be finalized alongside their implementation stages. Technical gaps should be resolved in the architecture document before dependent code or migrations are written.

## 6. Decision log

Record confirmed decisions here using the IDs above. Until a decision is recorded, its proposal remains an assumption. Update the architecture document when a confirmed decision changes its design.

| ID | Confirmed decision | Confirmed by | Date | Architecture impact |
|---|---|---|---|---|
| — | No additional decisions recorded yet | — | — | — |
