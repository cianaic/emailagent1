import { describe, it, expect } from 'vitest'
import {
  deduplicateContacts,
  rawMapToContacts,
  assembleGraph,
  normalizeGroupName,
  areSimilarGroups,
  mergeWithExisting,
  assignGraphPositions,
} from '../contactIntel'

describe('deduplicateContacts', () => {
  it('merges new contacts into empty map', () => {
    const result = deduplicateContacts({}, {
      'alice@example.com': {
        name: 'Alice',
        email: 'alice@example.com',
        domain: 'example.com',
        sent: 3,
        received: 5,
        threadIds: ['t1', 't2'],
        subjects: ['Hello'],
        firstDate: '2024-01-01',
        lastDate: '2024-06-01',
      },
    })

    expect(result['alice@example.com'].sent).toBe(3)
    expect(result['alice@example.com'].received).toBe(5)
  })

  it('merges counts and deduplicates threads', () => {
    const existing = {
      'alice@example.com': {
        name: 'Alice',
        email: 'alice@example.com',
        sent: 3,
        received: 2,
        threadIds: ['t1'],
        subjects: ['Hello'],
        firstDate: '2024-01-01',
        lastDate: '2024-03-01',
      },
    }

    const newContacts = {
      'alice@example.com': {
        name: 'Alice Smith',
        email: 'alice@example.com',
        sent: 2,
        received: 1,
        threadIds: ['t1', 't2'],
        subjects: ['World'],
        firstDate: '2024-02-01',
        lastDate: '2024-06-01',
      },
    }

    const result = deduplicateContacts(existing, newContacts)
    const alice = result['alice@example.com']

    expect(alice.sent).toBe(5)
    expect(alice.received).toBe(3)
    expect(alice.threadIds).toEqual(['t1', 't2'])
    expect(alice.name).toBe('Alice Smith') // longer name wins
    expect(alice.firstDate).toBe('2024-01-01') // earliest
    expect(alice.lastDate).toBe('2024-06-01') // latest
  })
})

describe('rawMapToContacts', () => {
  it('converts map to contact array with interaction data', () => {
    const rawMap = {
      'bob@acme.io': {
        name: 'Bob',
        email: 'bob@acme.io',
        domain: 'acme.io',
        sent: 10,
        received: 15,
        threadIds: ['t1', 't2', 't3'],
        subjects: ['Project update'],
        firstDate: '2024-01-15',
        lastDate: '2024-12-01',
      },
    }

    const contacts = rawMapToContacts(rawMap)
    expect(contacts).toHaveLength(1)

    const bob = contacts[0]
    expect(bob.name).toBe('Bob')
    expect(bob.email).toBe('bob@acme.io')
    expect(bob.company).toBe('Acme') // extracted from domain
    expect(bob.interaction.totalEmails).toBe(25)
    expect(bob.interaction.threadCount).toBe(3)
    expect(bob.interaction.initiationRatio).toBeCloseTo(0.4)
    expect(bob.source).toBe('gmail-scan')
  })

  it('returns empty company for free email providers', () => {
    const rawMap = {
      'user@gmail.com': {
        name: 'User',
        email: 'user@gmail.com',
        domain: 'gmail.com',
        sent: 1,
        received: 1,
        threadIds: ['t1'],
        subjects: [],
        firstDate: null,
        lastDate: null,
      },
    }

    const contacts = rawMapToContacts(rawMap)
    expect(contacts[0].company).toBe('')
  })
})

describe('normalizeGroupName', () => {
  it('trims and normalizes whitespace', () => {
    expect(normalizeGroupName('  Acme  Corp  ')).toBe('Acme Corp')
  })

  it('returns Uncategorized for empty input', () => {
    expect(normalizeGroupName('')).toBe('Uncategorized')
    expect(normalizeGroupName(null)).toBe('Uncategorized')
  })
})

describe('areSimilarGroups', () => {
  it('matches exact names (case-insensitive)', () => {
    expect(areSimilarGroups('Acme Corp', 'acme corp')).toBe(true)
  })

  it('matches when one contains the other', () => {
    expect(areSimilarGroups('Acme', 'Acme Corporation')).toBe(true)
  })

  it('matches after stripping corp/inc/etc suffixes', () => {
    expect(areSimilarGroups('Acme Corp', 'Acme Inc')).toBe(true)
  })

  it('does not match unrelated names', () => {
    expect(areSimilarGroups('Acme', 'Globex')).toBe(false)
  })
})

