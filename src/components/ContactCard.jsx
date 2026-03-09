import { Card, CardContent } from './ui/Card'

const TYPE_COLORS = {
  colleague: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
  vendor: 'bg-orange-100 text-orange-700',
  investor: 'bg-purple-100 text-purple-700',
  advisor: 'bg-pink-100 text-pink-700',
  friend: 'bg-yellow-100 text-yellow-700',
  family: 'bg-red-100 text-red-700',
  community: 'bg-teal-100 text-teal-700',
}

function daysAgo(dateStr) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function ContactCard({ contact, removed, onToggle }) {
  const c = contact.classification || null
  const i = contact.interaction || null
  const hasIntel = !!c

  return (
    <Card
      className={`transition-opacity ${removed ? 'opacity-40' : 'opacity-100'}`}
    >
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-text">{contact.name}</p>
            {hasIntel && c.relationshipType && c.relationshipType !== 'unknown' && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${TYPE_COLORS[c.relationshipType] || 'bg-gray-100 text-gray-600'}`}>
                {c.relationshipType}
              </span>
            )}
            {hasIntel && c.strength && (
              <span className="text-xs text-text-muted">{c.strength}/10</span>
            )}
          </div>

          {hasIntel && c.who ? (
            <p className="text-sm text-text-muted">{c.who}</p>
          ) : (
            <p className="text-sm text-text-muted">
              {contact.role}{contact.role && contact.company ? ' at ' : ''}{contact.company}
            </p>
          )}

          {contact.location && (
            <p className="mt-0.5 text-xs text-text-muted">{contact.location}</p>
          )}

          {hasIntel && c.group && (
            <p className="mt-0.5 text-xs text-text-muted">
              {c.group}{c.subgroup ? ` / ${c.subgroup}` : ''}
            </p>
          )}

          {!hasIntel && contact.bio && (
            <p className="mt-1.5 text-sm text-text/80">{contact.bio}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            {hasIntel && c.topics ? (
              c.topics.slice(0, 4).map((topic) => (
                <span
                  key={topic}
                  className="rounded-full bg-coral/10 px-2 py-0.5 text-xs text-coral-dark"
                >
                  {topic}
                </span>
              ))
            ) : (
              (contact.tags || []).slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-coral/10 px-2 py-0.5 text-xs text-coral-dark"
                >
                  {tag}
                </span>
              ))
            )}
            {i && (
              <>
                <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-text-muted">
                  {i.totalEmails} emails
                </span>
                {i.lastInteraction && (
                  <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-text-muted">
                    {daysAgo(i.lastInteraction)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => onToggle(contact.id)}
          className={`shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            removed
              ? 'bg-cream text-text-muted hover:bg-coral/10 hover:text-coral-dark'
              : 'bg-coral/10 text-coral-dark hover:bg-red-100 hover:text-red-600'
          }`}
        >
          {removed ? 'Keep' : 'Remove'}
        </button>
      </CardContent>
    </Card>
  )
}

export default ContactCard
