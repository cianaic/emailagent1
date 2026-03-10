/**
 * Contact Intelligence — API Client
 *
 * Thin wrappers around fetch calls to the contact-intel serverless endpoints.
 * Follows the same pattern as src/lib/claude.js and src/lib/gmail.js.
 */

import { deduplicateContacts, rawMapToContacts } from './contactIntel'

/**
 * Scan a single page of the Gmail inbox.
 */
async function scanInboxPage(providerToken, { pageToken, batchSize = 100 }) {
  const response = await fetch('/api/contact-intel/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`,
    },
    body: JSON.stringify({ pageToken, batchSize }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Scan failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Full inbox scan with pagination. Loops until all pages processed.
 * @param {string} providerToken - Google OAuth token
 * @param {object} options
 * @param {number} options.batchSize - Messages per page (default 100)
 * @param {function} options.onProgress - Callback: ({ contactCount, messagesProcessed, pagesProcessed })
 * @returns {object[]} Array of contact objects with interaction data
 */
export async function scanFullInbox(providerToken, { batchSize = 100, onProgress } = {}) {
  let contactMap = {}
  let pageToken = null
  let totalProcessed = 0
  let pagesProcessed = 0

  do {
    const result = await scanInboxPage(providerToken, { pageToken, batchSize })

    contactMap = deduplicateContacts(contactMap, result.contacts)
    pageToken = result.nextPageToken
    totalProcessed += result.totalProcessed
    pagesProcessed++

    if (onProgress) {
      onProgress({
        contactCount: Object.keys(contactMap).length,
        messagesProcessed: totalProcessed,
        pagesProcessed,
        done: !pageToken,
      })
    }
  } while (pageToken)

  return rawMapToContacts(contactMap)
}

/**
 * Fetch conversation transcripts for a batch of contacts.
 * Processes in chunks of 5 to avoid timeouts.
 * @param {string} providerToken
 * @param {object[]} contacts - Each needs { email, threadIds }
 * @param {object} options
 * @param {number} options.maxThreadsPerContact - Max threads to fetch per contact (default 20)
 * @param {function} options.onProgress - Callback: ({ processed, total })
 */
export async function fetchTranscripts(providerToken, contacts, { maxThreadsPerContact = 20, onProgress } = {}) {
  const allTranscripts = {}
  const chunkSize = 5

  for (let i = 0; i < contacts.length; i += chunkSize) {
    const chunk = contacts.slice(i, i + chunkSize).map((c) => ({
      email: c.email,
      threadIds: c.threadIds || [],
    }))

    const response = await fetch('/api/contact-intel/transcripts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      body: JSON.stringify({ contacts: chunk, maxThreadsPerContact }),
    })

    if (response.ok) {
      const data = await response.json()
      Object.assign(allTranscripts, data.transcripts)
    }

    if (onProgress) {
      onProgress({ processed: Math.min(i + chunkSize, contacts.length), total: contacts.length })
    }
  }

  return allTranscripts
}

/**
 * Classify contacts using Gemini 2.5 Flash-Lite.
 * Sends batches to the classify endpoint.
 * @param {object[]} contacts - Contacts with interaction data + transcripts
 * @param {object} options
 * @param {function} options.onProgress - Callback: ({ processed, total })
 */
export async function classifyContacts(contacts, { onProgress } = {}) {
  const classificationMap = {}
  const chunkSize = 10 // 10 contacts per API call, 5 parallel inside each call

  for (let i = 0; i < contacts.length; i += chunkSize) {
    const chunk = contacts.slice(i, i + chunkSize)

    const response = await fetch('/api/contact-intel/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: chunk }),
    })

    if (response.ok) {
      const data = await response.json()
      for (const result of data.classifications) {
        classificationMap[result.email] = result.classification
      }
    }

    if (onProgress) {
      onProgress({ processed: Math.min(i + chunkSize, contacts.length), total: contacts.length })
    }
  }

  return classificationMap
}

/**
 * Save contacts + graph to Supabase.
 * @param {string} supabaseAccessToken - Supabase auth token
 * @param {object[]} contacts - Enriched contact objects
 * @param {object} graph - Knowledge graph structure
 * @param {object} scanMetadata - Scan stats (contactsFound, emailsProcessed)
 */
export async function saveToSupabase(supabaseAccessToken, contacts, graph, scanMetadata) {
  const groups = graph?.groups?.map((g) => ({
    name: g.name,
    type: g.type || null,
    contactCount: g.contactCount || 0,
  })) || []

  const response = await fetch('/api/contact-intel/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAccessToken}`,
    },
    body: JSON.stringify({ contacts, groups, scanMetadata }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Save failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Load contacts from Supabase.
 * @param {string} supabaseAccessToken - Supabase auth token
 * @returns {{ contacts: object[] | null, groups: object[] | null, scanMetadata: object | null }}
 */
export async function loadFromSupabase(supabaseAccessToken) {
  const response = await fetch('/api/contact-intel/load', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${supabaseAccessToken}`,
    },
  })

  if (!response.ok) {
    console.error('Failed to load contacts from Supabase:', response.status)
    return { contacts: null, groups: null, scanMetadata: null }
  }

  const data = await response.json()
  return {
    contacts: data.contacts?.length > 0 ? data.contacts : null,
    groups: data.groups?.length > 0 ? data.groups : null,
    scanMetadata: data.scanMetadata || null,
  }
}
