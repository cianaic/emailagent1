import { google } from 'googleapis'

const MAX_SNIPPET_LENGTH = 500

function extractPlainText(payload) {
  if (!payload) return ''

  // Direct text/plain part
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8').slice(0, MAX_SNIPPET_LENGTH)
  }

  // Multipart: recurse into parts
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8').slice(0, MAX_SNIPPET_LENGTH)
      }
    }
    // Fallback: check nested multipart
    for (const part of payload.parts) {
      const text = extractPlainText(part)
      if (text) return text
    }
  }

  return ''
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

  const { contacts, maxThreadsPerContact = 20 } = req.body

  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'Missing contacts array' })
  }

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  try {
    const transcripts = {}

    for (const contact of contacts) {
      const { email, threadIds = [] } = contact
      if (!email) continue

      // Take most recent threads (threadIds should already be ordered)
      const threadsToFetch = threadIds.slice(0, maxThreadsPerContact)
      const threads = []

      // Fetch threads in parallel (batch of 5 at a time)
      for (let i = 0; i < threadsToFetch.length; i += 5) {
        const batch = threadsToFetch.slice(i, i + 5)
        const results = await Promise.all(
          batch.map((threadId) =>
            gmail.users.threads
              .get({
                userId: 'me',
                id: threadId,
                format: 'full',
              })
              .catch(() => null)
          )
        )

        for (const result of results) {
          if (!result?.data?.messages) continue

          const threadMessages = result.data.messages.map((msg) => {
            const headers = msg.payload?.headers || []
            return {
              from: getHeader(headers, 'From'),
              date: getHeader(headers, 'Date'),
              subject: getHeader(headers, 'Subject'),
              snippet: extractPlainText(msg.payload),
            }
          })

          if (threadMessages.length > 0) {
            threads.push({
              subject: threadMessages[0].subject,
              messages: threadMessages,
            })
          }
        }
      }

      transcripts[email] = { threads }
    }

    return res.status(200).json({ transcripts })
  } catch (err) {
    console.error('Transcript fetch error:', err.message)
    if (err.code === 401 || err.code === 403) {
      return res.status(401).json({ error: 'Gmail token expired. Please sign in again.' })
    }
    return res.status(500).json({ error: 'Failed to fetch transcripts' })
  }
}
