function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-ocean-light px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-electric [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-electric [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-electric [animation-delay:300ms]" />
        </div>
        <span className="text-sm text-text-muted">Thinking...</span>
      </div>
    </div>
  )
}

export default ThinkingIndicator
