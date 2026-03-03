import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadChats, saveChats, createChat, deriveTitle } from '../chatStore'

describe('chatStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('createChat', () => {
    it('returns a chat with required fields', () => {
      const chat = createChat()
      expect(chat.id).toBeDefined()
      expect(typeof chat.id).toBe('string')
      expect(chat.title).toBe('New chat')
      expect(chat.messages).toEqual([])
      expect(chat.createdAt).toBeTypeOf('number')
      expect(chat.updatedAt).toBeTypeOf('number')
    })

    it('generates unique ids', () => {
      const a = createChat()
      const b = createChat()
      expect(a.id).not.toBe(b.id)
    })
  })

  describe('saveChats / loadChats roundtrip', () => {
    it('persists and retrieves chats', () => {
      const chats = [createChat(), createChat()]
      saveChats(chats)
      const loaded = loadChats()
      expect(loaded).toHaveLength(2)
      expect(loaded[0].id).toBe(chats[0].id)
      expect(loaded[1].id).toBe(chats[1].id)
    })

    it('returns empty array when nothing saved', () => {
      expect(loadChats()).toEqual([])
    })
  })

  describe('loadChats validation', () => {
    it('returns empty array for non-array data', () => {
      localStorage.setItem('email-agent-chats', JSON.stringify({ not: 'array' }))
      expect(loadChats()).toEqual([])
    })

    it('returns empty array for invalid JSON', () => {
      localStorage.setItem('email-agent-chats', 'not-json!!!')
      expect(loadChats()).toEqual([])
    })

    it('filters out malformed chat objects', () => {
      const data = [
        { id: 'valid-1', messages: [], title: 'Good' },
        { noId: true, messages: [] },
        null,
        { id: 'valid-2', messages: [], title: 'Also good' },
        { id: 123, messages: [] }, // id not a string
      ]
      localStorage.setItem('email-agent-chats', JSON.stringify(data))
      const loaded = loadChats()
      expect(loaded).toHaveLength(2)
      expect(loaded[0].id).toBe('valid-1')
      expect(loaded[1].id).toBe('valid-2')
    })

    it('filters out chats with non-array messages', () => {
      const data = [
        { id: 'a', messages: 'not-array' },
        { id: 'b', messages: [] },
      ]
      localStorage.setItem('email-agent-chats', JSON.stringify(data))
      const loaded = loadChats()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].id).toBe('b')
    })
  })

  describe('saveChats error handling', () => {
    it('does not throw when localStorage is unavailable', () => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = () => {
        throw new Error('QuotaExceededError')
      }
      expect(() => saveChats([createChat()])).not.toThrow()
      Storage.prototype.setItem = original
    })
  })

  describe('deriveTitle', () => {
    it('returns "New chat" when no user messages', () => {
      expect(deriveTitle([])).toBe('New chat')
      expect(deriveTitle([{ role: 'agent', content: 'hello' }])).toBe('New chat')
    })

    it('uses first user message as title', () => {
      const messages = [
        { role: 'user', content: 'Find startup founders' },
        { role: 'agent', content: 'Sure' },
      ]
      expect(deriveTitle(messages)).toBe('Find startup founders')
    })

    it('truncates long messages to 40 chars with ellipsis', () => {
      const messages = [
        { role: 'user', content: 'A'.repeat(50) },
      ]
      const title = deriveTitle(messages)
      expect(title).toBe('A'.repeat(40) + '...')
      expect(title.length).toBe(43)
    })

    it('trims whitespace from message', () => {
      const messages = [{ role: 'user', content: '  hello  ' }]
      expect(deriveTitle(messages)).toBe('hello')
    })
  })
})
