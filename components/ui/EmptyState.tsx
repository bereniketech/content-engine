import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
  variant?: 'muted' | 'info'
}

export function EmptyState({ title, description, action, variant = 'muted' }: EmptyStateProps) {
  const containerClass =
    variant === 'info'
      ? 'rounded-lg border border-primary/20 bg-primary/5 p-8 text-center'
      : 'rounded-lg border border-dashed border-border p-8 text-center'

  return (
    <div className={containerClass}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-foreground-3">{description}</p>}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
