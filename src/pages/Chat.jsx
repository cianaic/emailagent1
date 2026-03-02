import { useState, useCallback } from 'react'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'

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

    // Mock agent reply for now (Sprint 1: prove wiring works)
    setTimeout(() => {
      const agentMsg = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: `Got it! You said: **"${text}"**\n\nI'll help you with that once I'm fully connected.`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, agentMsg])
    }, 600)
  }, [])

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-semibold text-text">Email Agent</h1>
        </div>
      </header>
      <MessageList messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  )
}

export default Chat
