const STORAGE_KEY = 'email-agent-chats'

export function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Validate each chat has the expected shape
    return parsed.filter(
      (c) =>
        c && typeof c.id === 'string' && Array.isArray(c.messages)
    )
  } catch {
    return []
  }
}

export function saveChats(chats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats))
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function createChat() {
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function deriveTitle(messages) {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New chat'
  const text = first.content.trim()
  return text.length > 40 ? text.slice(0, 40) + '...' : text
}
