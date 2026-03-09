# Contact Intelligence v1 — Implementation Plan

## Overview

Transform the email agent from hardcoded seed contacts into a system that **scans the user's entire Gmail history**, **reads full conversation transcripts**, **classifies each contact via fast LLM inference (Groq)**, and **builds a knowledge graph** of relationship types — groups, subgroups, and people who live near but outside those groups.

**Key design principle:** Don't just count emails. Read them. Use a fast, cheap model to *understand* who each person is to the user based on the actual content of their conversations.

**Scope decisions for v1:**
- Full all-time Gmail scan (paginated)
- Full transcript extraction per contact (message bodies, not just headers)
- Groq (Llama 4 Scout) for fast classification — ~$0.11/M input tokens, sub-second latency
- Knowledge graph with groups, subgroups, and peripheral associations
- Dual persistence: LocalStorage (instant) + Notion CRM (durable)
- Clay enrichment deferred to v2

---

## Architecture

```
User triggers "Scan & Map My Network"
       │
       ▼
┌──────────────────────────────────────────┐
│  Stage 1: Gmail Scan (paginated)         │
│  POST /api/contact-intel/scan            │
│  Extract headers + message bodies        │
│  Build per-contact transcript bundles    │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Stage 2: LLM Classification (Groq)     │
│  POST /api/contact-intel/classify        │
│  For each contact: send transcript →     │
│  Groq (Llama 4 Scout) classifies:       │
│    • who they are to me                  │
│    • relationship type                   │
│    • group / subgroup assignment         │
│    • strength + sentiment                │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Stage 3: Knowledge Graph Assembly       │
│  Client-side (contactIntel.js)           │
│  Build graph: groups → subgroups →       │
│  contacts, with edges for cross-group    │
│  associations and peripheral contacts    │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Stage 4: Persist                        │
│  LocalStorage + Notion CRM              │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│  Stage 5: Surface in Chat                │
│  Interactive knowledge graph visual      │
│  Enhanced agent tools with full context  │
└──────────────────────────────────────────┘
```

---

## The Classification Model

### Why Groq + Llama 4 Scout
- **Speed**: Sub-second inference, ~800+ tokens/sec output
- **Cost**: $0.11/M input tokens, $0.34/M output tokens
- **Context**: 131K token context window — fits large transcript bundles
- **Quality**: Good enough for structured classification; we don't need Opus-level reasoning
- **Throughput**: Can classify hundreds of contacts in under a minute total

### The Classification Prompt

For each contact, we send their full email transcript (truncated to ~50K tokens if needed) and ask for structured JSON output:

```
You are analyzing email conversations between a user and one of their contacts.
Based on the full transcript of their interactions, classify this contact.

Contact: {name} <{email}>
Total emails: {count} | First: {firstDate} | Last: {lastDate}

--- TRANSCRIPT ---
{chronological email thread summaries / bodies}
--- END TRANSCRIPT ---

Respond with JSON only:
{
  "who": "Brief description of who this person is to the user (1-2 sentences)",
  "relationshipType": "one of: colleague | client | vendor | investor | advisor | friend | family | recruiter | journalist | community | service_provider | government | unknown",
  "group": "Primary group they belong to (e.g., 'Acme Corp team', 'YC W24 batch', 'Stanford CS network', 'Family')",
  "subgroup": "More specific subgroup if applicable (e.g., 'Engineering team', 'Board members', 'College friends')",
  "strength": 1-10,
  "sentiment": "positive | neutral | mixed | negative",
  "topics": ["up to 5 key topics discussed"],
  "context": "One paragraph of useful context the email agent should know for future outreach",
  "peripheralTo": ["names of groups this person is adjacent to but not in, if any"]
}
```

### Transcript Bundling Strategy

For each contact, we build a transcript bundle:
1. Fetch all threads involving this contact
2. For each thread: extract subject + message snippets (first 500 chars per message)
3. Sort chronologically
4. Cap total transcript at ~40K tokens (~30K words) — fits within Llama 4 Scout's 131K context with room for prompt + output
5. For contacts with very few emails (< 3), use a simpler/cheaper classification (just headers + subjects, skip full body)

---

## Knowledge Graph Schema

The knowledge graph is a nested structure of groups → subgroups → contacts, with edges for cross-group relationships.

