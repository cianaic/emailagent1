const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

const CLASSIFICATION_PROMPT = `You are analyzing email conversations between a user and one of their contacts.
Based on the full transcript of their interactions, classify this contact.

Respond with valid JSON only, no markdown fencing, no extra text.

Required JSON schema:
{
  "who": "Brief description of who this person is to the user (1-2 sentences)",
  "relationshipType": "one of: colleague | client | vendor | investor | advisor | friend | family | recruiter | journalist | community | service_provider | government | unknown",
  "group": "Primary group they belong to (e.g., 'Acme Corp team', 'YC W24 batch', 'Stanford network', 'Family')",
  "subgroup": "More specific subgroup if applicable (e.g., 'Engineering team', 'Board members', 'College friends'), or empty string",
  "strength": "number 1-10 based on depth and frequency of interaction",
  "sentiment": "positive | neutral | mixed | negative",
  "topics": ["up to 5 key topics discussed"],
  "context": "One paragraph of useful context for future outreach — what matters to this person, communication style, last discussed topics",
  "peripheralTo": ["names of groups this person is adjacent to but not a member of, if any — empty array if none"]
}`

function buildContactPrompt(contact) {
  const { name, email, interaction, transcript } = contact

  let transcriptText = ''
  if (transcript?.threads) {
    for (const thread of transcript.threads) {
      transcriptText += `\n--- Thread: ${thread.subject} ---\n`
      for (const msg of thread.messages) {
        transcriptText += `[${msg.date}] ${msg.from}:\n${msg.snippet}\n\n`
      }
    }
  }

  // Truncate transcript to ~30K words (~40K tokens)
  if (transcriptText.length > 120000) {
    transcriptText = transcriptText.slice(0, 120000) + '\n\n[... transcript truncated ...]'
  }

  const interactionSummary = interaction
    ? `Total emails: ${interaction.totalEmails} | Sent by user: ${interaction.sentByUser} | Received: ${interaction.receivedByUser} | Threads: ${interaction.threadCount} | First: ${interaction.firstInteraction} | Last: ${interaction.lastInteraction}`
    : 'No interaction data available'

  return `Contact: ${name || 'Unknown'} <${email}>
${interactionSummary}

--- TRANSCRIPT ---
${transcriptText || 'No transcript available — classify based on metadata only.'}
--- END TRANSCRIPT ---`
}

function parseClassification(text) {
  // Try to parse JSON directly
  try {
    return JSON.parse(text)
  } catch {
    // Try to extract JSON from markdown fencing
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch {
        // fall through
      }
    }
    // Try to find JSON object in text
    const braceMatch = text.match(/\{[\s\S]*\}/)
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0])
      } catch {
        // fall through
      }
    }
  }
  return null
}

const DEFAULT_CLASSIFICATION = {
  who: 'Unknown contact',
  relationshipType: 'unknown',
  group: 'Uncategorized',
  subgroup: '',
  strength: 1,
  sentiment: 'neutral',
  topics: [],
  context: '',
  peripheralTo: [],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' })
  }

  const { contacts } = req.body
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'Missing contacts array' })
  }

  try {
    // Process contacts in parallel (up to 5 concurrent)
    const CONCURRENCY = 5
    const classifications = []

    for (let i = 0; i < contacts.length; i += CONCURRENCY) {
      const batch = contacts.slice(i, i + CONCURRENCY)

      const results = await Promise.all(
        batch.map(async (contact) => {
          try {
            const userContent = buildContactPrompt(contact)

            const response = await fetch(GROQ_API_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: MODEL,
                messages: [
                  { role: 'system', content: CLASSIFICATION_PROMPT },
                  { role: 'user', content: userContent },
                ],
                temperature: 0.1,
                max_tokens: 1024,
                response_format: { type: 'json_object' },
              }),
            })

            if (!response.ok) {
              console.error(`Groq API error for ${contact.email}:`, response.status)
              return { email: contact.email, classification: { ...DEFAULT_CLASSIFICATION } }
            }

            const data = await response.json()
            const text = data.choices?.[0]?.message?.content || ''
            const parsed = parseClassification(text)

            if (!parsed) {
              console.error(`Failed to parse classification for ${contact.email}`)
              return { email: contact.email, classification: { ...DEFAULT_CLASSIFICATION } }
            }

            return {
              email: contact.email,
              classification: {
                ...DEFAULT_CLASSIFICATION,
                ...parsed,
                strength: Math.max(1, Math.min(10, Number(parsed.strength) || 1)),
                classifiedAt: new Date().toISOString(),
                model: MODEL,
              },
            }
          } catch (err) {
            console.error(`Classification error for ${contact.email}:`, err.message)
            return { email: contact.email, classification: { ...DEFAULT_CLASSIFICATION } }
          }
        })
      )

      classifications.push(...results)
    }

    return res.status(200).json({ classifications })
  } catch (err) {
    console.error('Classification error:', err.message)
    return res.status(500).json({ error: 'Failed to classify contacts' })
  }
}
