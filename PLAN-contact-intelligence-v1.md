# Contact Intelligence v1 — Implementation Plan

## Overview

Transform the email agent from using hardcoded seed contacts into a system that **scans the user's entire Gmail history**, **maps relationship strength**, **persists contacts to both LocalStorage and Notion**, and **surfaces intelligence in the chat UI** for smarter outreach.

**Scope decisions for v1:**
- Full all-time Gmail scan (paginated, handles thousands of emails)
- Relationship mapping with composite scoring
- Dual persistence: LocalStorage (instant) + Notion CRM (durable)
- Clay enrichment deferred to v2

---

## Architecture

```
User clicks "Scan Contacts" (or types "scan my inbox")
       │
       ▼
┌─────────────────────────────────────┐
│  Phase 1: Gmail Scan (paginated)    │
│  POST /api/contact-intel/scan       │
│  Uses googleapis (same as send.js)  │
│  Returns { contacts, nextPageToken } │
│  Frontend loops until done           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Phase 2: Relationship Scoring      │
│  Client-side (contactIntel.js)      │
│  Frequency, recency, initiation     │
│  Assigns tier: strong→dormant       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Phase 3: Persist                   │
│  LocalStorage: email-agent-contacts │
│  Notion: POST /api/contact-intel/sync│
│  Creates CRM database, upserts pages │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Phase 4: Surface in Chat           │
│  Merge into in-memory contact store │
│  Enhanced search_contacts tool      │
│  Summary dashboard card in chat     │
└─────────────────────────────────────┘
```

---

## Enriched Contact Schema

```javascript
{
  // === Core identity ===
  id: "uuid",
  name: "Sarah Chen",
  email: "sarah.chen@techforward.io",
  role: "",                           // empty until enrichment (v2)
  company: "",                        // extracted from email domain
  location: "",
  tags: [],
  bio: "",

  // === Gmail interaction data (from scan) ===
  interaction: {
    totalEmails: 47,                  // total messages exchanged
    sentByUser: 22,                   // user → contact
    receivedByUser: 25,               // contact → user
    firstInteraction: "2024-09-15",   // ISO date string
    lastInteraction: "2026-03-07",
    threadCount: 12,                  // unique threads
    initiationRatio: 0.58,            // % of threads user started
  },

  // === Computed relationship scores ===
  relationship: {
    strength: 8.5,                    // 0-10 composite score
    tier: "strong",                   // strong (>7) | active (5-7) | warm (3-5) | cold (1-3) | dormant (<1)
  },

  // === Sync metadata ===
  notionPageId: null,                 // set after Notion sync
  lastSyncedAt: null,
  source: "gmail-scan",              // "gmail-scan" | "csv-upload" | "seed" | "manual"
}
```

---

## New Files

### API Endpoints

#### `api/contact-intel/scan.js`
Gmail inbox scanner using `googleapis` (mirrors pattern in `api/send.js`).

```
POST /api/contact-intel/scan
Headers: Authorization: Bearer <providerToken>
Body:    { pageToken?: string, batchSize?: number (default 100) }
Returns: {
  contacts: { [email]: { name, email, domain, sent, received, threads: Set, firstDate, lastDate, initiated } },
  nextPageToken: string | null,
  totalProcessed: number
}
```

**Implementation notes:**
- Uses `gmail.users.messages.list()` with `maxResults: batchSize` for pagination
- For each message, calls `gmail.users.messages.get()` with `format: 'metadata'` and `metadataHeaders: ['From', 'To', 'Cc', 'Date']` (lightweight, no body)
- Determines user's email via `gmail.users.getProfile()` to classify sent vs received
- Builds contact map keyed by normalized email address
- Returns partial results + `nextPageToken` to handle Vercel function timeouts (60s max)
- Frontend loops calling this endpoint until `nextPageToken` is null

#### `api/contact-intel/sync.js`
Notion CRM sync using Notion REST API.

