'use client'

import { useRef, useState } from 'react'
import { Button } from './ui/Button'
import { parseCSV, loadContacts, getContactCount } from '../lib/contacts'

function CSVUpload({ onUpload }) {
  const fileRef = useRef(null)
  const [error, setError] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    try {
      const text = await file.text()
      const contacts = parseCSV(text)

      if (contacts.length === 0) {
        setError('No valid contacts found. Make sure your CSV has "name" and "email" columns.')
        return
      }

      const total = loadContacts(contacts)
      if (onUpload) onUpload(total)
    } catch (err) {
      setError(err.message)
    }

    // Reset the input so the same file can be re-uploaded
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="text-xs"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="mr-1 h-3.5 w-3.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        Upload CSV
      </Button>
      <span className="text-xs text-text-muted">
        {getContactCount()} contacts loaded
      </span>
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  )
}

export default CSVUpload
