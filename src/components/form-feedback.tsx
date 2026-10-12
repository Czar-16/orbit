import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
export function FormFeedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  const Icon = result.ok ? CheckCircle2 : AlertCircle;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      aria-live={result.ok ? "polite" : "assertive"}
      aria-atomic="true"
      className={`mt-4 flex min-w-0 items-start gap-2 rounded-[14px] border p-3 text-sm [overflow-wrap:anywhere] ${result.ok ? "border-success-border bg-success-soft" : "border-danger-border bg-danger-soft"}`}
    >
      <Icon
        size={18}
        className={`mt-0.5 shrink-0 ${result.ok ? "text-success" : "text-danger"}`}
        aria-hidden="true"
      />
      <span className="min-w-0 text-text">{result.message}</span>
    </p>
  );
}
