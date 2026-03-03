import { useState } from 'react'
import { Card, CardContent } from './ui/Card'
import { Button } from './ui/Button'

function EmailPreviewCard({ draft, onUpdate, onConfirm }) {
  const [isEditing, setIsEditing] = useState(false)
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)

  const isConfirmed = draft.status === 'confirmed'

  const handleSave = () => {
    onUpdate(draft.id, { subject, body })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setSubject(draft.subject)
    setBody(draft.body)
    setIsEditing(false)
  }

  const handleConfirm = () => {
    if (isEditing) {
      onUpdate(draft.id, { subject, body })
      setIsEditing(false)
    }
    onConfirm(draft.id)
  }

  return (
    <Card
      className={`transition-all ${isConfirmed ? 'border-green-300 bg-green-50/50' : ''}`}
    >
      <CardContent>
        {/* Header: contact info + status */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral/10 text-sm font-medium text-coral">
              {draft.contact.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">
                {draft.contact.name}
              </p>
              <p className="truncate text-xs text-text-muted">
                {draft.contact.email}
              </p>
            </div>
          </div>
          {isConfirmed && (
            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Confirmed
            </span>
          )}
        </div>

        {/* Subject */}
        {isEditing ? (
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mb-2 w-full rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text focus:outline-2 focus:outline-coral"
            placeholder="Subject"
          />
        ) : (
          <p className="mb-2 text-sm">
            <span className="font-medium text-text-muted">Subject: </span>
            <span className="font-medium text-text">{draft.subject}</span>
          </p>
        )}

        {/* Body */}
        {isEditing ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="mb-3 w-full resize-y rounded-lg border border-border px-3 py-2 text-sm text-text focus:outline-2 focus:outline-coral"
          />
        ) : (
          <div className="mb-3 whitespace-pre-wrap rounded-lg bg-cream px-3 py-2 text-sm leading-relaxed text-text">
            {draft.body}
          </div>
        )}

        {/* Actions */}
        {!isConfirmed && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" variant="outline" onClick={handleSave}>
                  Save
                </Button>
                <Button size="sm" onClick={handleConfirm}>
                  Save &amp; Confirm
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
                <Button size="sm" onClick={handleConfirm}>
                  Confirm
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EmailPreviewCard
