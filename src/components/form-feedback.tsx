import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
export function FormFeedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  const Icon = result.ok ? CheckCircle2 : AlertCircle;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={`mt-4 flex items-start gap-2 text-sm ${result.ok ? "text-success" : "text-danger"}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      {result.message}
    </p>
  );
}
