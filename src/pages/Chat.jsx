import { useState, useCallback, useEffect } from 'react'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import ChatSidebar from '../components/ChatSidebar'
import CSVUpload from '../components/CSVUpload'
import GmailStatus from '../components/GmailStatus'
import { loadChats, saveChats, createChat, deriveTitle } from '../lib/chatStore'
import { searchContacts } from '../lib/contacts'
import { sendChatMessage, generateAllDrafts, analyzeScreenshot } from '../lib/claude'
import { sendAllEmails } from '../lib/gmail'
import { sendEmail } from '../lib/gmail'
import { createCalendarEvent } from '../lib/calendar'
import { getAllContacts } from '../lib/contacts'
import { useAuth } from '../lib/authContext'

function Chat() {
  const { user, gmailConnected, providerToken, signOut } = useAuth()

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
  const [emailDrafts, setEmailDrafts] = useState([])
  const [isDrafting, setIsDrafting] = useState(false)
  const [, setContactCount] = useState(null)
  const [screenshotActions, setScreenshotActions] = useState(null)
  const [screenshotConfirmedIds, setScreenshotConfirmedIds] = useState(new Set())

  // Persist chats to LocalStorage whenever they change
  useEffect(() => {
    saveChats(chats)
  }, [chats])

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0]

  const addAgentMessage = useCallback(
    (content, extra = {}) => {
      const agentMsg = {
        id: crypto.randomUUID(),
        role: 'agent',
        content,
        timestamp: Date.now(),
        ...extra,
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
    },
    [activeChatId]
  )

  // --- Email draft handlers ---

  const handleUpdateDraft = useCallback((draftId, updates) => {
    setEmailDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, ...updates } : d))
    )
  }, [])

  const handleConfirmDraft = useCallback((draftId) => {
    setEmailDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId ? { ...d, status: 'confirmed' } : d
      )
    )
  }, [])

  const handleSendAll = useCallback(async () => {
    if (!gmailConnected || !providerToken) {
      addAgentMessage(
        'Your Gmail session has expired. Please sign out and sign in again to reconnect.'
      )
      return
    }

    const confirmedDrafts = emailDrafts.filter((d) => d.status === 'confirmed')
    if (confirmedDrafts.length === 0) {
      addAgentMessage('Please confirm at least one email draft before sending.')
      return
    }

    setThinking(true)
    addAgentMessage(
      `Sending **${confirmedDrafts.length}** email${confirmedDrafts.length !== 1 ? 's' : ''}...`
    )

    try {
      const results = await sendAllEmails(confirmedDrafts, providerToken)
      const succeeded = results.filter((r) => r.success)
      const failed = results.filter((r) => !r.success)

      let summary = `Sent **${succeeded.length}/${results.length}** emails successfully.`
      if (succeeded.length > 0) {
        summary += `\n\nDelivered to: ${succeeded.map((r) => r.contactName).join(', ')}`
      }
      if (failed.length > 0) {
        summary += `\n\nFailed: ${failed.map((r) => `${r.contactName} (${r.error})`).join(', ')}`
      }
      addAgentMessage(summary)

      // Mark sent drafts
      setEmailDrafts((prev) =>
        prev.map((d) => {
          const result = results.find((r) => r.contactName === d.contact.name)
          if (result?.success) return { ...d, status: 'sent' }
          return d
        })
      )
    } catch (err) {
      addAgentMessage(`Failed to send emails: ${err.message}`)
    } finally {
      setThinking(false)
    }
  }, [gmailConnected, providerToken, emailDrafts, addAgentMessage])

  // --- Main send handler ---

  const handleSend = useCallback(
    async (input) => {
      // Support both old string format and new {text, image} format
      const text = typeof input === 'string' ? input : input.text
      const image = typeof input === 'string' ? null : input.image

      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text || (image ? 'Analyze this screenshot' : ''),
        timestamp: Date.now(),
        ...(image ? { image } : {}),
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

      try {
        // Screenshot flow: use vision agent
        if (image) {
          addAgentMessage('Analyzing your screenshot...')
          const contacts = getAllContacts()
          const result = await analyzeScreenshot(image, text, contacts)

          const totalCards = (result.cards?.emails?.length || 0) + (result.cards?.calendar?.length || 0)
          if (totalCards > 0) {
            setScreenshotActions(result.cards)
            setScreenshotConfirmedIds(new Set())

            const actionMsg = {
              id: crypto.randomUUID(),
              role: 'agent',
              type: 'screenshot-action',
              content: result.summary,
              timestamp: Date.now(),
            }
            setChats((prev) =>
              prev.map((chat) => {
                if (chat.id !== activeChatId) return chat
                return { ...chat, messages: [...chat.messages, actionMsg], updatedAt: Date.now() }
              })
            )
          } else {
            addAgentMessage(result.summary || 'I analyzed the screenshot but couldn\'t determine any specific actions to take. Try adding more context about what you\'d like to do.')
          }
        } else {
          // Regular chat flow
          const currentChat = chats.find((c) => c.id === activeChatId)
          const allMessages = [...(currentChat?.messages || []), userMsg]
          // Strip images from history to avoid huge payloads
          const apiMessages = allMessages
            .filter((m) => m.role === 'user' || (m.role === 'agent' && !m.type))
            .map((m) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            }))

          const response = await sendChatMessage(apiMessages)

          if (response.toolUse?.name === 'search_contacts') {
            const query = response.toolUse.input.query
            const results = searchContacts(query)

            if (response.text) {
              addAgentMessage(response.text)
            }

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
              addAgentMessage(
                `I searched for **"${query}"** but couldn't find any matching contacts. Try different terms like role, company, industry, or location. You can also **upload a CSV** with your contacts using the button in the header.`
              )
            }
          } else if (response.text) {
            addAgentMessage(response.text)
          }
        }
      } catch (err) {
        addAgentMessage(
          `Sorry, I ran into an error: ${err.message}. Please try again.`
        )
      } finally {
        setThinking(false)
      }
    },
    [activeChatId, chats, addAgentMessage]
  )

  // --- Screenshot action handlers ---

  const handleUpdateScreenshotCard = useCallback((id, updates) => {
    setScreenshotActions((prev) => {
      if (!prev) return prev
      return {
        emails: prev.emails.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        calendar: prev.calendar.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }
    })
  }, [])

  const handleConfirmScreenshotCard = useCallback((id) => {
    setScreenshotConfirmedIds((prev) => new Set([...prev, id]))
  }, [])

  const handleConfirmAllScreenshot = useCallback(async () => {
    if (!screenshotActions) return

    const allIds = [
      ...screenshotActions.emails.map((c) => c.id),
      ...screenshotActions.calendar.map((c) => c.id),
    ]
    const allConfirmed = allIds.every((id) => screenshotConfirmedIds.has(id))

    if (!allConfirmed) {
      setScreenshotConfirmedIds(new Set(allIds))
      return
    }

    if (!gmailConnected || !providerToken) {
      addAgentMessage('Your session has expired. Please sign out and sign in again.')
      return
    }

    setThinking(true)
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const results = []

    for (const email of screenshotActions.emails) {
      try {
        await sendEmail({ to: email.to, subject: email.subject, body: email.body, providerToken })
        results.push({ label: `Email to ${email.to}`, success: true })
      } catch (err) {
        results.push({ label: `Email to ${email.to}`, success: false, error: err.message })
      }
    }

    for (const cal of screenshotActions.calendar) {
      try {
        await createCalendarEvent({ ...cal, timeZone, providerToken })
        results.push({ label: `Calendar: ${cal.title}`, success: true })
      } catch (err) {
        results.push({ label: `Calendar: ${cal.title}`, success: false, error: err.message })
      }
    }

    const succeeded = results.filter((r) => r.success)
    const failed = results.filter((r) => !r.success)
    let summary = `Completed **${succeeded.length}/${results.length}** actions.`
    if (succeeded.length > 0) summary += `\n\nSuccess: ${succeeded.map((r) => r.label).join(', ')}`
    if (failed.length > 0) summary += `\n\nFailed: ${failed.map((r) => `${r.label} (${r.error})`).join(', ')}`

    addAgentMessage(summary)
    setScreenshotActions(null)
    setScreenshotConfirmedIds(new Set())
    setThinking(false)
  }, [screenshotActions, screenshotConfirmedIds, gmailConnected, providerToken, addAgentMessage])

  const handleCancelScreenshot = useCallback(() => {
    setScreenshotActions(null)
    setScreenshotConfirmedIds(new Set())
    addAgentMessage('Screenshot actions cancelled.')
  }, [addAgentMessage])

  // --- Contact confirmation → AI email drafting ---

  const handleContinueContacts = useCallback(
    async (keptContacts) => {
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

      addAgentMessage(
        `Great — continuing with **${keptContacts.length} contact${keptContacts.length !== 1 ? 's' : ''}**: ${keptContacts.map((c) => c.name).join(', ')}.\n\nDrafting personalized emails with AI...`
      )

      setIsDrafting(true)
      setThinking(true)

      try {
        const lastUserMsg = activeChat.messages
          .filter((m) => m.role === 'user')
          .pop()
        const outreachContext = lastUserMsg?.content || 'general outreach'

        const drafts = await generateAllDrafts(keptContacts, outreachContext)
        setEmailDrafts(drafts)

        addAgentMessage(
          `Here are your **${drafts.length}** AI-generated email drafts. Review and edit each one, then confirm. ${gmailConnected ? 'Once confirmed, click **Send All** to deliver via Gmail.' : 'Your Gmail session may have expired — sign out and back in to send.'}`
        )

        addAgentMessage('', { type: 'email-drafts' })
      } catch (err) {
        addAgentMessage(
          `Something went wrong while drafting emails: ${err.message}. Please try again.`
        )
      } finally {
        setIsDrafting(false)
        setThinking(false)
      }
    },
    [activeChatId, activeChat.messages, addAgentMessage, gmailConnected]
  )

  // --- Chat management handlers ---

  const handleNewChat = useCallback(() => {
    const chat = createChat()
    setChats((prev) => [chat, ...prev])
    setActiveChatId(chat.id)
    setEmailDrafts([])
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
            <div className="ml-auto flex items-center gap-3">
              <CSVUpload onUpload={setContactCount} />
              <GmailStatus
                gmailStatus={{ connected: gmailConnected, email: user?.email }}
                onDisconnect={signOut}
              />
            </div>
          </div>
        </header>
        <MessageList
          messages={activeChat.messages}
          thinking={thinking}
          onContinueContacts={handleContinueContacts}
          emailDrafts={emailDrafts}
          onUpdateDraft={handleUpdateDraft}
          onConfirmDraft={handleConfirmDraft}
          onSendAll={handleSendAll}
          screenshotActions={screenshotActions}
          onUpdateScreenshotCard={handleUpdateScreenshotCard}
          onConfirmScreenshotCard={handleConfirmScreenshotCard}
          onConfirmAllScreenshot={handleConfirmAllScreenshot}
          onCancelScreenshot={handleCancelScreenshot}
          screenshotConfirmedIds={screenshotConfirmedIds}
        />
        <ChatInput onSend={handleSend} disabled={thinking || isDrafting} />
      </div>
    </div>
  )
}

export default Chat
