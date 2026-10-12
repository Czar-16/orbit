import { Check, User, Sparkles, CircleHelp } from "lucide-react";
import type { Evidence } from "@/lib/provenance";
import { cn } from "@/lib/utils";
export function ProvenanceBadge({
  provenance,
}: {
  provenance: Evidence["provenance"];
}) {
  const options = {
    verified: {
      label: "Verified",
      icon: Check,
      className: "border-success/30 bg-success-soft text-success",
      title: "Confirmed by you or supported by official evidence.",
    },
    "user-provided": {
      label: "User-provided",
      icon: User,
      className: "border-border-strong bg-surface-2 text-text-muted",
      title: "Entered or pasted by you.",
    },
    inferred: {
      label: "Inferred",
      icon: Sparkles,
      className: "border-warning/30 bg-warning-soft text-warning",
      title: "Estimated, not confirmed by the employer.",
    },
    unknown: {
      label: "Unknown",
      icon: CircleHelp,
      className: "border-dashed border-border-strong text-text-muted",
      title: "Needs your input.",
    },
  };
  const option = options[provenance];
  return (
    <span
      title={option.title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm",
        option.className,
      )}
    >
      <option.icon size={12} aria-hidden="true" />
      {option.label}
    </span>
  );
}