```javascript
// The full graph object
{
  groups: [
    {
      id: "grp_uuid",
      name: "Acme Corp",                    // LLM-derived group name
      type: "company",                       // company | community | personal | institutional | other
      contactCount: 12,
      subgroups: [
        {
          id: "sg_uuid",
          name: "Engineering Team",
          contacts: ["contact_id_1", "contact_id_2", ...]
        },
        {
          id: "sg_uuid",
          name: "Leadership",
          contacts: ["contact_id_3"]
        }
      ]
    },
    {
      id: "grp_uuid",
      name: "YC W24 Batch",
      type: "community",
      contactCount: 8,
      subgroups: [...]
    },
    {
      id: "grp_uuid",
      name: "Family & Close Friends",
      type: "personal",
      contactCount: 5,
      subgroups: [...]
    }
  ],

  // Contacts that sit near but outside defined groups
  peripheral: [
    {
      contactId: "contact_id_X",
      nearGroups: ["Acme Corp", "YC W24 Batch"],  // adjacent to these groups
      reason: "Met through YC event, consulted on Acme project once"
    }
  ],

  // Cross-group edges (people who bridge groups)
  bridges: [
    {
      contactId: "contact_id_Y",
      groups: ["Acme Corp", "Stanford CS Network"],
      role: "Former Acme engineer, now Stanford professor"
    }
  ]
}
```

### Graph Assembly Logic (client-side)

After all contacts are classified:
1. Collect all unique `group` values from classifications
2. Within each group, collect unique `subgroup` values
3. Assign contacts to their group/subgroup
4. Identify **peripheral contacts**: those whose `peripheralTo` array references a group
5. Identify **bridge contacts**: those who appear in multiple groups or whose `peripheralTo` + `group` spans multiple groups
6. Merge similar group names (fuzzy match — "Acme Corp" ≈ "Acme Corporation" ≈ "acme.com team")
7. Sort groups by contact count descending

---

## Enriched Contact Schema

```javascript
{
  // === Core identity ===
  id: "uuid",
  name: "Sarah Chen",
  email: "sarah.chen@techforward.io",
  company: "TechForward",             // domain-derived + LLM-verified

  // === Gmail interaction data ===
  interaction: {
    totalEmails: 47,
    sentByUser: 22,
    receivedByUser: 25,
    firstInteraction: "2024-09-15",
    lastInteraction: "2026-03-07",
    threadCount: 12,
    initiationRatio: 0.58,
  },

  // === LLM Classification (from Groq) ===
  classification: {
    who: "VP of Engineering at TechForward, main technical contact for the API integration project",
    relationshipType: "client",        // colleague|client|vendor|investor|advisor|friend|family|recruiter|journalist|community|service_provider|government|unknown
    group: "TechForward",
    subgroup: "Engineering Team",
    strength: 8,                       // 1-10
    sentiment: "positive",             // positive|neutral|mixed|negative
    topics: ["API integration", "technical architecture", "contract renewal", "team scaling"],
    context: "Sarah is the key decision-maker for the TechForward account. She values detailed technical proposals and responds quickly. Last discussed expanding the integration to their mobile team.",
    peripheralTo: [],
    classifiedAt: "2026-03-09T...",
    model: "llama-4-scout",
  },

  // === Graph position ===
  graphPosition: {
    groupId: "grp_uuid",
    subgroupId: "sg_uuid",
    isBridge: false,                   // appears in multiple groups
    isPeripheral: false,               // near but outside a group
    bridgeGroups: [],                  // if isBridge: which groups they connect
    peripheralTo: [],                  // if isPeripheral: which groups they're near
  },

  // === Sync metadata ===
  notionPageId: null,
  lastSyncedAt: null,
  source: "gmail-scan",
}
```

---

## New Files

### API Endpoints

#### `api/contact-intel/scan.js`
Gmail inbox scanner. Same `googleapis` pattern as `api/send.js`.

```
POST /api/contact-intel/scan
Headers: Authorization: Bearer <providerToken>
Body:    { pageToken?, batchSize?: 100 }
Returns: {
  contacts: { [email]: { name, email, domain, sent, received, threads, firstDate, lastDate, initiated } },
  nextPageToken: string | null,
  totalProcessed: number
}
```

**Key difference from original plan:** Also extracts message **snippets/bodies** (not just headers). Uses `format: 'full'` for messages from contacts with < 50 threads, `format: 'metadata'` as fallback for very high-volume contacts.

#### `api/contact-intel/transcripts.js`
Fetches full conversation transcripts for a batch of contacts.

```
POST /api/contact-intel/transcripts
Headers: Authorization: Bearer <providerToken>
Body:    { contacts: [{ email, threadIds }], maxThreadsPerContact?: 20 }
Returns: {
  transcripts: { [email]: { threads: [{ subject, messages: [{ from, date, snippet }] }] } }
}
```

**Implementation notes:**
- For each contact, fetches up to `maxThreadsPerContact` threads (most recent first)
- Extracts plain text body, truncated to 500 chars per message
- Returns transcript bundles ready for classification
- Chunked: processes 5 contacts per call to stay within Vercel timeout

