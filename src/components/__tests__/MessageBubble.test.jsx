import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MessageBubble from '../MessageBubble'

describe('MessageBubble', () => {
  const userMsg = {
    id: '1',
    role: 'user',
    content: 'Hello there',
    timestamp: Date.now(),
  }

  const agentMsg = {
    id: '2',
    role: 'agent',
    content: 'Hi! How can I help?',
    timestamp: Date.now(),
  }

  it('renders user message content', () => {
    render(<MessageBubble message={userMsg} />)
    expect(screen.getByText('Hello there')).toBeInTheDocument()
  })

  it('renders agent message content', () => {
    render(<MessageBubble message={agentMsg} />)
    expect(screen.getByText('Hi! How can I help?')).toBeInTheDocument()
  })

  it('displays timestamp', () => {
    const time = new Date(userMsg.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    render(<MessageBubble message={userMsg} />)
    expect(screen.getByText(time)).toBeInTheDocument()
  })

  it('renders markdown for agent messages', () => {
    const mdMsg = {
      id: '3',
      role: 'agent',
      content: 'Found **3 contacts** matching your request.',
      timestamp: Date.now(),
    }
    render(<MessageBubble message={mdMsg} />)
    const strong = screen.getByText('3 contacts')
    expect(strong.tagName).toBe('STRONG')
  })

  it('does not render markdown for user messages (plain text)', () => {
    const mdUser = {
      id: '4',
      role: 'user',
      content: '**bold text**',
      timestamp: Date.now(),
    }
    render(<MessageBubble message={mdUser} />)
    // Should render as plain text, not as <strong>
    expect(screen.getByText('**bold text**')).toBeInTheDocument()
  })
})
