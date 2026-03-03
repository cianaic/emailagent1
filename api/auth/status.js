export default async function handler(req, res) {
  const cookie = req.cookies?.gmail_tokens || parseCookie(req.headers.cookie, 'gmail_tokens')

  if (!cookie) {
    return res.status(200).json({ connected: false })
  }

  try {
    const tokenData = JSON.parse(Buffer.from(cookie, 'base64').toString())
    return res.status(200).json({
      connected: true,
      email: tokenData.email,
    })
  } catch {
    return res.status(200).json({ connected: false })
  }
}

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? match[1] : null
}
