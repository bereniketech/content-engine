/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SocialEditableBlock } from './SocialEditableBlock'

jest.mock('lucide-react', () => ({
  Check: () => <span data-testid="icon-check" />,
  Copy: () => <span data-testid="icon-copy" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Save: () => <span data-testid="icon-save" />,
  X: () => <span data-testid="icon-x" />,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('SocialEditableBlock', () => {
  const defaultProps = {
    title: 'X Post',
    value: 'Sample social content',
    onSave: jest.fn(),
    onRegenerate: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the title and value', () => {
    render(<SocialEditableBlock {...defaultProps} />)
    expect(screen.getByText('X Post')).toBeInTheDocument()
    expect(screen.getByText('Sample social content')).toBeInTheDocument()
  })

  it('shows edit and copy buttons in idle state', () => {
    render(<SocialEditableBlock {...defaultProps} />)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('enters edit mode and shows save/cancel when Edit is clicked', () => {
    render(<SocialEditableBlock {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('calls onSave with trimmed draft when Save is clicked', () => {
    render(<SocialEditableBlock {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: '  Updated content  ' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(defaultProps.onSave).toHaveBeenCalledWith('Updated content')
  })

  it('resets draft and exits edit mode when Cancel is clicked', () => {
    render(<SocialEditableBlock {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /edit/i }))

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Discarded change' } })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByText('Sample social content')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('calls onRegenerate when Regenerate is clicked', () => {
    render(<SocialEditableBlock {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    expect(defaultProps.onRegenerate).toHaveBeenCalled()
  })

  it('disables Regenerate button when isRegenerating is true', () => {
    render(<SocialEditableBlock {...defaultProps} isRegenerating={true} />)
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeDisabled()
  })

  it('shows "No content yet." when value is empty', () => {
    render(<SocialEditableBlock {...defaultProps} value="" />)
    expect(screen.getByText('No content yet.')).toBeInTheDocument()
  })
})
