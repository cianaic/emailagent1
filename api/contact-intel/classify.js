const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

const CLASSIFICATION_PROMPT = `You are analyzing email conversations between a user and one of their contacts.
Based on the full transcript of their interactions, classify this contact.

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

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    who: { type: 'STRING' },
    relationshipType: {
      type: 'STRING',
      enum: ['colleague', 'client', 'vendor', 'investor', 'advisor', 'friend', 'family', 'recruiter', 'journalist', 'community', 'service_provider', 'government', 'unknown'],
    },
    group: { type: 'STRING' },
    subgroup: { type: 'STRING' },
    strength: { type: 'INTEGER' },
    sentiment: { type: 'STRING', enum: ['positive', 'neutral', 'mixed', 'negative'] },
    topics: { type: 'ARRAY', items: { type: 'STRING' } },
    context: { type: 'STRING' },
    peripheralTo: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['who', 'relationshipType', 'group', 'strength', 'sentiment', 'topics', 'context', 'peripheralTo'],
}

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

  // Gemini has 1M context — can be generous, but still cap at ~200K chars
  if (transcriptText.length > 200000) {
    transcriptText = transcriptText.slice(0, 200000) + '\n\n[... transcript truncated ...]'
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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const { contacts } = req.body
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'Missing contacts array' })
  }

  try {
    const CONCURRENCY = 5
    const classifications = []

    for (let i = 0; i < contacts.length; i += CONCURRENCY) {
      const batch = contacts.slice(i, i + CONCURRENCY)

      const results = await Promise.all(
        batch.map(async (contact) => {
          try {
            const userContent = buildContactPrompt(contact)

            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  { role: 'user', parts: [{ text: CLASSIFICATION_PROMPT + '\n\n' + userContent }] },
                ],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 1024,
                  responseMimeType: 'application/json',
                  responseSchema: RESPONSE_SCHEMA,
                },
              }),
            })

            if (!response.ok) {
              console.error(`Gemini API error for ${contact.email}:`, response.status)
              return { email: contact.email, classification: { ...DEFAULT_CLASSIFICATION } }
            }

            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

            let parsed
            try {
              parsed = JSON.parse(text)
            } catch {
              console.error(`Failed to parse Gemini response for ${contact.email}`)
              return { email: contact.email, classification: { ...DEFAULT_CLASSIFICATION } }
            }

            return {
              email: contact.email,
              classification: {
                ...DEFAULT_CLASSIFICATION,
                ...parsed,
                subgroup: parsed.subgroup || '',
                strength: Math.max(1, Math.min(10, Number(parsed.strength) || 1)),
                classifiedAt: new Date().toISOString(),
                model: 'gemini-2.5-flash-lite',
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
