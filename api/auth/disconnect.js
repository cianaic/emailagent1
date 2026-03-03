export default async function handler(req, res) {
  res.setHeader('Set-Cookie', [
    `gmail_tokens=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  ])
  return res.status(200).json({ success: true })
}
