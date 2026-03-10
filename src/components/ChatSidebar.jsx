'use client'

function ChatSidebar({ chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, open, onClose }) {
  return (
    <>
      {/* Backdrop for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border bg-white transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Chats</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:bg-cream md:hidden"
            aria-label="Close sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New chat button */}
        <div className="px-3 py-2">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-cream"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        </div>

        {/* Chat list */}
        <nav className="flex-1 overflow-y-auto px-3 py-1">
          {chats.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-text-muted">
              No conversations yet
            </p>
          )}
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                chat.id === activeChatId
                  ? 'bg-cream font-medium text-text'
                  : 'text-text-muted hover:bg-cream/60 hover:text-text'
              }`}
              onClick={() => { onSelectChat(chat.id); onClose(); }}
            >
              <span className="flex-1 truncate">{chat.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                className="shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:text-coral group-hover:opacity-100"
                aria-label="Delete chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

export default ChatSidebar
