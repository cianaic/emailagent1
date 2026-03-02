import { useState, useCallback, useEffect } from 'react'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import ChatSidebar from '../components/ChatSidebar'
import { loadChats, saveChats, createChat, deriveTitle } from '../lib/chatStore'
import { searchContacts } from '../lib/contacts'

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

      // Search contacts based on user input
      setTimeout(() => {
        const results = searchContacts(text)

        if (results.length > 0) {
          const contactsMsg = {
            id: crypto.randomUUID(),
            role: 'agent',
            type: 'contacts',
            content: `I found **${results.length} contact${results.length !== 1 ? 's' : ''}** matching your request. Review them below — you can remove anyone who isn't a good fit, then continue.`,
            contacts: results,
            confirmed: false,
            timestamp: Date.now(),
          }
          setChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== activeChatId) return chat
              return {
                ...chat,
                messages: [...chat.messages, contactsMsg],
                updatedAt: Date.now(),
              }
            })
          )
        } else {
          const agentMsg = {
            id: crypto.randomUUID(),
            role: 'agent',
            content: `I couldn't find any contacts matching **"${text}"**. Try searching by role, company, industry, or location — for example, "engineering leaders in San Francisco" or "healthcare startups".`,
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
        }

        setThinking(false)
      }, 600)
    },
    [activeChatId]
  )

  const handleContinueContacts = useCallback(
    (keptContacts) => {
      // Mark the contacts message as confirmed in the active chat
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== activeChatId) return chat
          return {
            ...chat,
            messages: chat.messages.map((msg) =>
              msg.type === 'contacts' && !msg.confirmed
                ? { ...msg, confirmed: true }
                : msg
            ),
            updatedAt: Date.now(),
          }
        })
      )

      // Agent acknowledges the selection
      const confirmMsg = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: `Great — continuing with **${keptContacts.length} contact${keptContacts.length !== 1 ? 's' : ''}**: ${keptContacts.map((c) => c.name).join(', ')}.\n\nI'll start drafting personalized emails for each of them.`,
        timestamp: Date.now(),
      }
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== activeChatId) return chat
          return {
            ...chat,
            messages: [...chat.messages, confirmMsg],
            updatedAt: Date.now(),
          }
        })
      )
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
        <MessageList
          messages={activeChat.messages}
          thinking={thinking}
          onContinueContacts={handleContinueContacts}
        />
        <ChatInput onSend={handleSend} disabled={thinking} />
      </div>
    </div>
  )
}

export default Chat
