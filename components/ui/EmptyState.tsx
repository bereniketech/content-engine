import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

// New interface — icon-based empty state used on Hub and other pages
interface IconEmptyStateProps {
  icon: LucideIcon;
  heading: string;
  body: string;
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  // Legacy props not used in this variant
  title?: never;
  description?: never;
  action?: never;
  variant?: never;
}

// Legacy interface — text-only empty state used throughout the app
interface TextEmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  variant?: 'muted' | 'info';
  // New props not used in this variant
  icon?: never;
  heading?: never;
  body?: never;
  cta?: never;
}

type EmptyStateProps = IconEmptyStateProps | TextEmptyStateProps;

export function EmptyState(props: EmptyStateProps) {
  // Icon-based variant
  if ('icon' in props && props.icon) {
    const { icon: Icon, heading, body, cta } = props;
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{heading}</h3>
          <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
        </div>
        {cta && (
          cta.href ? (
            <Button asChild>
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ) : (
            <Button onClick={cta.onClick}>{cta.label}</Button>
          )
        )}
      </div>
    );
  }

  // Legacy text-only variant
  const { title, description, action, variant = 'muted' } = props as TextEmptyStateProps;
  const containerClass =
    variant === 'info'
      ? 'rounded-lg border border-primary/20 bg-primary/5 p-8 text-center'
      : 'rounded-lg border border-dashed border-border p-8 text-center';

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
  );
}
