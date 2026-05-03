import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatCardProps {
  value: string | number;
  label: string;
  icon: React.ElementType;
  change?: string;
  changePositive?: boolean;
  iconColor?: "primary" | "secondary";
}

export function StatCard({
  value,
  label,
  icon: Icon,
  change,
  changePositive = true,
  iconColor = "primary",
}: StatCardProps) {
  return (
    <div className="bg-card rounded-lg shadow-md p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Icon
          className={cn(
            "h-[18px] w-[18px]",
            iconColor === "primary" ? "text-primary" : "text-secondary"
          )}
        />
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-[12px] font-medium",
            changePositive ? "text-primary" : "text-destructive"
          )}>
            {changePositive
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />
            }
            {change}
          </div>
        )}
      </div>

      <div className="text-2xl font-bold tabular-nums text-foreground leading-tight">
        {value}
      </div>
      {(value === "0" || value === 0) && (
        <Link
          href="/dashboard/new-session"
          className="text-xs text-primary hover:underline"
        >
          Get Started →
        </Link>
      )}

      <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-3">
        {label}
      </div>
    </div>
  );
}
