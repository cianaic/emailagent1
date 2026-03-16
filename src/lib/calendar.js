export async function createCalendarEvent({ title, date, startTime, endTime, location, attendees, description, timeZone, providerToken }) {
  const res = await fetch('/api/calendar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${providerToken}`,
    },
    body: JSON.stringify({ title, date, startTime, endTime, location, attendees, description, timeZone }),
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to create calendar event')
  }

  return res.json()
}
