import { useState, useCallback } from 'react'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import { searchContacts } from '../lib/contacts'

function Chat() {
  const [messages, setMessages] = useState([])

  const handleSend = useCallback((text) => {
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMsg])

    // Simulate agent searching for contacts
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
        setMessages((prev) => [...prev, contactsMsg])
      } else {
        const agentMsg = {
          id: crypto.randomUUID(),
          role: 'agent',
          content: `I couldn't find any contacts matching **"${text}"**. Try searching by role, company, industry, or location — for example, "engineering leaders in San Francisco" or "healthcare startups".`,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, agentMsg])
      }
    }, 600)
  }, [])

  const handleContinueContacts = useCallback((keptContacts) => {
    // Mark the contacts message as confirmed
    setMessages((prev) =>
      prev.map((msg) =>
        msg.type === 'contacts' && !msg.confirmed
          ? { ...msg, confirmed: true }
          : msg
      )
    )

    // Agent acknowledges the selection
    const confirmMsg = {
      id: crypto.randomUUID(),
      role: 'agent',
      content: `Great — continuing with **${keptContacts.length} contact${keptContacts.length !== 1 ? 's' : ''}**: ${keptContacts.map((c) => c.name).join(', ')}.\n\nI'll start drafting personalized emails for each of them.`,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, confirmMsg])
  }, [])

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-semibold text-text">Email Agent</h1>
        </div>
      </header>
      <MessageList
        messages={messages}
        onContinueContacts={handleContinueContacts}
      />
      <ChatInput onSend={handleSend} />
    </div>
  )
}

export default Chat
