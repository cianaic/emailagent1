import { useState } from 'react'
import { Button } from './ui/Button'

function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 border-t border-border bg-cream px-4 py-3"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          maxLength={2000}
          disabled={disabled}
          className="flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-2 focus:outline-coral disabled:opacity-50"
        />
        <Button
          type="submit"
          disabled={!text.trim() || disabled}
          size="icon"
          className="shrink-0 rounded-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </form>
  )
}

export default ChatInput
