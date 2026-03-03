export async function getGmailStatus() {
  try {
    const res = await fetch('/api/auth/status')
    return await res.json()
  } catch {
    return { connected: false }
  }
}

export function connectGmail() {
  window.location.href = '/api/auth/google'
}

export async function disconnectGmail() {
  await fetch('/api/auth/disconnect', { method: 'POST' })
}

export async function sendEmail({ to, subject, body, fromName }) {
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body, fromName }),
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to send email')
  }

  return res.json()
}

export async function sendAllEmails(drafts, onProgress) {
  const results = []

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i]
    if (onProgress) onProgress(i, drafts.length, draft.contact.name)

    try {
      const result = await sendEmail({
        to: draft.contact.email,
        subject: draft.subject,
        body: draft.body,
      })
      results.push({ ...result, contactName: draft.contact.name, success: true })
    } catch (err) {
      results.push({ contactName: draft.contact.name, success: false, error: err.message })
    }
  }

  return results
}
