'use client'

import ReactMarkdown from 'react-markdown'

function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-coral text-white'
            : 'bg-white text-text shadow-sm border border-border'
        }`}
      >
        <div className="prose prose-sm max-w-none [&_p]:m-0">
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>
        <p
          className={`mt-1 text-xs ${
            isUser ? 'text-white/70' : 'text-text-muted'
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  )
}

export default MessageBubble
