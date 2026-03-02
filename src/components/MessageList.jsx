import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'
import EmailDraftList from './EmailDraftList'

function MessageList({
  messages,
  emailDrafts,
  onUpdateDraft,
  onConfirmDraft,
  onSendAll,
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, emailDrafts])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-text-muted">
            <p className="text-lg font-medium">Welcome to Email Agent</p>
            <p className="mt-1 text-sm">
              Tell me who you'd like to reach out to and I'll help craft
              personalized emails.
            </p>
          </div>
        )}
        {messages.map((msg) =>
          msg.type === 'email-drafts' ? (
            <EmailDraftList
              key={msg.id}
              drafts={emailDrafts}
              onUpdateDraft={onUpdateDraft}
              onConfirmDraft={onConfirmDraft}
              onSendAll={onSendAll}
            />
          ) : (
            <MessageBubble key={msg.id} message={msg} />
          ),
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default MessageList
