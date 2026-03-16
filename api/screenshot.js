const SYSTEM_PROMPT = `You are a screenshot analysis agent. The user has taken a screenshot and wants you to determine what actions to take.

Analyze the screenshot carefully and extract all relevant information. Based on what you see, create email cards and/or calendar event cards for the user to review.

You have access to the following tools:
- create_email_card: Create an email draft card. Use when you see email-related content (reply needed, follow-up, introduction, etc.)
- create_calendar_card: Create a calendar event card. Use when you see meeting invites, schedules, deadlines, events, etc.
- search_contacts: Search the user's contacts by name, role, company, or other criteria. Use to find email addresses for people mentioned in the screenshot.

Guidelines:
- Extract specific details: names, email addresses, dates, times, locations, subjects
- If you see multiple action items, create multiple cards
- For emails: write a complete, ready-to-send draft (not a template)
- For calendar events: include all available details (title, date, time, duration, location, attendees)
- If you see a person's name but no email, try search_contacts to find their email
- Use the user's additional context (if provided) to guide your actions
- When you're done creating all cards, respond with a brief summary of what you created`

const TOOLS = [
  {
    name: 'create_email_card',
    description: 'Create an email draft card for the user to review and send. Call this once per email you want to create.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        to_name: { type: 'string', description: 'Recipient name (for display)' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Full email body text, ready to send' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'create_calendar_card',
    description: 'Create a calendar event card for the user to review and create. Call this once per event.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        date: { type: 'string', description: 'Event date in YYYY-MM-DD format' },
        startTime: { type: 'string', description: 'Start time in HH:MM format (24h)' },
        endTime: { type: 'string', description: 'End time in HH:MM format (24h)' },
        location: { type: 'string', description: 'Event location (optional)' },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of attendee email addresses',
        },
        description: { type: 'string', description: 'Event description or notes' },
      },
      required: ['title', 'date', 'startTime', 'endTime'],
    },
  },
  {
    name: 'search_contacts',
    description: 'Search the user\'s contacts by name, role, company, or other criteria. Returns matching contacts with their email addresses.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms (name, role, company, etc.)' },
      },
      required: ['query'],
    },
  },
]

// Simple in-memory contact search (mirrors src/lib/contacts.js logic)
// Contacts are passed from the client in the request body
function searchContactsLocal(contacts, query) {
  if (!query || !query.trim() || !contacts?.length) return []

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)

  if (keywords.length === 0) return []

  return contacts
    .map((contact) => {
      const searchable = [
        contact.name,
        contact.role,
        contact.company,
        contact.location || '',
        contact.bio || '',
        ...(contact.tags || []),
      ]
        .join(' ')
        .toLowerCase()

      const score = keywords.reduce((acc, kw) => acc + (searchable.includes(kw) ? 1 : 0), 0)
      return { contact, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ contact }) => contact)
}

const MAX_ITERATIONS = 10

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const { image, text, contacts } = req.body
  if (!image) {
    return res.status(400).json({ error: 'Missing image' })
  }

  // Parse the data URL
  const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (!match) {
    return res.status(400).json({ error: 'Invalid image format. Expected base64 data URL.' })
  }
  const mediaType = match[1]
  const base64Data = match[2]

  // Build initial message with image
  const userContent = [
    {
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64Data },
    },
    {
      type: 'text',
      text: text || 'Analyze this screenshot and create the appropriate action cards (emails, calendar events).',
    },
  ]

  const messages = [{ role: 'user', content: userContent }]
  const cards = { emails: [], calendar: [] }

  try {
    // Agentic loop: keep calling Claude until it stops using tools
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('Claude API error:', response.status, errText)
        return res.status(502).json({ error: 'Screenshot analysis service unavailable' })
      }

      const data = await response.json()
      const content = data?.content || []
      const stopReason = data?.stop_reason

      // Process tool calls and collect cards
      const toolResults = []

      for (const block of content) {
        if (block.type === 'tool_use') {
          if (block.name === 'create_email_card') {
            cards.emails.push({
              id: `email-${cards.emails.length + 1}`,
              ...block.input,
            })
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Email card created for ${block.input.to}`,
            })
          } else if (block.name === 'create_calendar_card') {
            cards.calendar.push({
              id: `cal-${cards.calendar.length + 1}`,
              ...block.input,
            })
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Calendar event card created: ${block.input.title}`,
            })
          } else if (block.name === 'search_contacts') {
            const results = searchContactsLocal(contacts || [], block.input.query)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: results.length > 0
                ? JSON.stringify(results.map((c) => ({ name: c.name, email: c.email, role: c.role, company: c.company })))
                : `No contacts found matching "${block.input.query}"`,
            })
          }
        }
      }

      // If no tool use or stop_reason is end_turn, we're done
      if (stopReason === 'end_turn' || toolResults.length === 0) {
        // Extract final summary text
        const summary = content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n')

        return res.status(200).json({
          cards,
          summary: summary || `Created ${cards.emails.length} email(s) and ${cards.calendar.length} calendar event(s).`,
        })
      }

      // Continue the loop: add assistant response + tool results
      messages.push({ role: 'assistant', content })
      messages.push({ role: 'user', content: toolResults })
    }

    // If we hit max iterations, return what we have
    return res.status(200).json({
      cards,
      summary: `Created ${cards.emails.length} email(s) and ${cards.calendar.length} calendar event(s).`,
    })
  } catch (err) {
    console.error('Screenshot analysis error:', err)
    return res.status(500).json({ error: 'Failed to analyze screenshot' })
  }
}
