import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  describe('generateEmailDraft (demo mode — no API key)', () => {
    it('returns a draft with subject and body', async () => {
      const draft = await generateEmailDraft(MOCK_CONTACT, 'partnership outreach')
      expect(draft).toHaveProperty('subject')
      expect(draft).toHaveProperty('body')
      expect(typeof draft.subject).toBe('string')
      expect(typeof draft.body).toBe('string')
      expect(draft.subject.length).toBeGreaterThan(0)
      expect(draft.body.length).toBeGreaterThan(0)
    })

    it('personalizes the draft with contact info', async () => {
      const draft = await generateEmailDraft(MOCK_CONTACT, 'test context')
      // The mock drafts should include the contact's name and company
      expect(draft.body).toContain('Jane')
      expect(draft.body).toContain('TechCorp')
    })

    it('includes outreach context in body', async () => {
      const context = 'recruiting for senior roles'
      const draft = await generateEmailDraft(MOCK_CONTACT, context)
      expect(draft.body).toContain(context)
    })

    it('generates deterministic drafts for same contact', async () => {
      const draft1 = await generateEmailDraft(MOCK_CONTACT, 'context')
      const draft2 = await generateEmailDraft(MOCK_CONTACT, 'context')
      expect(draft1.subject).toBe(draft2.subject)
      expect(draft1.body).toBe(draft2.body)
    })

    it('generates different drafts for different contacts', async () => {
      const contact2 = { ...MOCK_CONTACT, name: 'Bob Jones', email: 'bob@other.com', company: 'OtherCo' }
      const draft1 = await generateEmailDraft(MOCK_CONTACT, 'context')
      const draft2 = await generateEmailDraft(contact2, 'context')
      expect(draft1.body).not.toBe(draft2.body)
    })
  })

  describe('generateAllDrafts', () => {
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

  describe('generateEmailDraft (API mode)', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn())
    })

    it('throws user-friendly error on API failure', async () => {
      // Temporarily set the env var
      vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'test-key')
      fetch.mockResolvedValue({ ok: false, status: 500 })

      await expect(
        generateEmailDraft(MOCK_CONTACT, 'test')
      ).rejects.toThrow('Email drafting service is temporarily unavailable')

      vi.unstubAllEnvs()
    })

    it('throws on malformed API response', async () => {
      vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'test-key')
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'not json' }] }),
      })

      await expect(
        generateEmailDraft(MOCK_CONTACT, 'test')
      ).rejects.toThrow('Failed to parse the email draft')

      vi.unstubAllEnvs()
    })

    it('throws on missing content in response', async () => {
      vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'test-key')
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [] }),
      })

      await expect(
        generateEmailDraft(MOCK_CONTACT, 'test')
      ).rejects.toThrow('Received an unexpected response')

      vi.unstubAllEnvs()
    })

    it('returns parsed draft on valid API response', async () => {
      vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'test-key')
      fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [
              {
                text: JSON.stringify({
                  subject: 'Test Subject',
                  body: 'Test Body',
                }),
              },
            ],
          }),
      })

      const draft = await generateEmailDraft(MOCK_CONTACT, 'test')
      expect(draft).toEqual({ subject: 'Test Subject', body: 'Test Body' })

      vi.unstubAllEnvs()
    })

    it('rejects drafts missing subject or body', async () => {
      vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'test-key')
      fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ text: JSON.stringify({ subject: 'Only subject' }) }],
          }),
      })

      await expect(
        generateEmailDraft(MOCK_CONTACT, 'test')
      ).rejects.toThrow('Failed to parse the email draft')

      vi.unstubAllEnvs()
    })
  })
})
