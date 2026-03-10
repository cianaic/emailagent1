import { google } from 'googleapis'

// Common automated/noreply addresses to filter out
const FILTERED_PATTERNS = [
  /noreply@/i,
  /no-reply@/i,
  /donotreply@/i,
  /do-not-reply@/i,
  /mailer-daemon@/i,
  /notifications@/i,
  /notification@/i,
  /updates@/i,
  /alert@/i,
  /alerts@/i,
  /news@/i,
  /newsletter@/i,
  /support@.*\.(com|io|co)/i,
  /info@.*\.(com|io|co)/i,
  /hello@.*\.(com|io|co)/i,
  /team@.*\.(com|io|co)/i,
  /feedback@/i,
  /billing@/i,
  /receipts@/i,
  /invoice@/i,
  /calendar-notification@google\.com/i,
  /.*@calendar\.google\.com/i,
  /.*@docs\.google\.com/i,
]

function isFilteredEmail(email) {
  return FILTERED_PATTERNS.some((pattern) => pattern.test(email))
}

function parseEmailAddress(raw) {
  if (!raw) return null
  // "John Doe <john@example.com>" → { name: "John Doe", email: "john@example.com" }
  const match = raw.match(/^(?:"?([^"]*)"?\s)?<?([^\s>]+@[^\s>]+)>?$/)
  if (!match) return null
  return {
    name: (match[1] || '').trim().replace(/^["']|["']$/g, ''),
    email: match[2].toLowerCase().trim(),
  }
}

function getHeader(headers, name) {
  const h = headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
  return h?.value || ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }
  const accessToken = authHeader.slice(7)

  const { pageToken, batchSize = 100 } = req.body

  // 5-year lookback window
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)
  const afterDate = `${fiveYearsAgo.getFullYear()}/${String(fiveYearsAgo.getMonth() + 1).padStart(2, '0')}/${String(fiveYearsAgo.getDate()).padStart(2, '0')}`

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })

  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Get user's own email to exclude from contacts
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const userEmail = profile.data.emailAddress.toLowerCase()

    // List messages: primary category only (excludes promos/social/updates/forums) + 5-year window
    const listParams = {
      userId: 'me',
      maxResults: Math.min(batchSize, 500),
      q: `category:primary after:${afterDate}`,
    }
    if (pageToken) listParams.pageToken = pageToken

    const listResponse = await gmail.users.messages.list(listParams)
    const messages = listResponse.data.messages || []
    const nextPageToken = listResponse.data.nextPageToken || null

    // Fetch metadata for each message
    const contacts = {}

    const messageDetails = await Promise.all(
      messages.map((msg) =>
        gmail.users.messages
          .get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Cc', 'Date', 'Subject', 'List-Unsubscribe', 'Precedence'],
          })
          .catch(() => null)
      )
    )

    for (const detail of messageDetails) {
      if (!detail?.data) continue

      const headers = detail.data.payload?.headers || []

      // Skip bulk/list emails that slipped past category:primary
      const listUnsub = getHeader(headers, 'List-Unsubscribe')
      const precedence = getHeader(headers, 'Precedence').toLowerCase()
      if (listUnsub || precedence === 'bulk' || precedence === 'list') continue

      const from = parseEmailAddress(getHeader(headers, 'From'))
      const date = getHeader(headers, 'Date')
      const subject = getHeader(headers, 'Subject')
      const threadId = detail.data.threadId
      const parsedDate = date ? new Date(date).toISOString() : null

      // Parse all To and Cc recipients
      const toRaw = getHeader(headers, 'To')
      const ccRaw = getHeader(headers, 'Cc')
      const allRecipients = []

      for (const raw of [...toRaw.split(','), ...ccRaw.split(',')]) {
        const parsed = parseEmailAddress(raw.trim())
        if (parsed) allRecipients.push(parsed)
      }

      const isSentByUser = from?.email === userEmail

      // Process contacts from this message
      const relevantContacts = isSentByUser
        ? allRecipients // user sent: contacts are recipients
        : from
          ? [from]
          : [] // user received: contact is sender

      for (const contact of relevantContacts) {
        if (!contact.email || contact.email === userEmail) continue
        if (isFilteredEmail(contact.email)) continue

        if (!contacts[contact.email]) {
          contacts[contact.email] = {
            name: contact.name || '',
            email: contact.email,
            domain: contact.email.split('@')[1] || '',
            sent: 0,
            received: 0,
            threadIds: [],
            subjects: [],
            firstDate: parsedDate,
            lastDate: parsedDate,
            initiated: 0,
          }
        }

        const c = contacts[contact.email]

        // Update name if we got a better one
        if (contact.name && (!c.name || contact.name.length > c.name.length)) {
          c.name = contact.name
        }

        if (isSentByUser) {
          c.sent++
        } else {
          c.received++
        }

        // Track threads
        if (threadId && !c.threadIds.includes(threadId)) {
          c.threadIds.push(threadId)
        }

        // Track subjects (first 5 unique)
        if (subject && c.subjects.length < 5 && !c.subjects.includes(subject)) {
          c.subjects.push(subject)
        }

        // Update date range
        if (parsedDate) {
          if (!c.firstDate || parsedDate < c.firstDate) c.firstDate = parsedDate
          if (!c.lastDate || parsedDate > c.lastDate) c.lastDate = parsedDate
        }
      }
    }

    return res.status(200).json({
      contacts,
      nextPageToken,
      totalProcessed: messages.length,
      userEmail,
    })
  } catch (err) {
    console.error('Contact scan error:', err.message)
    if (err.code === 401 || err.code === 403) {
      return res.status(401).json({ error: 'Gmail token expired. Please sign in again.' })
    }
    return res.status(500).json({ error: 'Failed to scan contacts' })
  }
}
