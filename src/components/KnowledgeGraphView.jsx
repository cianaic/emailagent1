import { useState } from 'react'
import { Card, CardContent } from './ui/Card'

const TYPE_COLORS = {
  colleague: 'bg-blue-100 text-blue-700',
  client: 'bg-green-100 text-green-700',
  vendor: 'bg-orange-100 text-orange-700',
  investor: 'bg-purple-100 text-purple-700',
  advisor: 'bg-pink-100 text-pink-700',
  friend: 'bg-yellow-100 text-yellow-700',
  family: 'bg-red-100 text-red-700',
  recruiter: 'bg-gray-100 text-gray-600',
  journalist: 'bg-amber-100 text-amber-700',
  community: 'bg-teal-100 text-teal-700',
  service_provider: 'bg-slate-100 text-slate-700',
  government: 'bg-stone-100 text-stone-600',
  unknown: 'bg-gray-50 text-gray-500',
}

const STRENGTH_DOTS = {
  high: 'bg-green-500',   // 7-10
  medium: 'bg-yellow-500', // 4-6
  low: 'bg-gray-400',      // 1-3
}

function strengthLevel(s) {
  if (s >= 7) return 'high'
  if (s >= 4) return 'medium'
  return 'low'
}

function ContactMini({ contact, onClick }) {
  const c = contact.classification || {}
  const level = strengthLevel(c.strength || 1)

  return (
    <button
      onClick={() => onClick(contact)}
      className="flex w-full cursor-pointer items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-cream"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${STRENGTH_DOTS[level]}`} />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-text">{contact.name}</span>
        {c.who && (
          <p className="truncate text-xs text-text-muted">{c.who}</p>
        )}
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${TYPE_COLORS[c.relationshipType] || TYPE_COLORS.unknown}`}>
        {c.relationshipType || 'unknown'}
      </span>
    </button>
  )
}

