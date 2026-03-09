import { useState, useCallback, useEffect } from 'react'
import MessageList from '../components/MessageList'
import ChatInput from '../components/ChatInput'
import ChatSidebar from '../components/ChatSidebar'
import CSVUpload from '../components/CSVUpload'
import GmailStatus from '../components/GmailStatus'
import ContactIntelButton from '../components/ContactIntelButton'
import { loadChats, saveChats, createChat, deriveTitle } from '../lib/chatStore'
import { searchContacts, mergeClassifiedContacts } from '../lib/contacts'
import { sendChatMessage, generateAllDrafts } from '../lib/claude'
import { sendAllEmails } from '../lib/gmail'
import { useAuth } from '../lib/authContext'
import { assembleGraph, assignGraphPositions } from '../lib/contactIntel'
import {
  scanFullInbox,
  fetchTranscripts,
  classifyContacts,
  syncToNotion,
  saveContactsLocally,
  loadContactsLocally,
} from '../lib/contactIntelApi'

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
  const [scanStage, setScanStage] = useState('idle')
  const [scanProgress, setScanProgress] = useState('')
  const [networkGraph, setNetworkGraph] = useState(null)
  const [networkContacts, setNetworkContacts] = useState(null)

  // Load previously saved contacts/graph from LocalStorage on mount
  useEffect(() => {
    const { contacts, graph } = loadContactsLocally()
    if (contacts) {
      setNetworkContacts(contacts)
      mergeClassifiedContacts(contacts)
    }
    if (graph) setNetworkGraph(graph)
  }, [])

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
    async (text) => {
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

      try {
        // Build message history for Claude API
        const currentChat = chats.find((c) => c.id === activeChatId)
        const allMessages = [...(currentChat?.messages || []), userMsg]
        const apiMessages = allMessages
          .filter((m) => m.role === 'user' || (m.role === 'agent' && !m.type))
          .map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          }))

        const response = await sendChatMessage(apiMessages)

        // If Claude wants to search contacts via tool_use
        if (response.toolUse?.name === 'search_contacts') {
          const query = response.toolUse.input.query
          const results = searchContacts(query)

          // Show Claude's text first if it has any
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
          // Pure conversational response
          addAgentMessage(response.text)
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

  // --- Contact Intelligence scan handler ---

  const handleContactIntelScan = useCallback(async () => {
    if (!gmailConnected || !providerToken) {
      addAgentMessage('Please sign in with Gmail first to scan your network.')
      return
    }

    try {
      // Stage 1: Scan inbox
      setScanStage('scanning')
      addAgentMessage('Starting network scan — reading your entire Gmail history...')

      const scannedContacts = await scanFullInbox(providerToken, {
        batchSize: 100,
        onProgress: ({ contactCount, messagesProcessed, done }) => {
          setScanProgress(`${contactCount} contacts, ${messagesProcessed} emails`)
          if (done) {
            addAgentMessage(
              `Scan complete. Found **${contactCount}** unique contacts across **${messagesProcessed}** emails.`
            )
          }
        },
      })

      if (scannedContacts.length === 0) {
        addAgentMessage('No contacts found in your inbox.')
        setScanStage('idle')
        return
      }

      // Stage 2: Fetch transcripts
      setScanStage('reading')
      addAgentMessage(`Reading conversation transcripts for ${scannedContacts.length} contacts...`)

      const transcripts = await fetchTranscripts(providerToken, scannedContacts, {
        maxThreadsPerContact: 20,
        onProgress: ({ processed, total }) => {
          setScanProgress(`${processed}/${total}`)
        },
      })

      // Merge transcripts into contacts
      const contactsWithTranscripts = scannedContacts.map((c) => ({
        ...c,
        transcript: transcripts[c.email] || null,
      }))

      // Stage 3: Classify via Groq
      setScanStage('classifying')
      addAgentMessage('Classifying contacts with AI — understanding your relationships...')

      const classificationMap = await classifyContacts(contactsWithTranscripts, {
        onProgress: ({ processed, total }) => {
          setScanProgress(`${processed}/${total}`)
        },
      })

      // Apply classifications
      const classifiedContacts = scannedContacts.map((c) => ({
        ...c,
        classification: classificationMap[c.email] || null,
      }))

      // Stage 4: Build knowledge graph
      setScanStage('graphing')
      setScanProgress('')
      const graph = assembleGraph(classifiedContacts)
      const contactsWithGraph = assignGraphPositions(classifiedContacts, graph)

      setNetworkGraph(graph)
      setNetworkContacts(contactsWithGraph)

      // Merge into contact store for search
      mergeClassifiedContacts(contactsWithGraph)

      // Save to LocalStorage
      saveContactsLocally(contactsWithGraph, graph)

      // Post summary + graph to chat
      addAgentMessage('', {
        type: 'contact-intel-summary',
        contacts: contactsWithGraph,
        graph,
      })

      addAgentMessage('', {
        type: 'knowledge-graph',
        contacts: contactsWithGraph,
        graph,
      })

      // Stage 5: Sync to Notion (optional, don't block)
      setScanStage('syncing')
      setScanProgress('')
      try {
        const syncResult = await syncToNotion(contactsWithGraph)
        addAgentMessage(
          `Synced to Notion CRM: **${syncResult.created}** new, **${syncResult.updated}** updated.`
        )
      } catch {
        addAgentMessage('Notion sync skipped — configure NOTION_API_KEY to enable CRM sync.')
      }

      setScanStage('done')
      setScanProgress('')
    } catch (err) {
      addAgentMessage(`Network scan failed: ${err.message}`)
      setScanStage('idle')
      setScanProgress('')
    }
  }, [gmailConnected, providerToken, addAgentMessage])

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
              <ContactIntelButton
                stage={scanStage}
                progress={scanProgress}
                disabled={!gmailConnected}
                onClick={handleContactIntelScan}
              />
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
        />
        <ChatInput onSend={handleSend} disabled={thinking || isDrafting} />
      </div>
    </div>
  )
}

export default Chat
