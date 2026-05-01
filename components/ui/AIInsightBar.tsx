import { Lightbulb } from "lucide-react";
import { Button } from "./button";

interface AIInsightBarProps {
  title: string;
  description: string;
  onApply?: () => void;
  onDismiss?: () => void;
}

export function AIInsightBar({
  title,
  description,
  onApply,
  onDismiss,
}: AIInsightBarProps) {
  return (
    <div
      className="rounded-xl border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      style={{
        background: "linear-gradient(to right, rgba(29,158,117,0.05), rgba(55,138,221,0.05))",
        borderColor: "rgba(29,158,117,0.2)",
      }}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-sm mb-0.5">{title}</h3>
          <p className="text-[13px] text-foreground-2">{description}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
        <Button variant="default" size="sm" onClick={onApply}>
          Apply Strategy
        </Button>
      </div>
    </div>
  );
}
