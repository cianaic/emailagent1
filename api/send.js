import { google } from 'googleapis'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const cookie = req.cookies?.gmail_tokens || parseCookie(req.headers.cookie, 'gmail_tokens')
  if (!cookie) {
    return res.status(401).json({ error: 'Gmail not connected' })
  }

  let tokenData
  try {
    tokenData = JSON.parse(Buffer.from(cookie, 'base64').toString())
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' })
  }

  const { to, subject, body, fromName } = req.body
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing to, subject, or body' })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const senderName = fromName || tokenData.email
  const from = `${senderName} <${tokenData.email}>`

  // Build RFC 2822 email
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ]
  const message = messageParts.join('\r\n')
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  try {
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encodedMessage },
    })

    return res.status(200).json({
      success: true,
      messageId: result.data.id,
      threadId: result.data.threadId,
    })
  } catch (err) {
    console.error('Gmail send error:', err.message)
    if (err.code === 401) {
      return res.status(401).json({ error: 'Gmail token expired. Please reconnect.' })
    }
    return res.status(500).json({ error: 'Failed to send email' })
  }
}

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? match[1] : null
}
