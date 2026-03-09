const NOTION_API_URL = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

function notionHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

async function findOrCreateDatabase(apiKey, parentPageId) {
  // Search for existing "Contact Intelligence" database
  const searchRes = await fetch(`${NOTION_API_URL}/search`, {
    method: 'POST',
    headers: notionHeaders(apiKey),
    body: JSON.stringify({
      query: 'Contact Intelligence',
      filter: { property: 'object', value: 'database' },
    }),
  })

  if (searchRes.ok) {
    const searchData = await searchRes.json()
    const existing = searchData.results?.find(
      (db) =>
        db.title?.[0]?.plain_text === 'Contact Intelligence' && !db.archived
    )
    if (existing) return existing.id
  }

  // Create new database
  const createRes = await fetch(`${NOTION_API_URL}/databases`, {
    method: 'POST',
    headers: notionHeaders(apiKey),
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'Contact Intelligence' } }],
      properties: {
        Name: { title: {} },
        Email: { email: {} },
        Company: { rich_text: {} },
        Who: { rich_text: {} },
        'Relationship Type': {
          select: {
            options: [
              { name: 'colleague', color: 'blue' },
              { name: 'client', color: 'green' },
              { name: 'vendor', color: 'orange' },
              { name: 'investor', color: 'purple' },
              { name: 'advisor', color: 'pink' },
              { name: 'friend', color: 'yellow' },
              { name: 'family', color: 'red' },
              { name: 'recruiter', color: 'gray' },
              { name: 'journalist', color: 'brown' },
              { name: 'community', color: 'default' },
              { name: 'service_provider', color: 'orange' },
              { name: 'government', color: 'gray' },
              { name: 'unknown', color: 'default' },
            ],
          },
        },
        Group: { select: {} },
        Subgroup: { rich_text: {} },
        Strength: { number: {} },
        Sentiment: {
          select: {
            options: [
              { name: 'positive', color: 'green' },
              { name: 'neutral', color: 'default' },
              { name: 'mixed', color: 'yellow' },
              { name: 'negative', color: 'red' },
            ],
          },
        },
        Topics: { multi_select: {} },
        Context: { rich_text: {} },
        'Total Emails': { number: {} },
        'Last Interaction': { date: {} },
        'Is Bridge': { checkbox: {} },
        'Is Peripheral': { checkbox: {} },
        Source: { select: {} },
      },
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Failed to create Notion database: ${err}`)
  }

  const createData = await createRes.json()
  return createData.id
}

function contactToNotionProperties(contact) {
  const c = contact.classification || {}
  const i = contact.interaction || {}
  const g = contact.graphPosition || {}

  const props = {
    Name: { title: [{ text: { content: contact.name || contact.email } }] },
    Email: { email: contact.email },
    Company: { rich_text: [{ text: { content: contact.company || '' } }] },
    Who: { rich_text: [{ text: { content: (c.who || '').slice(0, 2000) } }] },
    Strength: { number: c.strength || 0 },
    'Total Emails': { number: (i.sentByUser || 0) + (i.receivedByUser || 0) },
    'Is Bridge': { checkbox: !!g.isBridge },
    'Is Peripheral': { checkbox: !!g.isPeripheral },
  }

  if (c.relationshipType) {
    props['Relationship Type'] = { select: { name: c.relationshipType } }
  }
  if (c.group) {
    props.Group = { select: { name: c.group } }
  }
  if (c.subgroup) {
    props.Subgroup = { rich_text: [{ text: { content: c.subgroup } }] }
  }
  if (c.sentiment) {
    props.Sentiment = { select: { name: c.sentiment } }
  }
  if (c.topics?.length > 0) {
    props.Topics = { multi_select: c.topics.map((t) => ({ name: t.slice(0, 100) })) }
  }
  if (c.context) {
    props.Context = { rich_text: [{ text: { content: c.context.slice(0, 2000) } }] }
  }
  if (i.lastInteraction) {
    props['Last Interaction'] = { date: { start: i.lastInteraction.split('T')[0] } }
  }
  if (contact.source) {
    props.Source = { select: { name: contact.source } }
  }

  return props
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.NOTION_API_KEY
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID
  if (!apiKey || !parentPageId) {
    return res.status(500).json({ error: 'Notion API key or parent page ID not configured' })
  }

  const { contacts } = req.body
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'Missing contacts array' })
  }

  try {
    const databaseId = await findOrCreateDatabase(apiKey, parentPageId)

    let created = 0
    let updated = 0

    // Process contacts with rate limiting (3 req/sec for Notion)
    for (const contact of contacts) {
      // Search for existing page by email
      const searchRes = await fetch(`${NOTION_API_URL}/databases/${databaseId}/query`, {
        method: 'POST',
        headers: notionHeaders(apiKey),
        body: JSON.stringify({
          filter: {
            property: 'Email',
            email: { equals: contact.email },
          },
          page_size: 1,
        }),
      })

      const properties = contactToNotionProperties(contact)

      if (searchRes.ok) {
        const searchData = await searchRes.json()
        const existingPage = searchData.results?.[0]

        if (existingPage) {
          // Update existing page
          await fetch(`${NOTION_API_URL}/pages/${existingPage.id}`, {
            method: 'PATCH',
            headers: notionHeaders(apiKey),
            body: JSON.stringify({ properties }),
          })
          contact.notionPageId = existingPage.id
          updated++
        } else {
          // Create new page
          const createRes = await fetch(`${NOTION_API_URL}/pages`, {
            method: 'POST',
            headers: notionHeaders(apiKey),
            body: JSON.stringify({
              parent: { database_id: databaseId },
              properties,
            }),
          })
          if (createRes.ok) {
            const page = await createRes.json()
            contact.notionPageId = page.id
            created++
          }
        }
      }

      // Rate limiting: ~300ms between requests to stay under 3/sec
      await new Promise((r) => setTimeout(r, 350))
    }

    return res.status(200).json({
      synced: created + updated,
      created,
      updated,
      databaseId,
    })
  } catch (err) {
    console.error('Notion sync error:', err.message)
    return res.status(500).json({ error: 'Failed to sync to Notion' })
  }
}
