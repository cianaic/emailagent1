// NOTE: In production, API calls should go through a backend server to avoid
// exposing the API key. The VITE_ prefix makes env vars client-visible.
// The /api/claude proxy in vite.config.js is dev-only.
const CLAUDE_API_URL = '/api/claude/v1/messages'

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

export async function generateEmailDraft(contact, outreachContext) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    // Demo mode: return a realistic mock draft
    await fakeDelay(400 + Math.random() * 800)
    return generateMockDraft(contact, outreachContext)
  }

  const userPrompt = `Contact:
- Name: ${contact.name}
- Role: ${contact.role}
- Company: ${contact.company}
- Email: ${contact.email}
${contact.notes ? `- Notes: ${contact.notes}` : ''}

Outreach context: ${outreachContext}

Write a personalized cold email for this contact.`

  const response = await fetch(CLAUDE_API_URL, {
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
    throw new Error('Email drafting service is temporarily unavailable. Please try again.')
  }

  const data = await response.json()
  const text = data?.content?.[0]?.text
  if (!text) {
    throw new Error('Received an unexpected response from the drafting service.')
  }

  try {
    const parsed = JSON.parse(text)
    if (typeof parsed.subject !== 'string' || typeof parsed.body !== 'string') {
      throw new Error('Invalid email draft format received.')
    }
    return { subject: parsed.subject, body: parsed.body }
  } catch {
    throw new Error('Failed to parse the email draft. Please try again.')
  }
}

export async function generateAllDrafts(contacts, outreachContext, onProgress) {
  const drafts = []

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i]
    if (onProgress) onProgress(i, contacts.length, contact.name)

    const draft = await generateEmailDraft(contact, outreachContext)
    drafts.push({
      id: crypto.randomUUID(),
      contact,
      subject: draft.subject,
      body: draft.body,
      status: 'draft',
    })
  }

  return drafts
}

// --- Demo / mock helpers ---

function fakeDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const OPENERS = [
  (c) => `Hi ${c.name},\n\nI've been following ${c.company}'s growth and really like the direction your team is heading`,
  (c) => `Hi ${c.name},\n\nI came across ${c.company} recently and was impressed by what you're building`,
  (c) => `Hi ${c.name},\n\nAs ${c.role} at ${c.company}, you're probably thinking a lot about scaling efficiently`,
]

const CLOSERS = [
  'Would you be open to a quick 15-minute chat this week? Happy to work around your schedule.',
  'I\'d love to share a few ideas — any chance you have 15 minutes this week?',
  'If this sounds relevant, I\'d enjoy a brief conversation. What does your availability look like?',
]

function generateMockDraft(contact, context) {
  const idx = hashString(contact.name) % OPENERS.length
  const closerIdx = hashString(contact.email) % CLOSERS.length

  return {
    subject: `Quick question about ${contact.company}'s ${contact.role.toLowerCase().includes('eng') ? 'engineering roadmap' : 'growth plans'}`,
    body: `${OPENERS[idx](contact)}.\n\n${context}\n\n${CLOSERS[closerIdx]}\n\nBest regards`,
  }
}

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}
