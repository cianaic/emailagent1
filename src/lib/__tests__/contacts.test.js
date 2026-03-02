import { describe, it, expect } from 'vitest'
import { searchContacts, getAllContacts } from '../contacts'

describe('contacts', () => {
  describe('getAllContacts', () => {
    it('returns all contacts from the data file', () => {
      const all = getAllContacts()
      expect(all.length).toBeGreaterThan(0)
      expect(all[0]).toHaveProperty('name')
      expect(all[0]).toHaveProperty('email')
      expect(all[0]).toHaveProperty('role')
      expect(all[0]).toHaveProperty('company')
      expect(all[0]).toHaveProperty('tags')
    })
  })

  describe('searchContacts', () => {
    it('returns empty array for empty query', () => {
      expect(searchContacts('')).toEqual([])
      expect(searchContacts('   ')).toEqual([])
      expect(searchContacts(null)).toEqual([])
      expect(searchContacts(undefined)).toEqual([])
    })

    it('ignores very short keywords (<=2 chars)', () => {
      // "an" is only 2 chars, should be filtered
      expect(searchContacts('an')).toEqual([])
    })

    it('finds contacts by name', () => {
      const all = getAllContacts()
      // Use the first contact's first name as a search
      const firstName = all[0].name.split(' ')[0]
      if (firstName.length > 2) {
        const results = searchContacts(firstName)
        expect(results.length).toBeGreaterThan(0)
        expect(results.some((c) => c.name.includes(firstName))).toBe(true)
      }
    })

    it('finds contacts by company', () => {
      const all = getAllContacts()
      const company = all[0].company
      if (company.length > 2) {
        const results = searchContacts(company)
        expect(results.length).toBeGreaterThan(0)
        expect(results.some((c) => c.company === company)).toBe(true)
      }
    })

    it('finds contacts by role', () => {
      const all = getAllContacts()
      const role = all[0].role.split(' ').find((w) => w.length > 2)
      if (role) {
        const results = searchContacts(role)
        expect(results.length).toBeGreaterThan(0)
      }
    })

    it('finds contacts by tags', () => {
      const all = getAllContacts()
      const tag = all[0].tags.find((t) => t.length > 2)
      if (tag) {
        const results = searchContacts(tag)
        expect(results.length).toBeGreaterThan(0)
      }
    })

    it('is case insensitive', () => {
      const all = getAllContacts()
      const name = all[0].name.split(' ')[0]
      if (name.length > 2) {
        const upper = searchContacts(name.toUpperCase())
        const lower = searchContacts(name.toLowerCase())
        expect(upper.length).toBe(lower.length)
      }
    })

    it('sorts results by relevance (more keyword matches first)', () => {
      const all = getAllContacts()
      // Search for a multi-word query that matches on multiple fields
      if (all.length > 0) {
        const c = all[0]
        const query = `${c.role} ${c.company}`
        const results = searchContacts(query)
        if (results.length > 1) {
          // The first result should be the contact that matches both terms
          expect(results[0].name).toBe(c.name)
        }
      }
    })

    it('returns contacts with at least one keyword hit', () => {
      const results = searchContacts('engineering startup healthcare')
      // All results should match at least one keyword
      for (const contact of results) {
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
        const hasMatch = ['engineering', 'startup', 'healthcare'].some((kw) =>
          searchable.includes(kw)
        )
        expect(hasMatch).toBe(true)
      }
    })
  })
})
