import { useState, useCallback } from 'react'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import { generateAllDrafts } from '../lib/claude'

// Sample contacts for demo — Sprint 3 will supply these via contact research flow
const SAMPLE_CONTACTS = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'CTO',
    company: 'TechFlow',
    email: 'sarah@techflow.io',
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    role: 'VP Engineering',
    company: 'DataScale',
    email: 'marcus@datascale.com',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Head of Product',
    company: 'CloudNine',
    email: 'emily@cloudnine.dev',
  },
]

function addAgentMessage(setMessages, content) {
  const msg = {
    id: crypto.randomUUID(),
    role: 'agent',
    content,
    timestamp: Date.now(),
  }
  setMessages((prev) => [...prev, msg])
  return msg
}

function Chat() {
  const [messages, setMessages] = useState([])
  const [emailDrafts, setEmailDrafts] = useState([])
  const [isDrafting, setIsDrafting] = useState(false)

  // --- Email draft handlers ---

  const handleUpdateDraft = useCallback((draftId, updates) => {
    setEmailDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, ...updates } : d)),
    )
  }, [])

  const handleConfirmDraft = useCallback((draftId) => {
    setEmailDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId ? { ...d, status: 'confirmed' } : d,
      ),
    )
  }, [])

  const handleSendAll = useCallback(() => {
    // Sprint 5 will wire this to Gmail API
    addAgentMessage(
      setMessages,
      "All emails are ready to send! Gmail integration will be available soon (Sprint 5). For now, your confirmed drafts are saved and ready to go.",
    )
  }, [])

  // --- Main send handler ---

  const handleSend = useCallback(
    async (text) => {
      // Add user message
      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])

      // Detect email drafting intent (simple keyword match for now)
      const lower = text.toLowerCase()
      const isDraftRequest =
        lower.includes('draft') ||
        lower.includes('email') ||
        lower.includes('reach out') ||
        lower.includes('outreach') ||
        lower.includes('write') ||
        lower.includes('send')

      if (isDraftRequest && !isDrafting) {
        setIsDrafting(true)

        // Step 1: Acknowledge
        addAgentMessage(
          setMessages,
          `I'll draft personalized emails for ${SAMPLE_CONTACTS.length} contacts. Give me a moment...`,
        )

        // Step 2: Generate drafts
        try {
          const drafts = await generateAllDrafts(SAMPLE_CONTACTS, text)

          setEmailDrafts(drafts)

          // Step 3: Show intro text + email draft cards
          addAgentMessage(
            setMessages,
            `Here are your ${drafts.length} email drafts. Review each one — you can **edit** or **confirm** them individually. Once all are confirmed, you'll be able to send them.`,
          )

          // Add the email-drafts message (renders the EmailDraftList)
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'agent',
              type: 'email-drafts',
              timestamp: Date.now(),
            },
          ])

          setIsDrafting(false)
        } catch (err) {
          addAgentMessage(
            setMessages,
            `Something went wrong while drafting emails: ${err.message}. Please try again.`,
          )
          setIsDrafting(false)
        }
      } else if (isDrafting) {
        addAgentMessage(
          setMessages,
          "I'm still working on the email drafts — hang tight!",
        )
      } else {
        // Default reply for non-email messages
        setTimeout(() => {
          addAgentMessage(
            setMessages,
            `Got it! You said: **"${text}"**\n\nTry asking me to draft emails or reach out to contacts and I'll generate personalized drafts for you.`,
          )
        }, 600)
      }
    },
    [isDrafting],
  )

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-border bg-white px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-semibold text-text">Email Agent</h1>
        </div>
      </header>
      <MessageList
        messages={messages}
        emailDrafts={emailDrafts}
        onUpdateDraft={handleUpdateDraft}
        onConfirmDraft={handleConfirmDraft}
        onSendAll={handleSendAll}
      />
      <ChatInput onSend={handleSend} disabled={isDrafting} />
    </div>
  )
}

export default Chat
