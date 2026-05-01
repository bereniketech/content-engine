"use client";

import { useState } from "react";
import { SocialPanel } from "@/components/sections/SocialPanel";
import { PipelineStepper } from "@/components/ui/PipelineStepper";
import { cn } from "@/lib/utils";

const CHANNELS = ["All", "X / Twitter", "LinkedIn", "Instagram", "Newsletter", "Medium"];

export default function MediumPage() {
  const [activeChannel, setActiveChannel] = useState("Medium");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Medium</h2>
        <p className="mt-1 text-sm text-foreground-2">Distribute your content to Medium.</p>
      </div>

      <PipelineStepper current="social-x" />

      <div className="flex flex-wrap gap-1.5">
        {CHANNELS.map((channel) => (
          <button
            key={channel}
            onClick={() => setActiveChannel(channel)}
            className={cn(
              "rounded-full border text-[13px] font-medium px-3.5 py-1.5 transition-colors duration-[120ms]",
              activeChannel === channel
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground-2 hover:border-primary/50"
            )}
          >
            {channel}
          </button>
        ))}
      </div>

      <SocialPanel platform="medium" />
    </div>
  );
}