```
POST /api/contact-intel/sync
Body:    { contacts: EnrichedContact[], notionParentPageId?: string }
Returns: { synced: number, created: number, updated: number, databaseId: string }
```

**Implementation notes:**
- First call: creates a "Contact Intelligence" database under configured parent page
- Subsequent calls: searches for existing pages by email, updates or creates
- Stores `databaseId` in response so frontend can cache it
- Properties map to schema above (Name, Email, Company, Total Emails, Last Interaction, Relationship Tier, Relationship Score, Source)

### Frontend Modules

#### `src/lib/contactIntel.js`
Pure functions for contact data processing. No side effects, fully testable.

```javascript
// Deduplicate raw scan results by email (merge counts across pages)
export function deduplicateContacts(existingMap, newContacts) → mergedMap

// Compute relationship scores from interaction data
export function computeRelationshipScores(contacts, { now }) → scoredContacts
  // strength = 0.4 * frequencyNorm + 0.3 * recencyNorm + 0.3 * initiationNorm
  // tier assignment: strong (>7), active (5-7), warm (3-5), cold (1-3), dormant (<1)

// Convert raw scan map to array of contact objects
export function rawMapToContacts(rawMap, userEmail) → Contact[]

// Merge scanned contacts with existing store (by email dedup)
export function mergeWithExisting(scannedContacts, existingContacts) → Contact[]
```

#### `src/lib/contactIntelApi.js`
Thin API client wrappers (follows pattern in `src/lib/claude.js` and `src/lib/gmail.js`).

```javascript
// Paginated Gmail scan — caller loops until nextPageToken is null
export async function scanInboxPage(providerToken, { pageToken, batchSize }) → { contacts, nextPageToken, totalProcessed }

// Full scan orchestrator — handles pagination loop internally
export async function scanFullInbox(providerToken, { batchSize, onProgress }) → Contact[]

// Sync to Notion
export async function syncToNotion(contacts) → { synced, created, updated, databaseId }
```

#### `src/components/ContactIntelButton.jsx`
Scan trigger button placed in chat header.

- Disabled when `gmailConnected` is false
- States: idle → scanning (with progress %) → scoring → syncing → done
- Clicking triggers `onScan()` callback in Chat.jsx

#### `src/components/ContactIntelSummary.jsx`
Dashboard card rendered as a special message type in chat.

- Total contacts found
- Tier breakdown (strong: X, active: X, warm: X, cold: X, dormant: X)
- Top 5 contacts by relationship strength
- "View in Notion" link (if synced)
- "Re-scan" button

---

## Modified Files

### `src/lib/contacts.js`
- Add `mergeEnrichedContacts(enrichedContacts)` — merges by email, preserves enrichment fields
- Add `getContactByEmail(email)` — lookup helper
- Modify `searchContacts()` — include interaction/relationship fields in searchable text (tier, domain, interaction count)

### `api/chat.js`
- Expand `SYSTEM_PROMPT` — mention relationship data, interaction history, tier system
- Add `get_contact_intelligence` tool — returns full interaction + relationship data for a contact by email or name
- Update `search_contacts` description — note it includes relationship scores and interaction data

### `src/pages/Chat.jsx`
- Import + render `ContactIntelButton` in header (alongside CSVUpload, GmailStatus)
- Add `handleContactIntelScan()` orchestrator:
  1. Call `scanFullInbox()` with progress callback → post scanning progress messages
  2. Call `computeRelationshipScores()` on results
  3. Call `mergeEnrichedContacts()` to update in-memory store
  4. Save to LocalStorage (`email-agent-contacts`)
  5. Call `syncToNotion()` → post sync progress messages
  6. Post `contact-intel-summary` message with results
- Handle rendering `contact-intel-summary` message type

