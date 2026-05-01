import { cn } from "@/lib/utils";

export type StatusVariant = "published" | "review" | "draft" | "scheduled";

interface StatusBadgeProps {
  status: StatusVariant;
  children?: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const variants: Record<StatusVariant, string> = {
    published: "bg-primary/10 text-primary",
    review:    "bg-warning/10 text-warning",
    draft:     "bg-surface-mid text-foreground-3",
    scheduled: "bg-secondary/10 text-secondary",
  };

  const displayText: Record<StatusVariant, string> = {
    published: "Published",
    review:    "In Review",
    draft:     "Draft",
    scheduled: "Scheduled",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        variants[status]
      )}
    >
      {children ?? displayText[status]}
    </span>
  );
}
