const SYSTEM_PROMPT = `You are an email drafting assistant. Given a contact and an outreach context, write a personalized cold email.

Respond with ONLY valid JSON in this exact format:
{
  "subject": "Email subject line",
  "body": "Full email body text"
}

Guidelines:
- Keep subject lines under 60 characters, compelling and specific
- Open with something personalized to the contact's role/company
- Be concise (3-4 short paragraphs max)
- Include a clear call to action
- Professional but warm tone
- No placeholder brackets like [Name] — use the actual details provided`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const { contact, outreachContext } = req.body
  if (!contact || !outreachContext) {
    return res.status(400).json({ error: 'Missing contact or outreachContext' })
  }

  const userPrompt = `Contact:
- Name: ${contact.name}
- Role: ${contact.role}
- Company: ${contact.company}
- Email: ${contact.email}
${contact.notes ? `- Notes: ${contact.notes}` : ''}

Outreach context: ${outreachContext}

Write a personalized cold email for this contact.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Claude API error:', response.status, errText)
      return res.status(502).json({ error: 'Email drafting service unavailable' })
    }

    const data = await response.json()
    const text = data?.content?.[0]?.text
    if (!text) {
      return res.status(502).json({ error: 'Empty response from drafting service' })
    }

    const draft = JSON.parse(text)
    if (typeof draft.subject !== 'string' || typeof draft.body !== 'string') {
      return res.status(502).json({ error: 'Invalid draft format received' })
    }

    return res.status(200).json({ subject: draft.subject, body: draft.body })
  } catch (err) {
    console.error('Draft generation error:', err)
    return res.status(500).json({ error: 'Failed to generate draft' })
  }
}