### `src/components/ContactCard.jsx`
- Show relationship tier badge (color-coded pill: green/blue/yellow/gray/red)
- Show "last emailed X days ago" when `interaction.lastInteraction` exists
- Show email count badge (e.g., "47 emails")

### `src/components/MessageList.jsx`
- Render `ContactIntelSummary` component for `contact-intel-summary` message type

### `.env.example`
Add:
```
NOTION_API_KEY=...            # Notion integration token for CRM sync
NOTION_PARENT_PAGE_ID=...    # Notion page ID where CRM database is created
```

### `vercel.json`
- Add rewrite rules for `/api/contact-intel/*` endpoints

---

## Implementation Order

### Step 1: Gmail Scan Endpoint + Client Logic
**Create:** `api/contact-intel/scan.js`, `src/lib/contactIntel.js`, `src/lib/contactIntelApi.js`

The foundation — scan Gmail, extract contacts, compute scores. Test with curl before wiring UI.

### Step 2: Frontend Trigger + Chat Integration
**Create:** `src/components/ContactIntelButton.jsx`
**Modify:** `src/pages/Chat.jsx`, `src/lib/contacts.js`

Wire the scan into the UI. User clicks button → sees progress → contacts appear in store. Save to LocalStorage.

### Step 3: Contact Card Enhancements
**Modify:** `src/components/ContactCard.jsx`

Show interaction data and relationship tier on contact cards.

### Step 4: Notion CRM Sync
**Create:** `api/contact-intel/sync.js`
**Modify:** `src/lib/contactIntelApi.js`, `src/pages/Chat.jsx`

Persist scanned contacts to Notion database. Add sync step to orchestration.

### Step 5: Summary Dashboard + Chat Intelligence
**Create:** `src/components/ContactIntelSummary.jsx`
**Modify:** `api/chat.js`, `src/components/MessageList.jsx`

Post a summary card after scan. Update agent tools and prompt for enriched context.

### Step 6: Tests
**Create:** `src/lib/__tests__/contactIntel.test.js`

Unit tests for deduplication, scoring, merge logic.

---

## Notion Database Schema

| Property | Type | Source |
|----------|------|--------|
| Name | Title | `name` |
| Email | Email | `email` |
| Company | Rich Text | `company` (domain-derived) |
| Total Emails | Number | `interaction.totalEmails` |
| Sent | Number | `interaction.sentByUser` |
| Received | Number | `interaction.receivedByUser` |
| First Interaction | Date | `interaction.firstInteraction` |
| Last Interaction | Date | `interaction.lastInteraction` |
| Thread Count | Number | `interaction.threadCount` |
| Initiation Ratio | Number | `interaction.initiationRatio` |
| Relationship Score | Number | `relationship.strength` |
| Relationship Tier | Select | `relationship.tier` (strong/active/warm/cold/dormant) |
| Source | Select | `source` |

---

## Edge Cases & Considerations

1. **Vercel timeouts**: Scan endpoint returns partial results. Frontend loops. If a single page takes too long, reduce `batchSize`.
2. **Token expiry**: Gmail OAuth token may expire mid-scan. Frontend should catch 401 and prompt re-auth.
3. **Deduplication**: Contacts may appear in To, Cc, and From across messages. Deduplicate by normalized lowercase email. Merge interaction counts.
4. **Self-exclusion**: Filter out the user's own email from contact list.
5. **Bots/noreply**: Filter out common automated addresses (`noreply@`, `no-reply@`, `mailer-daemon@`, etc.).
6. **Name extraction**: Display name from email headers may vary. Use the most recent non-empty name.
7. **Large inboxes**: For users with 50k+ emails, full scan may take minutes. Progress reporting is essential. Consider capping at 5000 messages for v1 with an option to continue.
8. **Re-scan**: Incremental re-scan should merge new data with existing contacts, not replace. Use `lastInteraction` to only fetch newer messages.
9. **Notion rate limits**: Notion API has a rate limit of 3 requests/second. Batch page creation and add delays.
