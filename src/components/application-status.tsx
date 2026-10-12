import { statusLabels, type TrackingStatus } from "@/lib/tracking";
import { cn } from "@/lib/utils";
export function ApplicationStatusBadge({ status }: { status: TrackingStatus }) {
  const tone = ["APPLIED", "INTERVIEW", "OFFER"].includes(status)
    ? "text-success border-success/30 bg-success-soft"
    : status === "REJECTED"
      ? "text-danger border-danger/30 bg-danger-soft"
      : status === "NEEDS_REVIEW"
        ? "text-warning border-warning/30 bg-warning-soft"
        : ["DRAFT_READY", "READY_TO_APPLY"].includes(status)
          ? "text-accent border-accent/30 bg-accent-soft"
          : status === "SAVED"
            ? "text-info border-info/30 bg-info-soft"
            : "text-text-muted border-border-strong bg-surface-2";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs",
        tone,
      )}
    >
      <span aria-hidden="true">●</span>
      {statusLabels[status]}
    </span>
  );
}
