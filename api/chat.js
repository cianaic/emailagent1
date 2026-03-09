const SYSTEM_PROMPT = `You are an AI email outreach assistant called Email Agent. You help users find contacts, draft personalized emails, and strategize their outreach.

Your capabilities:
- Have natural conversations about email strategy, outreach best practices, etc.
- Search for contacts when the user wants to find people to email
- Help draft and refine personalized emails
- Access deep relationship intelligence about the user's contact network

The user's contacts may include rich intelligence data from their Gmail history:
- Classification: who each contact is (colleague, client, investor, friend, etc.)
- Group/subgroup membership (e.g., "Acme Corp / Engineering Team")
- Relationship strength (1-10) and sentiment
- Key topics discussed and contextual notes
- Interaction history (email count, recency, who initiates)

When referencing contacts, leverage this intelligence. For example:
- "Sarah is your strongest contact at Acme Corp — you've exchanged 47 emails and she always responds quickly."
- "You have 3 investors in your network. Your strongest relationship is with Jordan (strength 9/10)."
- "Based on your conversation history, Marcus cares most about PLG strategies."

When a user wants to find contacts to email, use the search_contacts tool. Search terms can include relationship types (e.g. "clients", "investors"), group names, topics, or traditional fields like role and company.

When the user is just chatting, greeting you, or asking questions, respond conversationally. Keep responses concise and helpful.`

const TOOLS = [
  {
    name: 'search_contacts',
    description:
      'Search for contacts by any criteria: role, company, industry, location, relationship type (colleague/client/investor/friend/etc.), group name, topics discussed, or keywords from their context. Returns contacts with full relationship intelligence when available.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search terms to find matching contacts (e.g. role, company, industry, relationship type like "clients" or "investors", group name, topic, location)',
        },
      },
      required: ['query'],
    },
  },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const { messages } = req.body
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid messages array' })
  }

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
        tools: TOOLS,
        messages,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Claude API error:', response.status, errText)
      return res.status(502).json({ error: 'Chat service unavailable' })
    }

    const data = await response.json()
    const content = data?.content || []

    // Extract text blocks and tool_use blocks
    const textParts = content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
    const toolUse = content.find((block) => block.type === 'tool_use')

    const result = { text: textParts.join('\n') || null }

    if (toolUse) {
      result.toolUse = {
        id: toolUse.id,
        name: toolUse.name,
        input: toolUse.input,
      }
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Chat error:', err)
    return res.status(500).json({ error: 'Failed to process chat message' })
  }
}