function ContactDetail({ contact, onClose }) {
  const c = contact.classification || {}
  const i = contact.interaction || {}

  return (
    <Card className="border-coral/20">
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-base font-semibold text-text">{contact.name}</h4>
            <p className="text-sm text-text-muted">{contact.email}</p>
          </div>
          <button onClick={onClose} className="cursor-pointer text-text-muted hover:text-text">
            ✕
          </button>
        </div>

        {c.who && (
          <p className="mt-2 text-sm text-text">{c.who}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${TYPE_COLORS[c.relationshipType] || TYPE_COLORS.unknown}`}>
            {c.relationshipType}
          </span>
          {c.sentiment && (
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              c.sentiment === 'positive' ? 'bg-green-50 text-green-600' :
              c.sentiment === 'negative' ? 'bg-red-50 text-red-600' :
              'bg-gray-50 text-gray-600'
            }`}>
              {c.sentiment}
            </span>
          )}
          <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-text-muted">
            strength: {c.strength || '?'}/10
          </span>
        </div>

        {c.topics?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {c.topics.map((t) => (
              <span key={t} className="rounded-full bg-coral/10 px-2 py-0.5 text-xs text-coral-dark">
                {t}
              </span>
            ))}
          </div>
        )}

        {c.context && (
          <p className="mt-3 text-sm text-text/80">{c.context}</p>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-cream p-2">
            <div className="font-semibold text-text">{i.totalEmails || 0}</div>
            <div className="text-text-muted">emails</div>
          </div>
          <div className="rounded-lg bg-cream p-2">
            <div className="font-semibold text-text">{i.threadCount || 0}</div>
            <div className="text-text-muted">threads</div>
          </div>
          <div className="rounded-lg bg-cream p-2">
            <div className="font-semibold text-text">
              {i.lastInteraction ? daysAgo(i.lastInteraction) : '?'}
            </div>
            <div className="text-text-muted">days ago</div>
          </div>
        </div>

        {contact.graphPosition?.isBridge && (
          <div className="mt-2 rounded-lg bg-purple-50 p-2 text-xs text-purple-700">
            Bridges: {contact.graphPosition.bridgeGroups.join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function daysAgo(dateStr) {
  if (!dateStr) return '?'
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function KnowledgeGraphView({ graph, contacts }) {
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [selectedContact, setSelectedContact] = useState(null)
  const [filter, setFilter] = useState('')

  if (!graph || !contacts) return null

  const contactById = {}
  for (const c of contacts) {
    contactById[c.id] = c
  }

  const filteredGroups = filter
    ? graph.groups.filter((g) =>
        g.name.toLowerCase().includes(filter.toLowerCase()) ||
        g.contactIds.some((id) => {
          const c = contactById[id]
          return c?.name?.toLowerCase().includes(filter.toLowerCase()) ||
            c?.classification?.who?.toLowerCase().includes(filter.toLowerCase())
        })
      )
    : graph.groups

  return (
    <div className="space-y-3">
      {/* Filter */}
      <input
        type="text"
        placeholder="Filter groups or contacts..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-coral/50"
      />

      {/* Selected contact detail */}
      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}

      {/* Groups */}
      {filteredGroups.map((group) => {
        const isExpanded = expandedGroup === group.id
        return (
          <Card key={group.id}>
            <button
              onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
              className="flex w-full cursor-pointer items-center justify-between p-4 text-left"
            >
              <div>
                <h3 className="font-semibold text-text">{group.name}</h3>
                <p className="text-xs text-text-muted">
                  {group.contactCount} contacts
                  {group.subgroups.length > 0 && ` · ${group.subgroups.length} subgroups`}
                </p>
              </div>
              <span className="text-text-muted">{isExpanded ? '▾' : '▸'}</span>
            </button>

            {isExpanded && (
              <CardContent className="border-t border-border pt-2">
                {group.subgroups.length > 0 ? (
                  group.subgroups.map((sg) => (
                    <div key={sg.id} className="mb-3">
                      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
                        {sg.name}
                      </h4>
                      <div className="space-y-0.5">
                        {sg.contacts.map((cid) => {
                          const contact = contactById[cid]
                          return contact ? (
                            <ContactMini
                              key={cid}
                              contact={contact}
                              onClick={setSelectedContact}
                            />
                          ) : null
                        })}
                      </div>
                    </div>
                  ))
                ) : null}

                {/* Contacts not in any subgroup */}
                {(() => {
                  const subgroupedIds = new Set(
                    group.subgroups.flatMap((sg) => sg.contacts)
                  )
                  const ungrouped = group.contactIds.filter(
                    (id) => !subgroupedIds.has(id)
                  )
                  if (ungrouped.length === 0) return null
                  return (
                    <div>
                      {group.subgroups.length > 0 && (
                        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
                          Other
                        </h4>
                      )}
                      <div className="space-y-0.5">
                        {ungrouped.map((cid) => {
                          const contact = contactById[cid]
                          return contact ? (
                            <ContactMini
                              key={cid}
                              contact={contact}
                              onClick={setSelectedContact}
                            />
                          ) : null
                        })}
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Peripheral contacts */}
      {graph.peripheral.length > 0 && (
        <Card className="border-dashed">
          <button
            onClick={() => setExpandedGroup(expandedGroup === 'peripheral' ? null : 'peripheral')}
            className="flex w-full cursor-pointer items-center justify-between p-4 text-left"
          >
            <div>
              <h3 className="font-semibold text-text-muted">Near but outside groups</h3>
              <p className="text-xs text-text-muted">{graph.peripheral.length} contacts</p>
            </div>
            <span className="text-text-muted">{expandedGroup === 'peripheral' ? '▾' : '▸'}</span>
          </button>

          {expandedGroup === 'peripheral' && (
            <CardContent className="border-t border-border pt-2">
              {graph.peripheral.map((p) => {
                const contact = contactById[p.contactId]
                if (!contact) return null
                return (
                  <div key={p.contactId} className="mb-2">
                    <ContactMini contact={contact} onClick={setSelectedContact} />
                    <p className="ml-4 text-xs text-text-muted">
                      Near: {p.nearGroups.join(', ')}
                    </p>
                  </div>
                )
              })}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}

export default KnowledgeGraphView
