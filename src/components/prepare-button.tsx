"use client";
import { usePendingAction } from "@/hooks/use-pending-action";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { prepareDraftAction } from "@/app/queue/actions";
import { type ActionResult } from "@/lib/action-result";
export function PrepareButton({
  jobId,
  disabled,
}: {
  jobId: string;
  disabled?: boolean;
}) {
  const { pending, begin, finish } = usePendingAction();
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();
  return (
    <div>
      <Button
        disabled={disabled || pending}
        loading={pending}
        title={
          disabled
            ? "Restore this job and resolve hard-filter conflicts before preparing."
            : "Prepare a deterministic draft from your verified profile and selected resume."
        }
        onClick={async () => {
          if (!begin()) return;
          setResult(null);
          try {
            const response = await prepareDraftAction({
              jobId,
              expectedRevision: 0,
            });
            setResult(response);
            if (response.ok && response.id)
              router.push(`/queue/${response.id}`);
          } catch {
            setResult({ ok: false, message: "Preparation failed. Try again." });
          } finally {
            finish();
          }
        }}
      >
        {pending ? "Preparing…" : "Prepare application"}
      </Button>
      <FormFeedback result={result} />
    </div>
  );
}
