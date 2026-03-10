import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey)
}

async function getUserFromToken(supabase, accessToken) {
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data?.user) return null
  return data.user
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }
  const accessToken = authHeader.slice(7)

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const user = await getUserFromToken(supabase, accessToken)
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { contacts, groups, scanMetadata } = req.body
  if (!contacts || !Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Missing contacts array' })
  }

  try {
    // Upsert contacts in batches of 50
    let savedContacts = 0
    const BATCH_SIZE = 50

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE).map((c) => ({
        user_id: user.id,
        email: c.email,
        name: c.name || null,
        company: c.company || null,
        relationship_type: c.classification?.relationshipType || null,
        group_name: c.classification?.group || null,
        subgroup_name: c.classification?.subgroup || null,
        strength: c.classification?.strength || null,
        sentiment: c.classification?.sentiment || null,
        classification: c.classification || null,
        interaction: c.interaction || null,
        graph_position: c.graphPosition || null,
        source: c.source || 'gmail-scan',
        updated_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('contacts')
        .upsert(batch, { onConflict: 'user_id,email' })

      if (error) {
        console.error('Contact upsert error:', error.message)
      } else {
        savedContacts += batch.length
      }
    }

    // Upsert groups if provided
    let savedGroups = 0
    if (groups && Array.isArray(groups)) {
      for (const group of groups) {
        const { error } = await supabase
          .from('contact_groups')
          .upsert({
            user_id: user.id,
            name: group.name,
            type: group.type || null,
            contact_count: group.contactCount || 0,
          }, { onConflict: 'user_id,name' })

        if (!error) savedGroups++
      }
    }

    // Update scan metadata
    if (scanMetadata) {
      await supabase
        .from('scan_metadata')
        .upsert({
          user_id: user.id,
          last_scan_at: new Date().toISOString(),
          contacts_found: scanMetadata.contactsFound || contacts.length,
          emails_processed: scanMetadata.emailsProcessed || 0,
          scan_status: 'done',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
    }

    return res.status(200).json({
      saved: savedContacts,
      groups: savedGroups,
    })
  } catch (err) {
    console.error('Save error:', err.message)
    return res.status(500).json({ error: 'Failed to save contacts' })
  }
}
