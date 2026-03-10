import { NextResponse } from 'next/server'

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

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  const { contact, outreachContext } = body
  if (!contact || !outreachContext) {
    return NextResponse.json({ error: 'Missing contact or outreachContext' }, { status: 400 })
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
      return NextResponse.json({ error: 'Email drafting service unavailable' }, { status: 502 })
    }

    const data = await response.json()
    const text = data?.content?.[0]?.text
    if (!text) {
      return NextResponse.json({ error: 'Empty response from drafting service' }, { status: 502 })
    }

    const draft = JSON.parse(text)
    if (typeof draft.subject !== 'string' || typeof draft.body !== 'string') {
      return NextResponse.json({ error: 'Invalid draft format received' }, { status: 502 })
    }

    return NextResponse.json({ subject: draft.subject, body: draft.body })
  } catch (err) {
    console.error('Draft generation error:', err)
    return NextResponse.json({ error: 'Failed to generate draft' }, { status: 500 })
  }
}
