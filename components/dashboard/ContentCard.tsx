import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionBar } from "@/components/dashboard/ActionBar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ContentCardProps {
  title: string;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
  onCopy?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
}

export function ContentCard({
  title,
  badge,
  children,
  className,
  onCopy,
  onEdit,
  onRegenerate,
}: ContentCardProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="min-h-24 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {children ?? (
            <span className="italic">No content generated yet.</span>
          )}
        </div>
        <ActionBar onCopy={onCopy} onEdit={onEdit} onRegenerate={onRegenerate} />
      </CardContent>
    </Card>
  );
}
