import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContactListMessage from '../ContactListMessage'

const CONTACTS = [
  {
    id: '1',
    name: 'Alice Chen',
    role: 'CTO',
    company: 'AliceCo',
    location: 'NYC',
    bio: 'Tech leader',
    tags: ['engineering'],
    email: 'alice@alice.co',
  },
  {
    id: '2',
    name: 'Bob Lee',
    role: 'VP Sales',
    company: 'BobCorp',
    location: 'LA',
    bio: 'Sales expert',
    tags: ['sales'],
    email: 'bob@bob.co',
  },
]

describe('ContactListMessage', () => {
  it('renders all contacts', () => {
    render(<ContactListMessage contacts={CONTACTS} onContinue={() => {}} />)
    expect(screen.getByText('Alice Chen')).toBeInTheDocument()
    expect(screen.getByText('Bob Lee')).toBeInTheDocument()
  })

  it('shows continue button with correct count', () => {
    render(<ContactListMessage contacts={CONTACTS} onContinue={() => {}} />)
    expect(screen.getByText('Continue with 2 contacts')).toBeInTheDocument()
  })

  it('does not show continue button when onContinue is undefined', () => {
    render(<ContactListMessage contacts={CONTACTS} />)
    expect(screen.queryByText(/Continue with/)).not.toBeInTheDocument()
  })

  it('toggles remove/keep on contact and updates count', async () => {
    const user = userEvent.setup()
    render(<ContactListMessage contacts={CONTACTS} onContinue={() => {}} />)

    // Remove Alice
    const removeButtons = screen.getAllByText('Remove')
    await user.click(removeButtons[0])

    expect(screen.getByText('Continue with 1 contact')).toBeInTheDocument()
    expect(screen.getByText('Keep')).toBeInTheDocument()
  })

  it('re-adds a removed contact when clicking Keep', async () => {
    const user = userEvent.setup()
    render(<ContactListMessage contacts={CONTACTS} onContinue={() => {}} />)

    // Remove Alice
    const removeButtons = screen.getAllByText('Remove')
    await user.click(removeButtons[0])

    // Re-add Alice
    await user.click(screen.getByText('Keep'))
    expect(screen.getByText('Continue with 2 contacts')).toBeInTheDocument()
  })

  it('calls onContinue with kept contacts when continue is clicked', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<ContactListMessage contacts={CONTACTS} onContinue={onContinue} />)

    // Remove Bob (second remove button)
    const removeButtons = screen.getAllByText('Remove')
    await user.click(removeButtons[1])

    // Click continue
    await user.click(screen.getByText('Continue with 1 contact'))
    expect(onContinue).toHaveBeenCalledTimes(1)
    expect(onContinue).toHaveBeenCalledWith([CONTACTS[0]])
  })

  it('disables continue button when all contacts are removed', async () => {
    const user = userEvent.setup()
    render(<ContactListMessage contacts={CONTACTS} onContinue={() => {}} />)

    const removeButtons = screen.getAllByText('Remove')
    await user.click(removeButtons[0])
    await user.click(screen.getAllByText('Remove')[0])

    const continueBtn = screen.getByText('Continue with 0 contacts')
    expect(continueBtn).toBeDisabled()
  })
})
