"use client";

import { Copy, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionBarProps {
  onCopy?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
}

export function ActionBar({ onCopy, onEdit, onRegenerate }: ActionBarProps) {
  return (
    <div className="flex items-center gap-2 pt-3 border-t border-border">
      <Button
        variant="outline"
        size="sm"
        onClick={onCopy}
        className="gap-1.5"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="gap-1.5"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onRegenerate}
        className="gap-1.5"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Regenerate
      </Button>
    </div>
  );
}
