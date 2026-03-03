import seedContacts from '../data/contacts.json'

// In-memory contact store. Starts with seed data, can be replaced by CSV upload.
let contactsData = [...seedContacts]

/**
 * Search contacts by matching a query string against names, roles,
 * companies, locations, tags, and bios. Returns contacts sorted by
 * relevance (number of keyword hits).
 */
export function searchContacts(query) {
  if (!query || !query.trim()) return []

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2) // ignore very short words

  if (keywords.length === 0) return []

  const scored = contactsData
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

      const score = keywords.reduce((acc, kw) => {
        return acc + (searchable.includes(kw) ? 1 : 0)
      }, 0)

      return { contact, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.map(({ contact }) => contact)
}

export function getAllContacts() {
  return contactsData
}

export function getContactCount() {
  return contactsData.length
}

/**
 * Parse a CSV string into contacts. Expects headers like:
 * name, email, role/title, company, location, notes
 */
export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'full name')
  const emailIdx = headers.findIndex((h) => h === 'email' || h === 'email address')
  const roleIdx = headers.findIndex((h) => h === 'role' || h === 'title' || h === 'job title' || h === 'position')
  const companyIdx = headers.findIndex((h) => h === 'company' || h === 'organization' || h === 'org')
  const locationIdx = headers.findIndex((h) => h === 'location' || h === 'city')
  const notesIdx = headers.findIndex((h) => h === 'notes' || h === 'bio' || h === 'description')

  if (nameIdx === -1 || emailIdx === -1) {
    throw new Error('CSV must have "name" and "email" columns')
  }

  const contacts = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const name = cols[nameIdx]?.trim()
    const email = cols[emailIdx]?.trim()
    if (!name || !email) continue

    contacts.push({
      id: crypto.randomUUID(),
      name,
      email,
      role: cols[roleIdx]?.trim() || '',
      company: cols[companyIdx]?.trim() || '',
      location: locationIdx >= 0 ? cols[locationIdx]?.trim() || '' : '',
      bio: notesIdx >= 0 ? cols[notesIdx]?.trim() || '' : '',
      tags: [],
    })
  }

  return contacts
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/**
 * Replace the contact store with uploaded contacts.
 */
export function loadContacts(contacts) {
  contactsData = contacts
  return contacts.length
}

/**
 * Add contacts to the existing store (merge).
 */
export function addContacts(contacts) {
  contactsData = [...contactsData, ...contacts]
  return contactsData.length
}

/**
 * Reset to seed contacts.
 */
export function resetContacts() {
  contactsData = [...seedContacts]
  return contactsData.length
}
