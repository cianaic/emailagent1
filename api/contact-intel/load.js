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
  if (req.method !== 'GET') {
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

  try {
    // Fetch contacts, groups, and scan metadata in parallel
    const [contactsRes, groupsRes, scanRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('strength', { ascending: false, nullsFirst: false }),
      supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('contact_count', { ascending: false }),
      supabase
        .from('scan_metadata')
        .select('*')
        .eq('user_id', user.id)
        .single(),
    ])

    // Transform DB rows back to frontend contact shape
    const contacts = (contactsRes.data || []).map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name || '',
      company: row.company || '',
      classification: row.classification || null,
      interaction: row.interaction || null,
      graphPosition: row.graph_position || null,
      source: row.source || 'gmail-scan',
    }))

    const groups = (groupsRes.data || []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      contactCount: row.contact_count,
    }))

    const scanMetadata = scanRes.data || null

    return res.status(200).json({
      contacts,
      groups,
      scanMetadata,
    })
  } catch (err) {
    console.error('Load error:', err.message)
    return res.status(500).json({ error: 'Failed to load contacts' })
  }
}
