'use client'

import EmailPreviewCard from './EmailPreviewCard'
import { Button } from './ui/Button'

function EmailDraftList({ drafts, onUpdateDraft, onConfirmDraft, onSendAll }) {
  const allConfirmed =
    drafts.length > 0 && drafts.every((d) => d.status === 'confirmed')
  const confirmedCount = drafts.filter((d) => d.status === 'confirmed').length

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((draft) => (
        <EmailPreviewCard
          key={draft.id}
          draft={draft}
          onUpdate={onUpdateDraft}
          onConfirm={onConfirmDraft}
        />
      ))}

      {/* Progress / Send All */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
        <p className="text-sm text-text-muted">
          {confirmedCount} of {drafts.length} emails confirmed
        </p>
        {allConfirmed ? (
          <Button size="sm" onClick={onSendAll}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5 h-4 w-4"
            >
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
            Send All Emails
          </Button>
        ) : (
          <p className="text-xs text-text-muted">
            Confirm all emails to enable sending
          </p>
        )}
      </div>
    </div>
  )
}

export default EmailDraftList
