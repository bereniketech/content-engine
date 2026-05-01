import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStep = "research" | "seo" | "blog" | "images" | "social-x";

interface PipelineStepperProps {
  current: PipelineStep;
  onNavigate?: (step: string) => void;
}

const STEPS = [
  { id: "research", label: "Research" },
  { id: "seo",      label: "SEO" },
  { id: "blog",     label: "Write" },
  { id: "images",   label: "Images" },
  { id: "social-x", label: "Distribute" },
];

const STEP_ORDER: Record<string, number> = {
  research: 0,
  seo:      1,
  blog:     2,
  images:   3,
  "social-x": 4,
};

export function PipelineStepper({ current, onNavigate }: PipelineStepperProps) {
  const currentIndex = STEP_ORDER[current] ?? 0;

  return (
    <div className="bg-card rounded-md shadow-sm border border-foreground-4/20 flex items-center px-2 py-1.5 mb-7 gap-1 overflow-x-auto">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isActive    = idx === currentIndex;
        const isPending   = idx > currentIndex;

        return (
          <div key={step.id} className="flex items-center gap-1">
            <button
              onClick={() => onNavigate?.(step.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-sm px-3.5 py-2 whitespace-nowrap text-sm font-medium transition-colors duration-[120ms]",
                isActive    && "bg-primary/10 text-primary font-semibold",
                isCompleted && "text-primary hover:bg-primary/5",
                isPending   && "text-foreground-3 hover:text-foreground-2"
              )}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className={cn(
                  "inline-block w-2 h-2 rounded-full",
                  isActive  && "bg-primary",
                  isPending && "bg-foreground-4/60"
                )} />
              )}
              {step.label}
            </button>

            {idx < STEPS.length - 1 && (
              <div className={cn(
                "h-0.5 w-7 rounded-full",
                isCompleted ? "bg-primary" : "bg-foreground-4/60"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
