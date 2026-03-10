import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import ThinkingIndicator from './ThinkingIndicator'
import ContactListMessage from './ContactListMessage'
import EmailDraftList from './EmailDraftList'

function MessageList({
  messages,
  thinking,
  onContinueContacts,
  emailDrafts,
  onUpdateDraft,
  onConfirmDraft,
  onSendAll,
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking, emailDrafts])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 && !thinking && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-text-muted">
            <p className="text-lg font-medium">Welcome to Marlin</p>
            <p className="mt-1 text-sm">
              Tell me who you'd like to reach out to — I'll navigate your contacts and draft personalized emails at lightning speed.
            </p>
          </div>
        )}
        {messages.map((msg) => {
          if (msg.type === 'contacts') {
            return (
              <div key={msg.id} className="flex flex-col gap-2">
                <MessageBubble message={msg} />
                <ContactListMessage
                  contacts={msg.contacts}
                  onContinue={msg.confirmed ? undefined : onContinueContacts}
                />
              </div>
            )
          }
          if (msg.type === 'email-drafts') {
            return (
              <EmailDraftList
                key={msg.id}
                drafts={emailDrafts}
                onUpdateDraft={onUpdateDraft}
                onConfirmDraft={onConfirmDraft}
                onSendAll={onSendAll}
              />
            )
          }
          return <MessageBubble key={msg.id} message={msg} />
        })}
        {thinking && <ThinkingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default MessageList
