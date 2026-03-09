function GmailStatus({ gmailStatus, onDisconnect }) {
  if (gmailStatus.connected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-text-muted">{gmailStatus.email}</span>
        </div>
        <button
          onClick={onDisconnect}
          className="text-xs text-text-muted underline hover:text-text"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-yellow-500" />
      <span className="text-xs text-text-muted">Gmail not connected — sign in again</span>
    </div>
  )
}

export default GmailStatus
