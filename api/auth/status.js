export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(200).json({ connected: false })
  }

  // If we have a Bearer token, Gmail is connected via Supabase OAuth
  return res.status(200).json({ connected: true })
}
