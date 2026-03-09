import { Card, CardContent } from './ui/Card'

const TYPE_LABELS = {
  colleague: 'Colleagues',
  client: 'Clients',
  vendor: 'Vendors',
  investor: 'Investors',
  advisor: 'Advisors',
  friend: 'Friends',
  family: 'Family',
  recruiter: 'Recruiters',
  journalist: 'Journalists',
  community: 'Community',
  service_provider: 'Service Providers',
  government: 'Government',
  unknown: 'Unknown',
}

function ContactIntelSummary({ contacts, graph }) {
  if (!contacts || contacts.length === 0) return null

  // Count by relationship type
  const typeCounts = {}
  for (const c of contacts) {
    const type = c.classification?.relationshipType || 'unknown'
    typeCounts[type] = (typeCounts[type] || 0) + 1
  }

  // Top contacts by strength
  const topContacts = [...contacts]
    .filter((c) => c.classification?.strength)
    .sort((a, b) => (b.classification?.strength || 0) - (a.classification?.strength || 0))
    .slice(0, 5)

  const totalGroups = graph?.groups?.length || 0
  const totalBridges = graph?.bridges?.length || 0
  const totalPeripheral = graph?.peripheral?.length || 0

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text">Network Intelligence</h3>
          <p className="text-sm text-text-muted">
            {contacts.length} contacts mapped across {totalGroups} groups
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-lg bg-cream p-2">
            <div className="text-lg font-semibold text-text">{contacts.length}</div>
            <div className="text-text-muted">contacts</div>
          </div>
          <div className="rounded-lg bg-cream p-2">
            <div className="text-lg font-semibold text-text">{totalGroups}</div>
            <div className="text-text-muted">groups</div>
          </div>
          <div className="rounded-lg bg-cream p-2">
            <div className="text-lg font-semibold text-text">{totalBridges}</div>
            <div className="text-text-muted">bridges</div>
          </div>
          <div className="rounded-lg bg-cream p-2">
            <div className="text-lg font-semibold text-text">{totalPeripheral}</div>
            <div className="text-text-muted">peripheral</div>
          </div>
        </div>

        {/* Relationship type breakdown */}
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            By Relationship
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <span
                  key={type}
                  className="rounded-full bg-coral/10 px-2.5 py-1 text-xs text-coral-dark"
                >
                  {TYPE_LABELS[type] || type}: {count}
                </span>
              ))}
          </div>
        </div>

        {/* Top contacts */}
        {topContacts.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              Strongest Relationships
            </h4>
            <div className="space-y-1">
              {topContacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg p-1.5 text-sm">
                  <div>
                    <span className="font-medium text-text">{c.name}</span>
                    <span className="ml-2 text-xs text-text-muted">
                      {c.classification?.group}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {c.classification?.strength}/10
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top groups */}
        {graph?.groups?.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              Largest Groups
            </h4>
            <div className="space-y-1">
              {graph.groups.slice(0, 5).map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-lg p-1.5 text-sm">
                  <span className="font-medium text-text">{g.name}</span>
                  <span className="text-xs text-text-muted">
                    {g.contactCount} people
                    {g.subgroups.length > 0 && ` · ${g.subgroups.length} subgroups`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ContactIntelSummary