#### `api/contact-intel/classify.js`
Groq-powered contact classification.

```
POST /api/contact-intel/classify
Body:    { contacts: [{ name, email, interaction, transcript }] }
Returns: { classifications: [{ email, classification: {...} }] }
```

**Implementation notes:**
- Calls Groq API (`https://api.groq.com/openai/v1/chat/completions`) with model `llama-4-scout`
- Processes contacts in parallel (up to 5 concurrent Groq calls)
- Each call sends the classification prompt + transcript → expects JSON output
- Falls back to header-only classification for contacts with < 3 emails
- Estimated cost: 500 contacts × ~5K tokens avg = 2.5M tokens ≈ $0.28

#### `api/contact-intel/sync.js`
Notion CRM sync (unchanged from original plan).

### Frontend Modules

#### `src/lib/contactIntel.js`
Core logic — now includes graph assembly.

```javascript
// Deduplicate raw scan results by email
export function deduplicateContacts(existingMap, newContacts) → mergedMap

// Build transcript bundles from raw email data
export function buildTranscriptBundles(contacts, transcripts) → bundles[]

// Assemble knowledge graph from classifications
export function assembleGraph(classifiedContacts) → KnowledgeGraph
  // 1. Collect unique groups, merge similar names (fuzzy)
  // 2. Nest subgroups within groups
  // 3. Assign contacts to groups/subgroups
  // 4. Identify peripheral contacts
  // 5. Identify bridge contacts

// Merge classified contacts with existing store
export function mergeWithExisting(classified, existing) → Contact[]

// Fuzzy group name matching
export function normalizeGroupName(name) → string
export function areSimilarGroups(a, b) → boolean
```

#### `src/lib/contactIntelApi.js`
API client wrappers.

```javascript
export async function scanFullInbox(providerToken, { batchSize, onProgress }) → rawContacts
export async function fetchTranscripts(providerToken, contacts, { onProgress }) → transcripts
export async function classifyContacts(contactsWithTranscripts, { onProgress }) → classifications
export async function syncToNotion(contacts, graph) → { synced, created, updated }
```

#### `src/components/ContactIntelButton.jsx`
Scan trigger. States: idle → scanning → reading → classifying → graphing → syncing → done.

#### `src/components/KnowledgeGraphView.jsx`
**The centerpiece.** Renders the contact knowledge graph in the chat.

- Groups as collapsible sections/clusters
- Subgroups nested within
- Contact cards within subgroups (condensed view: name, who, strength dot)
- Peripheral contacts shown in a "Near but outside" section with dotted lines to related groups
- Bridge contacts highlighted with multi-group badge
- Color-coded by relationship type
- Filterable by group, type, strength
- Expandable: click a contact to see full classification detail

#### `src/components/ContactIntelSummary.jsx`
Summary dashboard card (above the graph).

- Total contacts classified
- Group count + top groups by size
- Relationship type distribution (pie/bar chart)
- Strongest relationships (top 5)
- "View in Notion" link

---

## Modified Files

### `src/lib/contacts.js`
- Add `mergeClassifiedContacts(classifiedContacts)` — merges by email
- Add `getContactByEmail(email)` helper
- Modify `searchContacts()` — search across classification fields: `who`, `context`, `topics`, `group`, `subgroup`, `relationshipType`

### `api/chat.js`
- Expand `SYSTEM_PROMPT`:
  ```
  You have deep knowledge of the user's contact network. When discussing contacts,
  reference their relationship type, group membership, conversation topics, and
  the context from their email history. You understand who bridges different groups
  and who sits at the periphery of the user's network.
  ```
- Add `get_contact_intelligence` tool — returns full classification + graph position
- Add `get_network_group` tool — returns all contacts in a group/subgroup
- Update `search_contacts` to include classification fields

### `src/pages/Chat.jsx`
- Add `ContactIntelButton` to header
- Add orchestration handler with 5 stages:
  1. Scan inbox (paginated) → progress messages
  2. Fetch transcripts (batched) → progress messages
  3. Classify via Groq (parallel) → progress messages
  4. Assemble knowledge graph → post graph
  5. Sync to Notion + LocalStorage → confirmation
- Render `KnowledgeGraphView` and `ContactIntelSummary` message types

### `src/components/ContactCard.jsx`
- Show relationship type badge (color pill)
- Show `who` description as subtitle
- Show group/subgroup label
- Show sentiment indicator
- Show topic tags

### `src/components/MessageList.jsx`
- Handle `knowledge-graph` and `contact-intel-summary` message types

### `.env.example`
```
GROQ_API_KEY=...              # Groq API key for fast LLM classification
NOTION_API_KEY=...            # Notion integration token
NOTION_PARENT_PAGE_ID=...    # Notion page where CRM database lives
```

