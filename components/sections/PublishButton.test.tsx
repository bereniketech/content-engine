/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PublishButton } from './PublishButton'

jest.mock('lucide-react', () => ({
  Check: () => <span data-testid="icon-check" />,
  Loader2: () => <span data-testid="icon-loader" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  Send: () => <span data-testid="icon-send" />,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

jest.mock('@/lib/auth-browser', () => ({
  getAuthToken: jest.fn().mockResolvedValue('test-token'),
}))

jest.mock('@/lib/platform-config', () => ({
  PUBLISH_ENDPOINT_MAP: {
    x: '/api/publish/x',
    linkedin: '/api/publish/linkedin',
    instagram: '/api/publish/instagram',
    reddit: '/api/publish/reddit',
    newsletter: '/api/publish/newsletter',
    newsletter_mailchimp: '/api/publish/newsletter',
    newsletter_sendgrid: '/api/publish/newsletter',
  },
}))

describe('PublishButton', () => {
  const defaultProps = {
    platform: 'x' as const,
    sessionId: 'sess-123',
    payload: { content: 'test' },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders idle state with post button', () => {
    render(<PublishButton {...defaultProps} />)
    expect(screen.getByRole('button', { name: /post to x/i })).toBeInTheDocument()
  })

  it('uses custom label when provided', () => {
    render(<PublishButton {...defaultProps} label="Publish Now" />)
    expect(screen.getByRole('button', { name: /publish now/i })).toBeInTheDocument()
  })

  it('shows success state after successful publish', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { logId: 'log-1' } }),
    })

    const onSuccess = jest.fn()
    render(<PublishButton {...defaultProps} onSuccess={onSuccess} />)

    fireEvent.click(screen.getByRole('button', { name: /post to x/i }))

    await waitFor(() => {
      expect(screen.getByText(/posted at/i)).toBeInTheDocument()
    })
    expect(onSuccess).toHaveBeenCalledWith({ logId: 'log-1' })
  })

  it('shows already published state on 409 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({}),
    })

    render(<PublishButton {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /post to x/i }))

    await waitFor(() => {
      expect(screen.getByText(/already posted/i)).toBeInTheDocument()
    })
  })

  it('shows error state on failed publish', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { message: 'Server error' } }),
    })

    const onError = jest.fn()
    render(<PublishButton {...defaultProps} onError={onError} />)
    fireEvent.click(screen.getByRole('button', { name: /post to x/i }))

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
    expect(onError).toHaveBeenCalledWith('Server error')
  })

  it('shows retry button after error and resets to idle on retry click', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { message: 'Failed' } }),
    })

    render(<PublishButton {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /post to x/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(screen.getByRole('button', { name: /post to x/i })).toBeInTheDocument()
  })
})
