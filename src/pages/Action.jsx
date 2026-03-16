import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import ActionPreviewCard from '../components/ActionPreviewCard'
import { useAuth } from '../lib/authContext'
import { sendEmail } from '../lib/gmail'
import { createCalendarEvent } from '../lib/calendar'

function Action() {
  const { user, gmailConnected, providerToken } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [confirmedIds, setConfirmedIds] = useState(new Set())
  const [executing, setExecuting] = useState(false)
  const [results, setResults] = useState(null)

  // Parse the action data from the URL
  const actionData = useMemo(() => {
    try {
      const encoded = searchParams.get('data')
      if (!encoded) return null
      return JSON.parse(atob(encoded))
    } catch {
      return null
    }
  }, [searchParams])

  const [cards, setCards] = useState(() => actionData?.cards || { emails: [], calendar: [] })
  const summary = actionData?.summary || ''

  const handleUpdateCard = useCallback((id, updates) => {
    setCards((prev) => ({
      emails: prev.emails.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      calendar: prev.calendar.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }))
  }, [])

  const handleConfirmCard = useCallback((id) => {
    setConfirmedIds((prev) => new Set([...prev, id]))
  }, [])

  const handleConfirmAll = useCallback(async () => {
    // If not all confirmed yet, confirm all first
    const allIds = [
      ...(cards.emails || []).map((c) => c.id),
      ...(cards.calendar || []).map((c) => c.id),
    ]
    const allConfirmed = allIds.every((id) => confirmedIds.has(id))

    if (!allConfirmed) {
      setConfirmedIds(new Set(allIds))
      return
    }

    // All confirmed — execute
    if (!gmailConnected || !providerToken) {
      setResults({ error: 'Please sign in with Google to send emails and create events.' })
      return
    }

    setExecuting(true)
    const execResults = []
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

    for (const email of cards.emails) {
      try {
        await sendEmail({ to: email.to, subject: email.subject, body: email.body, providerToken })
        execResults.push({ id: email.id, type: 'email', success: true, label: `Email to ${email.to}` })
      } catch (err) {
        execResults.push({ id: email.id, type: 'email', success: false, label: `Email to ${email.to}`, error: err.message })
      }
    }

    for (const cal of cards.calendar) {
      try {
        const result = await createCalendarEvent({ ...cal, timeZone, providerToken })
        execResults.push({ id: cal.id, type: 'calendar', success: true, label: cal.title, htmlLink: result.htmlLink })
      } catch (err) {
        execResults.push({ id: cal.id, type: 'calendar', success: false, label: cal.title, error: err.message })
      }
    }

    setResults({ items: execResults })
    setExecuting(false)
  }, [cards, confirmedIds, gmailConnected, providerToken])

  const handleCancel = useCallback(() => {
    navigate('/chat')
  }, [navigate])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-lg font-medium text-text">Sign in required</p>
          <p className="mt-1 text-sm text-text-muted">Please sign in to review and execute actions.</p>
          <button onClick={() => navigate('/')} className="mt-4 text-sm text-coral hover:underline">Go to sign in</button>
        </div>
      </div>
    )
  }

  if (!actionData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <p className="text-lg font-medium text-text">No action data found</p>
          <p className="mt-1 text-sm text-text-muted">This page is opened from the screenshot agent notification.</p>
          <button onClick={() => navigate('/chat')} className="mt-4 text-sm text-coral hover:underline">Go to chat</button>
        </div>
      </div>
    )
  }

  if (results) {
    const succeeded = results.items?.filter((r) => r.success) || []
    const failed = results.items?.filter((r) => !r.success) || []

    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="w-full max-w-lg">
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-text mb-4">
              {failed.length === 0 ? 'All actions completed' : 'Actions completed with errors'}
            </h2>
            {succeeded.map((r) => (
              <div key={r.id} className="mb-2 flex items-center gap-2 text-sm">
                <span className="text-green-600">&#10003;</span>
                <span className="text-text">{r.label}</span>
                {r.htmlLink && (
                  <a href={r.htmlLink} target="_blank" rel="noopener noreferrer" className="text-coral hover:underline text-xs">Open</a>
                )}
              </div>
            ))}
            {failed.map((r) => (
              <div key={r.id} className="mb-2 flex items-start gap-2 text-sm">
                <span className="text-red-500">&#10007;</span>
                <div>
                  <p className="text-text">{r.label}</p>
                  <p className="text-xs text-red-500">{r.error}</p>
                </div>
              </div>
            ))}
            {results.error && <p className="text-sm text-red-500">{results.error}</p>}
            <button onClick={() => navigate('/chat')} className="mt-4 text-sm text-coral hover:underline">Go to chat</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-lg font-semibold text-text">Review Actions</h1>
        <p className="mb-6 text-sm text-text-muted">
          Confirm each card below, then send all.
        </p>
        {executing ? (
          <div className="flex items-center gap-3 rounded-lg bg-white p-4 border border-border">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-coral border-t-transparent" />
            <p className="text-sm text-text">Executing actions...</p>
          </div>
        ) : (
          <ActionPreviewCard
            cards={cards}
            summary={summary}
            confirmedIds={confirmedIds}
            onUpdateCard={handleUpdateCard}
            onConfirmCard={handleConfirmCard}
            onConfirmAll={handleConfirmAll}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  )
}

export default Action
