import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function POST(request) {
  // Extract the Google provider token from the Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing authorization token. Please sign in again.' },
      { status: 401 }
    )
  }
  const accessToken = authHeader.slice(7)

  let parsed
  try {
    parsed = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  const { to, subject, body, fromName } = parsed
  if (!to || !subject || !body) {
    return NextResponse.json({ error: 'Missing to, subject, or body' }, { status: 400 })
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

    return NextResponse.json({
      success: true,
      messageId: result.data.id,
      threadId: result.data.threadId,
    })
  } catch (err) {
    console.error('Gmail send error:', err.message)
    if (err.code === 401 || err.code === 403) {
      return NextResponse.json(
        { error: 'Gmail token expired. Please sign in again.' },
        { status: 401 }
      )
    }
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
