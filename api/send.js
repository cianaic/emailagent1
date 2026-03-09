import { google } from 'googleapis'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Extract the Google provider token from the Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token. Please sign in again.' })
  }
  const accessToken = authHeader.slice(7)

  const { to, subject, body, fromName } = req.body
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing to, subject, or body' })
  }

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })

  try {
    // Get the sender's email from the token
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()
    const senderEmail = userInfo.email

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const senderName = fromName || senderEmail
    const from = `${senderName} <${senderEmail}>`

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
    if (err.code === 401 || err.code === 403) {
      return res.status(401).json({ error: 'Gmail token expired. Please sign in again.' })
    }
    return res.status(500).json({ error: 'Failed to send email' })
  }
}
