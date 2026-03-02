import { useState, useCallback, useEffect } from 'react'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import ChatSidebar from '../components/ChatSidebar'
import ThinkingIndicator from '../components/ThinkingIndicator'
import { loadChats, saveChats, createChat, deriveTitle } from '../lib/chatStore'

function Chat() {
  const [chats, setChats] = useState(() => {
    const saved = loadChats()
    if (saved.length > 0) return saved
    return [createChat()]
  })
  const [activeChatId, setActiveChatId] = useState(() => {
    const saved = loadChats()
    return saved.length > 0 ? saved[0].id : chats[0].id
  })
  const [thinking, setThinking] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Persist chats to LocalStorage whenever they change
  useEffect(() => {
    saveChats(chats)
  }, [chats])

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0]

  const handleSend = useCallback(
    (text) => {
      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      }

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== activeChatId) return chat
          const updated = {
            ...chat,
            messages: [...chat.messages, userMsg],
            updatedAt: Date.now(),
          }
          updated.title = deriveTitle(updated.messages)
          return updated
        })
      )

      setThinking(true)

      // Mock agent reply (to be replaced with real AI in Sprint 4)
      setTimeout(() => {
        const agentMsg = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: `Got it! You said: **"${text}"**\n\nI'll help you with that once I'm fully connected.`,
          timestamp: Date.now(),
        }
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== activeChatId) return chat
            return {
              ...chat,
              messages: [...chat.messages, agentMsg],
              updatedAt: Date.now(),
            }
          })
        )
        setThinking(false)
      }, 600)
    },
    [activeChatId]
  )

  const handleNewChat = useCallback(() => {
    const chat = createChat()
    setChats((prev) => [chat, ...prev])
    setActiveChatId(chat.id)
  }, [])

  const handleSelectChat = useCallback((id) => {
    setActiveChatId(id)
  }, [])

  const handleDeleteChat = useCallback(
    (id) => {
      setChats((prev) => {
        const filtered = prev.filter((c) => c.id !== id)
        if (filtered.length === 0) {
          const fresh = createChat()
          setActiveChatId(fresh.id)
          return [fresh]
        }
        if (id === activeChatId) {
          setActiveChatId(filtered[0].id)
        }
        return filtered
      })
    },
    [activeChatId]
  )

  return (
    <div className="flex h-screen">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-white px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded p-1 text-text-muted hover:bg-cream md:hidden"
              aria-label="Open sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-text">Email Agent</h1>
          </div>
        </header>
        <MessageList messages={activeChat.messages} thinking={thinking} />
        <ChatInput onSend={handleSend} disabled={thinking} />
      </div>
    </div>
  )
}

export default Chat
