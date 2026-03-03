import { Button } from './ui/Button'

function GmailStatus({ gmailStatus, onConnect, onDisconnect }) {
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
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onConnect}
      className="text-xs"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mr-1 h-3.5 w-3.5">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
      </svg>
      Connect Gmail
    </Button>
  )
}

export default GmailStatus