describe('assembleGraph', () => {
  it('builds groups with subgroups from classified contacts', () => {
    const contacts = [
      {
        id: 'c1',
        classification: {
          group: 'Acme Corp',
          subgroup: 'Engineering',
          relationshipType: 'colleague',
          peripheralTo: [],
        },
      },
      {
        id: 'c2',
        classification: {
          group: 'Acme Corp',
          subgroup: 'Sales',
          relationshipType: 'colleague',
          peripheralTo: [],
        },
      },
      {
        id: 'c3',
        classification: {
          group: 'Friends',
          subgroup: '',
          relationshipType: 'friend',
          peripheralTo: [],
        },
      },
    ]

    const graph = assembleGraph(contacts)

    expect(graph.groups).toHaveLength(2)

    const acme = graph.groups.find((g) => g.name === 'Acme Corp')
    expect(acme.contactCount).toBe(2)
    expect(acme.subgroups).toHaveLength(2)

    const friends = graph.groups.find((g) => g.name === 'Friends')
    expect(friends.contactCount).toBe(1)
  })

  it('identifies peripheral contacts', () => {
    const contacts = [
      {
        id: 'c1',
        classification: {
          group: 'Acme Corp',
          subgroup: '',
          relationshipType: 'colleague',
          peripheralTo: ['Globex'],
        },
      },
    ]

    const graph = assembleGraph(contacts)
    expect(graph.peripheral).toHaveLength(1)
    expect(graph.peripheral[0].nearGroups).toEqual(['Globex'])
  })

  it('merges similar group names', () => {
    const contacts = [
      {
        id: 'c1',
        classification: {
          group: 'Acme Corp',
          subgroup: '',
          relationshipType: 'colleague',
          peripheralTo: [],
        },
      },
      {
        id: 'c2',
        classification: {
          group: 'Acme Inc',
          subgroup: '',
          relationshipType: 'client',
          peripheralTo: [],
        },
      },
    ]

    const graph = assembleGraph(contacts)
    // Should merge into one group
    expect(graph.groups).toHaveLength(1)
    expect(graph.groups[0].contactCount).toBe(2)
  })
})

describe('mergeWithExisting', () => {
  it('merges classified contacts with existing by email', () => {
    const existing = [
      { id: 'old1', email: 'alice@test.com', name: 'Alice', tags: ['tag1'] },
    ]
    const classified = [
      { id: 'new1', email: 'alice@test.com', name: 'Alice Updated', tags: ['tag2'], classification: { who: 'test' } },
      { id: 'new2', email: 'bob@test.com', name: 'Bob', tags: [], classification: { who: 'other' } },
    ]

    const merged = mergeWithExisting(classified, existing)
    expect(merged).toHaveLength(2)

    const alice = merged.find((c) => c.email === 'alice@test.com')
    expect(alice.name).toBe('Alice Updated')
    expect(alice.tags).toEqual(['tag1', 'tag2'])
    expect(alice.classification.who).toBe('test')
  })
})

describe('assignGraphPositions', () => {
  it('assigns graph positions based on assembled graph', () => {
    const contacts = [{ id: 'c1' }, { id: 'c2' }]
    const graph = {
      groups: [
        {
          id: 'g1',
          name: 'Test',
          contactIds: ['c1'],
          subgroups: [{ id: 'sg1', name: 'Sub', contacts: ['c1'] }],
        },
      ],
      peripheral: [{ contactId: 'c2', nearGroups: ['Test'] }],
      bridges: [],
    }

    const result = assignGraphPositions(contacts, graph)
    expect(result[0].graphPosition.groupId).toBe('g1')
    expect(result[0].graphPosition.subgroupId).toBe('sg1')
    expect(result[1].graphPosition.isPeripheral).toBe(true)
    expect(result[1].graphPosition.peripheralTo).toEqual(['Test'])
  })
})
