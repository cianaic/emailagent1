import { useState, useRef } from 'react'
import { Button } from './ui/Button'

function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const [image, setImage] = useState(null) // base64 data URL
  const fileInputRef = useRef(null)

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    // Resize if > 3MB to stay under Vercel's body limit
    if (file.size > 3 * 1024 * 1024) {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 1920 / Math.max(img.width, img.height))
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setImage(canvas.toDataURL('image/jpeg', 0.8))
        URL.revokeObjectURL(img.src)
      }
      img.src = URL.createObjectURL(file)
    } else {
      const reader = new FileReader()
      reader.onload = () => setImage(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        handleImageFile(item.getAsFile())
        return
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file) handleImageFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if ((!trimmed && !image) || disabled) return
    onSend({ text: trimmed, image })
    setText('')
    setImage(null)
  }

  const canSend = (text.trim() || image) && !disabled

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="sticky bottom-0 border-t border-border bg-cream px-4 py-3"
    >
      <div className="mx-auto max-w-3xl">
        {image && (
          <div className="mb-2 flex items-start gap-2">
            <div className="relative">
              <img
                src={image}
                alt="Screenshot"
                className="h-20 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
              >
                x
              </button>
            </div>
            <p className="text-xs text-text-muted mt-1">Screenshot attached. Add context below or send as-is.</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="shrink-0 rounded-full p-2 text-text-muted hover:bg-white hover:text-text disabled:opacity-50"
            title="Attach screenshot"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); e.target.value = '' }}
          />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={image ? 'Add context (optional)...' : 'Type your message or paste a screenshot...'}
            maxLength={2000}
            disabled={disabled}
            className="flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-2 focus:outline-coral disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={!canSend}
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
      </div>
    </form>
  )
}

export default ChatInput
