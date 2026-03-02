import { Card, CardContent } from './ui/Card'

function ContactCard({ contact, removed, onToggle }) {
  return (
    <Card
      className={`transition-opacity ${removed ? 'opacity-40' : 'opacity-100'}`}
    >
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{contact.name}</p>
          <p className="text-sm text-text-muted">
            {contact.role} at {contact.company}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">{contact.location}</p>
          <p className="mt-1.5 text-sm text-text/80">{contact.bio}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {contact.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-coral/10 px-2 py-0.5 text-xs text-coral-dark"
              >
                {tag}
              </span>
            ))}
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
