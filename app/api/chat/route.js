import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are an AI email outreach assistant called Email Agent. You help users find contacts, draft personalized emails, and strategize their outreach.

Your capabilities:
- Have natural conversations about email strategy, outreach best practices, etc.
- Search for contacts when the user wants to find people to email
- Help draft and refine personalized emails

When a user wants to find contacts to email (e.g. "find marketing managers", "who can I reach out to at Acme Corp", "I need to email engineers"), use the search_contacts tool with relevant search terms.

When the user is just chatting, greeting you, or asking questions, respond conversationally. Keep responses concise and helpful.`

const TOOLS = [
  {
    name: 'search_contacts',
    description:
      'Search for contacts by role, company, industry, location, or other criteria. Use this when the user wants to find people to reach out to via email.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search terms to find matching contacts (e.g. role, company, industry, location)',
        },
      },
      required: ['query'],
    },
  },
]

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

  const { messages } = body
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Missing or invalid messages array' }, { status: 400 })
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
      return NextResponse.json({ error: 'Chat service unavailable' }, { status: 502 })
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

    return NextResponse.json(result)
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 })
  }
}
