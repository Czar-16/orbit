"use client";
import { useState } from "react";
import { usePendingAction } from "@/hooks/use-pending-action";
import { FormFeedback } from "@/components/form-feedback";
import type { ActionResult } from "@/lib/action-result";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { runDailyAction } from "@/app/discover/discovery-actions";
import { Button } from "@/components/ui/button";
export function RunDailyButton({ available }: { available: boolean }) {
  const { pending, begin, finish } = usePendingAction();
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();
  return (
    <div>
      <Button
        aria-describedby="run-reason"
        disabled={!available || pending}
        loading={pending}
        variant="ghost"
        onClick={async () => {
          if (!begin()) return;
          setResult(null);
          try {
            const result = await runDailyAction();
            setResult(result);
            if (result.ok) router.refresh();
          } catch {
            setResult({
              ok: false,
              message:
                "Request failed. Check the local services and try again.",
            });
          } finally {
            finish();
          }
        }}
      >
        <Play size={15} aria-hidden="true" />
        {pending ? "Requesting…" : "Run now"}
      </Button>
      <div className="max-w-xs">
        <FormFeedback result={result} />
      </div>
    </div>
  );
}
