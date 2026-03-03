import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateEmailDraft, generateAllDrafts } from '../claude'

const MOCK_CONTACT = {
  id: '1',
  name: 'Jane Smith',
  role: 'VP Engineering',
  company: 'TechCorp',
  email: 'jane@techcorp.com',
  location: 'San Francisco',
  tags: ['engineering', 'leadership'],
  bio: 'Leads the platform team at TechCorp.',
}

describe('claude', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateEmailDraft (successful API call)', () => {
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subject: 'Quick question about TechCorp',
            body: 'Hi Jane,\n\nI noticed TechCorp is growing fast.\n\nBest regards',
          }),
      })
    })

    it('returns a draft with subject and body', async () => {
      const draft = await generateEmailDraft(MOCK_CONTACT, 'partnership outreach')
      expect(draft).toHaveProperty('subject')
      expect(draft).toHaveProperty('body')
      expect(typeof draft.subject).toBe('string')
      expect(typeof draft.body).toBe('string')
    })

    it('calls /api/draft with correct payload', async () => {
      await generateEmailDraft(MOCK_CONTACT, 'test context')
      expect(fetch).toHaveBeenCalledWith('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: MOCK_CONTACT, outreachContext: 'test context' }),
      })
    })
  })

  describe('generateEmailDraft (API error handling)', () => {
    it('throws on non-ok response', async () => {
      fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Draft service unavailable' }),
      })

      await expect(
        generateEmailDraft(MOCK_CONTACT, 'test')
      ).rejects.toThrow('Draft service unavailable')
    })

    it('falls back to mock drafts on network error', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const draft = await generateEmailDraft(MOCK_CONTACT, 'test context')
      // Should fall back to mock drafts
      expect(draft).toHaveProperty('subject')
      expect(draft).toHaveProperty('body')
      expect(draft.body).toContain('Jane')
      expect(draft.body).toContain('TechCorp')
    })

    it('includes outreach context in mock fallback body', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const context = 'recruiting for senior roles'
      const draft = await generateEmailDraft(MOCK_CONTACT, context)
      expect(draft.body).toContain(context)
    })
  })

  describe('generateAllDrafts', () => {
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subject: 'Test Subject',
            body: 'Test Body',
          }),
      })
    })

    it('generates one draft per contact', async () => {
      const contacts = [
        MOCK_CONTACT,
        { ...MOCK_CONTACT, id: '2', name: 'Bob Lee', email: 'bob@co.com', company: 'BobCo' },
      ]
      const drafts = await generateAllDrafts(contacts, 'outreach')
      expect(drafts).toHaveLength(2)
      expect(drafts[0].contact.name).toBe('Jane Smith')
      expect(drafts[1].contact.name).toBe('Bob Lee')
    })

    it('each draft has required fields', async () => {
      const drafts = await generateAllDrafts([MOCK_CONTACT], 'test')
      const draft = drafts[0]
      expect(draft.id).toBeDefined()
      expect(draft.contact).toBe(MOCK_CONTACT)
      expect(typeof draft.subject).toBe('string')
      expect(typeof draft.body).toBe('string')
      expect(draft.status).toBe('draft')
    })

    it('calls onProgress for each contact', async () => {
      const contacts = [
        MOCK_CONTACT,
        { ...MOCK_CONTACT, id: '2', name: 'Bob', email: 'b@c.com', company: 'Co' },
      ]
      const onProgress = vi.fn()
      await generateAllDrafts(contacts, 'test', onProgress)
      expect(onProgress).toHaveBeenCalledTimes(2)
      expect(onProgress).toHaveBeenCalledWith(0, 2, 'Jane Smith')
      expect(onProgress).toHaveBeenCalledWith(1, 2, 'Bob')
    })
  })
})
