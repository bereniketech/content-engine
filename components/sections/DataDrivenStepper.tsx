'use client'

import { useState, type ReactNode } from 'react'
import { CheckCircle2, ChevronDown, Circle, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface StepConfig {
  label: string
  status: 'pending' | 'in-progress' | 'complete' | 'error'
  content?: ReactNode
}

interface DataDrivenStepperProps {
  steps: StepConfig[]
  currentStepIndex: number
  onRegenerate: (stepIndex: number) => void
}

function getStatusIcon(status: StepConfig['status']) {
  if (status === 'in-progress') {
    return <Loader2 className="h-5 w-5 animate-spin text-primary" />
  }

  if (status === 'complete') {
    return <CheckCircle2 className="h-5 w-5 text-green-600" />
  }

  if (status === 'error') {
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  return <Circle className="h-5 w-5 text-muted-foreground" />
}

export function DataDrivenStepper({ steps, currentStepIndex, onRegenerate }: DataDrivenStepperProps) {
  const [openStepIndices, setOpenStepIndices] = useState<Record<number, boolean>>({
    0: true,
  })

  const toggleStep = (stepIndex: number) => {
    setOpenStepIndices((current) => ({
      ...current,
      [stepIndex]: !current[stepIndex],
    }))
  }

  return (
    <div className="space-y-4">
      {steps.map((step, stepIndex) => {
        const isCurrent = stepIndex === currentStepIndex
        const isOpen = openStepIndices[stepIndex] ?? (isCurrent || step.status !== 'pending')
        const showRegenerate = step.status === 'complete' || step.status === 'error'

        return (
          <Card
            key={step.label}
            className={cn('overflow-hidden border', {
              'border-primary/50': isCurrent,
              'border-red-300': step.status === 'error',
            })}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => toggleStep(stepIndex)}
                >
                  {getStatusIcon(step.status)}
                  <CardTitle className="text-base">{step.label}</CardTitle>
                  <ChevronDown
                    className={cn('ml-auto h-4 w-4 transition-transform', {
                      'rotate-180': isOpen,
                    })}
                  />
                </button>

                {showRegenerate ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onRegenerate(stepIndex)}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                ) : null}
              </div>
            </CardHeader>

            {isOpen ? (
              <CardContent>
                {step.content ?? (
                  <p className="text-sm text-muted-foreground">
                    {step.status === 'pending'
                      ? 'Waiting for this step to start.'
                      : 'Step is processing.'}
                  </p>
                )}
              </CardContent>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}