### `vercel.json`
- Add rewrite rules for `/api/contact-intel/*`

---

## Implementation Order

### Step 1: Gmail Scan + Transcript Extraction
**Create:** `api/contact-intel/scan.js`, `api/contact-intel/transcripts.js`

Scan inbox for all contacts with interaction metadata. Then fetch full conversation transcripts per contact. These are independent endpoints so transcript fetching can happen incrementally as scan results come in.

### Step 2: Groq Classification Endpoint
**Create:** `api/contact-intel/classify.js`

The brain of the system. Takes contacts + transcripts, classifies via Groq. Test standalone with curl using sample transcript data before wiring UI.

### Step 3: Knowledge Graph Assembly
**Create:** `src/lib/contactIntel.js`

Pure functions: dedup, transcript bundling, graph assembly, fuzzy group matching. Fully testable without any API calls.

### Step 4: Frontend Orchestration + Graph UI
**Create:** `src/lib/contactIntelApi.js`, `src/components/ContactIntelButton.jsx`, `src/components/KnowledgeGraphView.jsx`, `src/components/ContactIntelSummary.jsx`
**Modify:** `src/pages/Chat.jsx`, `src/components/MessageList.jsx`

Wire the full pipeline: button → scan → transcripts → classify → graph → display. This is the big integration step.

### Step 5: Contact Store + Chat Intelligence
**Modify:** `src/lib/contacts.js`, `api/chat.js`, `src/components/ContactCard.jsx`

Merge classified contacts into the store. Update search to use classification fields. Give the chat agent access to relationship context and group structure.

### Step 6: Notion Sync
**Create:** `api/contact-intel/sync.js`

Persist the full classified contact list + graph metadata to Notion.

### Step 7: Tests
**Create:** `src/lib/__tests__/contactIntel.test.js`

Unit tests for graph assembly, fuzzy matching, dedup, transcript bundling.

---

## Notion Database Schema

| Property | Type | Source |
|----------|------|--------|
| Name | Title | `name` |
| Email | Email | `email` |
| Company | Rich Text | `company` |
| Who | Rich Text | `classification.who` |
| Relationship Type | Select | `classification.relationshipType` |
| Group | Select | `classification.group` |
| Subgroup | Select | `classification.subgroup` |
| Strength | Number | `classification.strength` |
| Sentiment | Select | `classification.sentiment` |
| Topics | Multi-select | `classification.topics` |
| Context | Rich Text | `classification.context` |
| Total Emails | Number | `interaction.totalEmails` |
| Last Interaction | Date | `interaction.lastInteraction` |
| Is Bridge | Checkbox | `graphPosition.isBridge` |
| Is Peripheral | Checkbox | `graphPosition.isPeripheral` |
| Source | Select | `source` |

---

## Cost Estimate

For a user with ~500 unique contacts and ~5,000 emails:
- **Gmail scan**: Free (googleapis, already authed)
- **Transcript fetching**: Free (googleapis)
- **Groq classification**: ~2.5M input tokens × $0.11/M = **~$0.28**
- **Groq output**: ~250K output tokens × $0.34/M = **~$0.09**
- **Total LLM cost: ~$0.37** for full network classification
- **Notion sync**: Free (within API limits)

For a power user with ~2,000 contacts: **~$1.50** total. Extremely affordable.

---

## Edge Cases & Considerations

1. **Vercel timeouts**: All endpoints return partial results with continuation tokens. Frontend loops.
2. **Token expiry**: Gmail OAuth may expire mid-scan. Frontend catches 401, prompts re-auth.
3. **Deduplication**: Normalize emails to lowercase. Merge interaction data across pages.
4. **Self-exclusion**: Filter out user's own email address.
5. **Bot filtering**: Skip `noreply@`, `no-reply@`, `mailer-daemon@`, `notifications@`, automated senders.
6. **Transcript size**: Cap at ~40K tokens per contact. For very active contacts (100+ emails), sample most recent 20 threads.
7. **Groq rate limits**: Free tier: ~6K tokens/min for 70B models. Paid tier is much higher. Batch with small delays if needed.
8. **Group name normalization**: "Acme Corp" / "Acme Corporation" / "acme.com" should merge. Use fuzzy matching (Levenshtein + domain extraction).
9. **Unknown contacts**: Some contacts may be unclassifiable (single cold email). Bucket as "Uncategorized" with the LLM's best guess.
10. **Incremental re-scan**: On re-scan, only fetch new emails (after `lastInteraction`), re-classify contacts with new data, merge into existing graph.
11. **Privacy**: Transcripts are sent to Groq API. Users should be informed. Transcripts are not stored server-side — processed and discarded.
