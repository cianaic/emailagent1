import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatInput from '../ChatInput'

describe('ChatInput', () => {
  it('renders input and submit button', () => {
    render(<ChatInput onSend={() => {}} />)
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
    expect(screen.getByRole('button', { type: 'submit' })).toBeInTheDocument()
  })

  it('calls onSend with trimmed text on submit', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)

    const input = screen.getByPlaceholderText('Type your message...')
    await user.type(input, '  hello world  ')
    await user.click(screen.getByRole('button'))

    expect(onSend).toHaveBeenCalledWith('hello world')
  })

  it('clears input after sending', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={() => {}} />)

    const input = screen.getByPlaceholderText('Type your message...')
    await user.type(input, 'test message')
    await user.click(screen.getByRole('button'))

    expect(input).toHaveValue('')
  })

  it('does not send empty or whitespace-only messages', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)

    const input = screen.getByPlaceholderText('Type your message...')
    await user.type(input, '   ')
    await user.click(screen.getByRole('button'))

    expect(onSend).not.toHaveBeenCalled()
  })

  it('disables input and button when disabled prop is true', () => {
    render(<ChatInput onSend={() => {}} disabled={true} />)
    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled()
  })

  it('has maxLength of 2000', () => {
    render(<ChatInput onSend={() => {}} />)
    const input = screen.getByPlaceholderText('Type your message...')
    expect(input).toHaveAttribute('maxLength', '2000')
  })

  it('submits on Enter key', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    render(<ChatInput onSend={onSend} />)

    const input = screen.getByPlaceholderText('Type your message...')
    await user.type(input, 'hello{Enter}')

    expect(onSend).toHaveBeenCalledWith('hello')
  })
})
