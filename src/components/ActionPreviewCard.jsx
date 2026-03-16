import { useState } from 'react'
import { Card, CardContent } from './ui/Card'
import { Button } from './ui/Button'

function EmailCard({ card, onUpdate, onConfirm, confirmed }) {
  const [editing, setEditing] = useState(false)
  const [to, setTo] = useState(card.to)
  const [subject, setSubject] = useState(card.subject)
  const [body, setBody] = useState(card.body)

  const handleSave = () => {
    onUpdate(card.id, { to, subject, body })
    setEditing(false)
  }

  const handleConfirm = () => {
    if (editing) {
      onUpdate(card.id, { to, subject, body })
      setEditing(false)
    }
    onConfirm(card.id, 'email')
  }

  return (
    <Card className={`transition-all ${confirmed ? 'border-green-300 bg-green-50/50' : ''}`}>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Email</p>
              <p className="truncate text-sm text-text-muted">{card.to_name || card.to}</p>
            </div>
          </div>
          {confirmed && (
            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Confirmed
            </span>
          )}
        </div>

        {editing ? (
          <>
            <label className="mb-1 block text-xs font-medium text-text-muted">To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mb-2 w-full rounded-lg border border-border px-3 py-1.5 text-sm text-text focus:outline-2 focus:outline-coral"
            />
            <label className="mb-1 block text-xs font-medium text-text-muted">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mb-2 w-full rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text focus:outline-2 focus:outline-coral"
            />
            <label className="mb-1 block text-xs font-medium text-text-muted">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="mb-3 w-full resize-y rounded-lg border border-border px-3 py-2 text-sm text-text focus:outline-2 focus:outline-coral"
            />
          </>
        ) : (
          <>
            <p className="mb-1 text-sm">
              <span className="font-medium text-text-muted">To: </span>
              <span className="text-text">{to}</span>
            </p>
            <p className="mb-2 text-sm">
              <span className="font-medium text-text-muted">Subject: </span>
              <span className="font-medium text-text">{subject}</span>
            </p>
            <div className="mb-3 whitespace-pre-wrap rounded-lg bg-cream px-3 py-2 text-sm leading-relaxed text-text">
              {body}
            </div>
          </>
        )}

        {!confirmed && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => { setTo(card.to); setSubject(card.subject); setBody(card.body); setEditing(false) }}>Cancel</Button>
                <Button size="sm" variant="outline" onClick={handleSave}>Save</Button>
                <Button size="sm" onClick={handleConfirm}>Save &amp; Confirm</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                <Button size="sm" onClick={handleConfirm}>Confirm</Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CalendarCard({ card, onUpdate, onConfirm, confirmed }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(card.title)
  const [date, setDate] = useState(card.date)
  const [startTime, setStartTime] = useState(card.startTime)
  const [endTime, setEndTime] = useState(card.endTime)
  const [location, setLocation] = useState(card.location || '')
  const [description, setDescription] = useState(card.description || '')
  const [attendees, setAttendees] = useState((card.attendees || []).join(', '))

  const handleSave = () => {
    onUpdate(card.id, {
      title, date, startTime, endTime, location, description,
      attendees: attendees.split(',').map((a) => a.trim()).filter(Boolean),
    })
    setEditing(false)
  }

  const handleConfirm = () => {
    if (editing) handleSave()
    onConfirm(card.id, 'calendar')
  }

  const formatDate = (d) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return d }
  }

  const formatTime = (t) => {
    try {
      const [h, m] = t.split(':')
      const hour = parseInt(h, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      return `${hour % 12 || 12}:${m} ${ampm}`
    } catch { return t }
  }

  return (
    <Card className={`transition-all ${confirmed ? 'border-green-300 bg-green-50/50' : ''}`}>
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-purple-600">Calendar Event</p>
              <p className="truncate text-sm text-text-muted">{formatDate(date)}</p>
            </div>
          </div>
          {confirmed && (
            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Confirmed
            </span>
          )}
        </div>

        {editing ? (
          <>
            <label className="mb-1 block text-xs font-medium text-text-muted">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="mb-2 w-full rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text focus:outline-2 focus:outline-coral" />
            <div className="mb-2 grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm text-text focus:outline-2 focus:outline-coral" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">Start</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm text-text focus:outline-2 focus:outline-coral" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-muted">End</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-1.5 text-sm text-text focus:outline-2 focus:outline-coral" />
              </div>
            </div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              className="mb-2 w-full rounded-lg border border-border px-3 py-1.5 text-sm text-text focus:outline-2 focus:outline-coral" />
            <label className="mb-1 block text-xs font-medium text-text-muted">Attendees (comma separated emails)</label>
            <input type="text" value={attendees} onChange={(e) => setAttendees(e.target.value)}
              className="mb-2 w-full rounded-lg border border-border px-3 py-1.5 text-sm text-text focus:outline-2 focus:outline-coral" />
            <label className="mb-1 block text-xs font-medium text-text-muted">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="mb-3 w-full resize-y rounded-lg border border-border px-3 py-2 text-sm text-text focus:outline-2 focus:outline-coral" />
          </>
        ) : (
          <>
            <p className="mb-1 text-sm font-medium text-text">{title}</p>
            <p className="mb-1 text-sm text-text-muted">
              {formatTime(startTime)} – {formatTime(endTime)}
            </p>
            {location && <p className="mb-1 text-sm text-text-muted">{location}</p>}
            {card.attendees?.length > 0 && (
              <p className="mb-1 text-sm text-text-muted">
                Attendees: {card.attendees.join(', ')}
              </p>
            )}
            {description && (
              <div className="mb-3 whitespace-pre-wrap rounded-lg bg-cream px-3 py-2 text-sm leading-relaxed text-text">
                {description}
              </div>
            )}
          </>
        )}

        {!confirmed && (
          <div className="mt-3 flex gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" variant="outline" onClick={handleSave}>Save</Button>
                <Button size="sm" onClick={handleConfirm}>Save &amp; Confirm</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                <Button size="sm" onClick={handleConfirm}>Confirm</Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActionPreviewCard({ cards, summary, onUpdateCard, onConfirmCard, onConfirmAll, onCancel, confirmedIds }) {
  const allCards = [
    ...(cards.emails || []).map((c) => ({ ...c, type: 'email' })),
    ...(cards.calendar || []).map((c) => ({ ...c, type: 'calendar' })),
  ]
  const totalCards = allCards.length
  const confirmedCount = confirmedIds?.size || 0
  const allConfirmed = confirmedCount === totalCards && totalCards > 0

  return (
    <div className="flex flex-col gap-3">
      {summary && (
        <div className="rounded-lg bg-white px-4 py-3 text-sm text-text shadow-sm border border-border">
          {summary}
        </div>
      )}

      {cards.emails?.map((card) => (
        <EmailCard
          key={card.id}
          card={card}
          confirmed={confirmedIds?.has(card.id)}
          onUpdate={onUpdateCard}
          onConfirm={onConfirmCard}
        />
      ))}

      {cards.calendar?.map((card) => (
        <CalendarCard
          key={card.id}
          card={card}
          confirmed={confirmedIds?.has(card.id)}
          onUpdate={onUpdateCard}
          onConfirm={onConfirmCard}
        />
      ))}

      {totalCards > 0 && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          {totalCards > 1 && !allConfirmed && (
            <Button onClick={onConfirmAll}>Confirm All ({totalCards})</Button>
          )}
          {allConfirmed && (
            <Button onClick={onConfirmAll}>Send All ({totalCards})</Button>
          )}
        </div>
      )}
    </div>
  )
}

export default ActionPreviewCard
