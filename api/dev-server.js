// Local Express server that mimics Vercel's serverless function routing
// Used for local development instead of `vercel dev`
import 'dotenv/config'
import express from 'express'

import chatHandler from './chat.js'
import draftHandler from './draft.js'
import sendHandler from './send.js'
import authStatusHandler from './auth/status.js'

const app = express()
app.use(express.json())

// Wrap Vercel-style handlers (req, res) — they already work with Express
app.post('/api/chat', chatHandler)
app.post('/api/draft', draftHandler)
app.post('/api/send', sendHandler)
app.get('/api/auth/status', authStatusHandler)

const PORT = process.env.API_PORT || 3001
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
