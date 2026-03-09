export async function sendEmail({ to, subject, body, fromName, providerToken }) {
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerToken}`,
    },
    body: JSON.stringify({ to, subject, body, fromName }),
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to send email')
  }

  return res.json()
}

export async function sendAllEmails(drafts, providerToken, onProgress) {
  const results = []

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i]
    if (onProgress) onProgress(i, drafts.length, draft.contact.name)

    try {
      const result = await sendEmail({
        to: draft.contact.email,
        subject: draft.subject,
        body: draft.body,
        providerToken,
      })
      results.push({ ...result, contactName: draft.contact.name, success: true })
    } catch (err) {
      results.push({ contactName: draft.contact.name, success: false, error: err.message })
    }
  }

  return results
}
