import contactsData from '../data/contacts.json'

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
        contact.location,
        contact.bio,
        ...contact.tags,
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
