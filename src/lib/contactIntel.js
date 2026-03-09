/**
 * Contact Intelligence — Core Logic
 *
 * Pure functions for deduplication, relationship scoring, transcript bundling,
 * and knowledge graph assembly. No side effects, fully testable.
 */

/**
 * Deduplicate and merge raw contact scan results by email.
 * Called as pages arrive from paginated scan.
 */
export function deduplicateContacts(existingMap, newContacts) {
  const merged = { ...existingMap }

  for (const [email, contact] of Object.entries(newContacts)) {
    if (!merged[email]) {
      merged[email] = { ...contact }
    } else {
      const existing = merged[email]
      existing.sent += contact.sent || 0
      existing.received += contact.received || 0

      // Merge thread IDs
      for (const tid of contact.threadIds || []) {
        if (!existing.threadIds.includes(tid)) {
          existing.threadIds.push(tid)
        }
      }

      // Merge subjects
      for (const s of contact.subjects || []) {
        if (existing.subjects.length < 10 && !existing.subjects.includes(s)) {
          existing.subjects.push(s)
        }
      }

      // Update name (prefer longer)
      if (contact.name && (!existing.name || contact.name.length > existing.name.length)) {
        existing.name = contact.name
      }

      // Expand date range
      if (contact.firstDate && (!existing.firstDate || contact.firstDate < existing.firstDate)) {
        existing.firstDate = contact.firstDate
      }
      if (contact.lastDate && (!existing.lastDate || contact.lastDate > existing.lastDate)) {
        existing.lastDate = contact.lastDate
      }
    }
  }

  return merged
}

/**
 * Convert raw scan map { [email]: {...} } to array of contact objects.
 */
export function rawMapToContacts(rawMap) {
  return Object.entries(rawMap).map(([email, data]) => ({
    id: crypto.randomUUID(),
    name: data.name || email.split('@')[0],
    email,
    company: extractCompanyFromDomain(data.domain),
    role: '',
    location: '',
    tags: [],
    bio: '',
    interaction: {
      totalEmails: (data.sent || 0) + (data.received || 0),
      sentByUser: data.sent || 0,
      receivedByUser: data.received || 0,
      firstInteraction: data.firstDate || null,
      lastInteraction: data.lastDate || null,
      threadCount: data.threadIds?.length || 0,
      initiationRatio: data.sent > 0 ? data.sent / ((data.sent || 0) + (data.received || 0)) : 0,
    },
    threadIds: data.threadIds || [],
    subjects: data.subjects || [],
    source: 'gmail-scan',
  }))
}

/**
 * Extract a readable company name from an email domain.
 */
function extractCompanyFromDomain(domain) {
  if (!domain) return ''
  // Skip common email providers
  const freeProviders = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'mail.com', 'protonmail.com', 'proton.me', 'fastmail.com',
    'live.com', 'msn.com', 'me.com', 'mac.com', 'zoho.com',
  ]
  if (freeProviders.includes(domain.toLowerCase())) return ''

  // Take the domain name part, capitalize
  const name = domain.split('.')[0]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Assemble a knowledge graph from classified contacts.
 */
export function assembleGraph(classifiedContacts) {
  const groupMap = {} // groupName -> { contacts, subgroups }

  for (const contact of classifiedContacts) {
    const c = contact.classification
    if (!c) continue

    const groupName = normalizeGroupName(c.group || 'Uncategorized')
    const subgroupName = c.subgroup || ''

    if (!groupMap[groupName]) {
      groupMap[groupName] = {
        id: `grp_${crypto.randomUUID().slice(0, 8)}`,
        name: groupName,
        type: inferGroupType(c.relationshipType),
        subgroups: {},
        contactIds: [],
      }
    }

    const group = groupMap[groupName]
    group.contactIds.push(contact.id)

    if (subgroupName) {
      if (!group.subgroups[subgroupName]) {
        group.subgroups[subgroupName] = {
          id: `sg_${crypto.randomUUID().slice(0, 8)}`,
          name: subgroupName,
          contacts: [],
        }
      }
      group.subgroups[subgroupName].contacts.push(contact.id)
    }
  }

  // Merge similar group names
  const mergedGroups = mergeSimilarGroups(groupMap)

  // Build groups array sorted by contact count
  const groups = Object.values(mergedGroups)
    .map((g) => ({
      ...g,
      contactCount: g.contactIds.length,
      subgroups: Object.values(g.subgroups),
    }))
    .sort((a, b) => b.contactCount - a.contactCount)

  // Identify peripheral contacts
  const peripheral = []
  for (const contact of classifiedContacts) {
    const c = contact.classification
    if (c?.peripheralTo?.length > 0) {
      peripheral.push({
        contactId: contact.id,
        nearGroups: c.peripheralTo,
        reason: c.context || '',
      })
    }
  }

  // Identify bridge contacts (appear in multiple groups or have peripheral connections)
  const bridges = []
  const contactGroupCount = {}
  for (const group of groups) {
    for (const cid of group.contactIds) {
      if (!contactGroupCount[cid]) contactGroupCount[cid] = []
      contactGroupCount[cid].push(group.name)
    }
  }
  for (const [contactId, groupNames] of Object.entries(contactGroupCount)) {
    if (groupNames.length > 1) {
      const contact = classifiedContacts.find((c) => c.id === contactId)
      bridges.push({
        contactId,
        groups: groupNames,
        role: contact?.classification?.who || '',
      })
    }
  }

  return { groups, peripheral, bridges }
}

