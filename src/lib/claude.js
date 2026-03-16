// Calls the server-side /api/chat endpoint for conversational AI.
// Falls back to a simple local response if the API is unavailable.

export async function sendChatMessage(messages) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Chat service unavailable')
    }

    return await response.json()
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
      console.warn('Chat API unavailable, using fallback response')
      return {
        text: "I'm your Email Agent assistant. I can help you find contacts and draft personalized emails. Try asking me to find contacts by role, company, or industry — for example, \"find marketing managers\" or \"who works at Acme Corp?\"",
        toolUse: null,
      }
    }
    throw err
  }
}

// Calls the server-side /api/draft endpoint which securely holds the API key.
// Falls back to client-side mock drafts if the API is unavailable.

export async function generateEmailDraft(contact, outreachContext) {
  try {
    const response = await fetch('/api/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, outreachContext }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Draft service unavailable')
    }

    return await response.json()
  } catch (err) {
    // If /api/draft is not available (e.g. local dev without Vercel), fall back to mock
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
      console.warn('API route unavailable, using mock drafts')
      await fakeDelay(400 + Math.random() * 800)
      return generateMockDraft(contact, outreachContext)
    }
    throw err
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

// Calls the server-side /api/screenshot endpoint for screenshot analysis.
// Returns { cards: { emails: [...], calendar: [...] }, summary: "..." }

export async function analyzeScreenshot(image, text, contacts) {
  try {
    const response = await fetch('/api/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, text, contacts }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || 'Screenshot analysis unavailable')
    }

    return await response.json()
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
      console.warn('Screenshot API unavailable')
      return {
        cards: { emails: [], calendar: [] },
        summary: 'Screenshot analysis is currently unavailable. Please try again.',
      }
    }
    throw err
  }
}

// --- Fallback mock helpers (used when API is unreachable) ---

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
