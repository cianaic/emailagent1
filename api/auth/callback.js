import { google } from 'googleapis'

export default async function handler(req, res) {
  const { code, error } = req.query

  if (error) {
    return res.redirect('/?gmail_error=' + encodeURIComponent(error))
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/auth/callback`

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  try {
    const { tokens } = await oauth2Client.getToken(code)

    // Get user email
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    // Store tokens in a secure httpOnly cookie
    const tokenData = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      email: data.email,
    })

    // Base64 encode for cookie storage
    const encoded = Buffer.from(tokenData).toString('base64')

    res.setHeader('Set-Cookie', [
      `gmail_tokens=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
    ])

    return res.redirect('/?gmail_connected=' + encodeURIComponent(data.email))
  } catch (err) {
    console.error('OAuth callback error:', err)
    return res.redirect('/?gmail_error=auth_failed')
  }
}