function inferGroupType(relationshipType) {
  const typeMap = {
    colleague: 'company',
    client: 'company',
    vendor: 'company',
    investor: 'institutional',
    advisor: 'institutional',
    friend: 'personal',
    family: 'personal',
    recruiter: 'institutional',
    journalist: 'community',
    community: 'community',
    service_provider: 'company',
    government: 'institutional',
  }
  return typeMap[relationshipType] || 'other'
}

/**
 * Normalize group name for comparison.
 */
export function normalizeGroupName(name) {
  if (!name) return 'Uncategorized'
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Check if two group names are similar enough to merge.
 */
export function areSimilarGroups(a, b) {
  const normA = a.toLowerCase().replace(/[^a-z0-9]/g, '')
  const normB = b.toLowerCase().replace(/[^a-z0-9]/g, '')

  // Exact match after normalization
  if (normA === normB) return true

  // One contains the other
  if (normA.includes(normB) || normB.includes(normA)) return true

  // Check domain-like similarity: "acme" matches "acme corp", "acme.com team"
  const coreA = normA.replace(/(corp|inc|llc|ltd|team|group|company|com|io|co)$/g, '')
  const coreB = normB.replace(/(corp|inc|llc|ltd|team|group|company|com|io|co)$/g, '')
  if (coreA && coreB && (coreA === coreB || coreA.includes(coreB) || coreB.includes(coreA))) {
    return true
  }

  return false
}

/**
 * Merge groups with similar names.
 */
function mergeSimilarGroups(groupMap) {
  const names = Object.keys(groupMap)
  const merged = {}
  const mergedInto = {} // maps old name -> new name

  for (const name of names) {
    // Check if this name should merge into an existing group
    let target = null
    for (const existingName of Object.keys(merged)) {
      if (areSimilarGroups(name, existingName)) {
        target = existingName
        break
      }
    }

    if (target) {
      // Merge into existing
      const existing = merged[target]
      const incoming = groupMap[name]
      existing.contactIds.push(...incoming.contactIds)
      for (const [sgName, sg] of Object.entries(incoming.subgroups)) {
        if (existing.subgroups[sgName]) {
          existing.subgroups[sgName].contacts.push(...sg.contacts)
        } else {
          existing.subgroups[sgName] = sg
        }
      }
      mergedInto[name] = target
    } else {
      merged[name] = { ...groupMap[name] }
    }
  }

  return merged
}

/**
 * Merge classified contacts with existing contacts in the store.
 * Deduplicates by email — classified data takes precedence.
 */
export function mergeWithExisting(classifiedContacts, existingContacts) {
  const emailMap = {}

  // Load existing contacts first
  for (const c of existingContacts) {
    emailMap[c.email] = c
  }

  // Overlay classified contacts
  for (const c of classifiedContacts) {
    if (emailMap[c.email]) {
      // Merge: keep existing fields, add classification
      emailMap[c.email] = {
        ...emailMap[c.email],
        ...c,
        // Preserve existing name if classified name is empty
        name: c.name || emailMap[c.email].name,
        // Merge tags
        tags: [...new Set([...(emailMap[c.email].tags || []), ...(c.tags || [])])],
      }
    } else {
      emailMap[c.email] = c
    }
  }

  return Object.values(emailMap)
}

/**
 * Build graph position data for each contact based on the assembled graph.
 */
export function assignGraphPositions(contacts, graph) {
  const peripheralSet = new Set(graph.peripheral.map((p) => p.contactId))
  const bridgeMap = {}
  for (const b of graph.bridges) {
    bridgeMap[b.contactId] = b.groups
  }

  // Build contact→group lookup
  const contactGroupMap = {}
  const contactSubgroupMap = {}
  for (const group of graph.groups) {
    for (const cid of group.contactIds) {
      contactGroupMap[cid] = group.id
    }
    for (const sg of group.subgroups) {
      for (const cid of sg.contacts) {
        contactSubgroupMap[cid] = sg.id
      }
    }
  }

  return contacts.map((contact) => ({
    ...contact,
    graphPosition: {
      groupId: contactGroupMap[contact.id] || null,
      subgroupId: contactSubgroupMap[contact.id] || null,
      isBridge: !!bridgeMap[contact.id],
      isPeripheral: peripheralSet.has(contact.id),
      bridgeGroups: bridgeMap[contact.id] || [],
      peripheralTo: graph.peripheral.find((p) => p.contactId === contact.id)?.nearGroups || [],
    },
  }))
}
