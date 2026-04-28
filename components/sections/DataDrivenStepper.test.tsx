/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataDrivenStepper, type StepConfig } from './DataDrivenStepper'

jest.mock('lucide-react', () => ({
  CheckCircle2: () => <span data-testid="icon-check" />,
  Circle: () => <span data-testid="icon-circle" />,
  Loader2: () => <span data-testid="icon-loader" />,
  RotateCcw: () => <span data-testid="icon-retry" />,
  XCircle: () => <span data-testid="icon-x" />,
  ChevronDown: () => <span data-testid="icon-chevron" />,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

const makeStep = (overrides: Partial<StepConfig> = {}): StepConfig => ({
  label: 'Test Step',
  status: 'pending',
  content: undefined,
  ...overrides,
})

describe('DataDrivenStepper', () => {
  const noop = jest.fn()

  beforeEach(() => {
    noop.mockClear()
  })

  describe('status icons', () => {
    it('renders circle icon for pending status', () => {
      render(
        <DataDrivenStepper
          steps={[makeStep({ status: 'pending', label: 'Step A' })]}
          currentStepIndex={-1}
          onRegenerate={noop}
        />
      )
      expect(screen.getByTestId('icon-circle')).toBeInTheDocument()
    })

    it('renders loader icon for in-progress status', () => {
      render(
        <DataDrivenStepper
          steps={[makeStep({ status: 'in-progress', label: 'Loading Step' })]}
          currentStepIndex={0}
          onRegenerate={noop}
        />
      )
      expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
    })

    it('renders check icon for complete status', () => {
      render(
        <DataDrivenStepper
          steps={[makeStep({ status: 'complete', label: 'Done Step' })]}
          currentStepIndex={-1}
          onRegenerate={noop}
        />
      )
      expect(screen.getByTestId('icon-check')).toBeInTheDocument()
    })

    it('renders x icon for error status', () => {
      render(
        <DataDrivenStepper
          steps={[makeStep({ status: 'error', label: 'Error Step' })]}
          currentStepIndex={-1}
          onRegenerate={noop}
        />
      )
      expect(screen.getByTestId('icon-x')).toBeInTheDocument()
    })

    it('renders all step labels', () => {
      const labels = ['Assess', 'Research', 'Article', 'SEO', 'Distribution']
      const steps: StepConfig[] = labels.map((label, i) => ({
        label,
        status: ['pending', 'in-progress', 'complete', 'error', 'pending'][i] as StepConfig['status'],
      }))

      render(
        <DataDrivenStepper steps={steps} currentStepIndex={1} onRegenerate={noop} />
      )

      for (const label of labels) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }
    })
  })

  describe('Regenerate button', () => {
    it('shows Regenerate button when step is complete', () => {
      render(
        <DataDrivenStepper
          steps={[makeStep({ status: 'complete', label: 'Done Step' })]}
          currentStepIndex={-1}
          onRegenerate={noop}
        />
      )
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
    })

    it('shows Regenerate button when step is error', () => {
      render(
        <DataDrivenStepper
          steps={[makeStep({ status: 'error', label: 'Error Step' })]}
          currentStepIndex={-1}
          onRegenerate={noop}
        />
      )
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
    })

    it('does not show Regenerate button when step is pending', () => {
      render(
        <DataDrivenStepper
          steps={[makeStep({ status: 'pending', label: 'Waiting Step' })]}
          currentStepIndex={-1}
          onRegenerate={noop}
        />
      )
      expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument()
    })

    it('does not show Regenerate button when step is in-progress', () => {
      render(
        <DataDrivenStepper
          steps={[makeStep({ status: 'in-progress', label: 'Running Step' })]}
          currentStepIndex={0}
          onRegenerate={noop}
        />
      )
      expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument()
    })

    it('calls onRegenerate with the correct step index', () => {
      const steps: StepConfig[] = [
        makeStep({ status: 'complete', label: 'Step 0' }),
        makeStep({ status: 'complete', label: 'Step 1' }),
        makeStep({ status: 'pending', label: 'Step 2' }),
      ]

      render(
        <DataDrivenStepper steps={steps} currentStepIndex={0} onRegenerate={noop} />
      )

      const regenerateButtons = screen.getAllByRole('button', { name: /regenerate/i })
      expect(regenerateButtons).toHaveLength(2)

      fireEvent.click(regenerateButtons[1])
      expect(noop).toHaveBeenCalledWith(1)
    })
  })

  describe('accordion toggle', () => {
    it('renders step content when step is open by default (first step)', () => {
      render(
        <DataDrivenStepper
          steps={[makeStep({ status: 'complete', label: 'Open Step', content: <p>Step content here</p> })]}
          currentStepIndex={-1}
          onRegenerate={noop}
        />
      )
      expect(screen.getByText('Step content here')).toBeInTheDocument()
    })

    it('toggles step open/closed when header button is clicked', () => {
      render(
        <DataDrivenStepper
          steps={[makeStep({ status: 'pending', label: 'Toggle Step', content: <p>Hidden content</p> })]}
          currentStepIndex={-1}
          onRegenerate={noop}
        />
      )

      // Pending step at index > 0 defaults to closed
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()

      fireEvent.click(screen.getByText('Toggle Step'))
      expect(screen.getByText('Hidden content')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Toggle Step'))
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })
  })
})
