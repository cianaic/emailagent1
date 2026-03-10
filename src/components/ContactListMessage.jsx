'use client'

import { useState } from 'react'
import ContactCard from './ContactCard'
import { Button } from './ui/Button'

function ContactListMessage({ contacts, onContinue }) {
  const [removedIds, setRemovedIds] = useState(new Set())

  const handleToggle = (id) => {
    setRemovedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const keptContacts = contacts.filter((c) => !removedIds.has(c.id))
  const keptCount = keptContacts.length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            removed={removedIds.has(contact.id)}
            onToggle={handleToggle}
          />
        ))}
      </div>
      {onContinue && (
        <Button
          onClick={() => onContinue(keptContacts)}
          disabled={keptCount === 0}
          className="self-start"
        >
          Continue with {keptCount} contact{keptCount !== 1 ? 's' : ''}
        </Button>
      )}
    </div>
  )
}

export default ContactListMessage
