import { google } from 'googleapis'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token. Please sign in again.' })
  }
  const accessToken = authHeader.slice(7)

  const { title, date, startTime, endTime, location, attendees, description, timeZone } = req.body
  if (!title || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required fields: title, date, startTime, endTime' })
  }

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: accessToken })

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    const tz = timeZone || 'America/New_York'
    const event = {
      summary: title,
      description: description || undefined,
      location: location || undefined,
      start: {
        dateTime: `${date}T${startTime}:00`,
        timeZone: tz,
      },
      end: {
        dateTime: `${date}T${endTime}:00`,
        timeZone: tz,
      },
    }

    if (attendees?.length > 0) {
      event.attendees = attendees.map((email) => ({ email }))
    }

    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    })

    return res.status(200).json({
      success: true,
      eventId: result.data.id,
      htmlLink: result.data.htmlLink,
    })
  } catch (err) {
    console.error('Calendar create error:', err.message)
    if (err.code === 401 || err.code === 403) {
      return res.status(401).json({ error: 'Calendar token expired. Please sign in again.' })
    }
    return res.status(500).json({ error: 'Failed to create calendar event' })
  }
}
