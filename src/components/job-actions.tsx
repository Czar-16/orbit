"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";
import { jobStateAction, refreshMatchesAction } from "@/app/discover/actions";
import { type ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
export function JobActions({
  id,
  saved,
  hidden,
}: {
  id: string;
  saved: boolean;
  hidden: boolean;
}) {
  const router = useRouter();
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const { pending, active, begin, finish } = usePendingAction();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirm, setConfirm] = useState<"dismiss" | "archive" | null>(null);
  async function act(
    operation: "save" | "unsave" | "dismiss" | "archive" | "restore",
  ) {
    if (!begin(operation)) return;
    setResult(null);
    try {
      const response = await jobStateAction({ id, operation });
      setResult(response);
      if (response.ok) {
        setConfirm(null);
        router.refresh();
      }
    } catch {
      setResult({ ok: false, message: "The job update failed. Try again." });
    } finally {
      finish();
    }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          loading={active === "save" || active === "unsave"}
          disabled={pending}
          onClick={() => act(saved ? "unsave" : "save")}
        >
          {active === "save" || active === "unsave"
            ? "Saving…"
            : saved
              ? "Unsave"
              : "Save job"}
        </Button>
        {hidden ? (
          <Button
            variant="ghost"
            disabled={pending}
            loading={active === "restore"}
            onClick={() => act("restore")}
          >
            {active === "restore" ? "Restoring…" : "Restore job"}
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={(event) => {
                returnFocus.current = event.currentTarget;
                setResult(null);
                setConfirm("dismiss");
              }}
            >
              Dismiss
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={(event) => {
                returnFocus.current = event.currentTarget;
                setResult(null);
                setConfirm("archive");
              }}
            >
              Archive
            </Button>
          </>
        )}
      </div>
      <FormFeedback result={confirm ? null : result} />
      <ConfirmationDialog
        open={confirm !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => (confirm ? act(confirm) : undefined)}
        title={
          confirm === "archive" ? "Archive this job?" : "Dismiss this job?"
        }
        description={`This removes the job from active and saved lists. You can restore it from the ${confirm === "archive" ? "archived" : "dismissed"} filter. Job history is retained. No application status is changed.`}
        confirmLabel={confirm === "archive" ? "Archive job" : "Dismiss job"}
        pendingLabel={confirm === "archive" ? "Archiving…" : "Dismissing…"}
        pending={pending}
        result={result}
        returnFocus={returnFocus}
      />
    </div>
  );
}
export function RefreshMatches() {
  const { pending, begin, finish } = usePendingAction();
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();
  async function refresh() {
    if (!begin()) return;
    setResult(null);
    try {
      const response = await refreshMatchesAction();
      setResult(response);
      if (response.ok) router.refresh();
    } catch {
      setResult({ ok: false, message: "Match recording failed. Try again." });
    } finally {
      finish();
    }
  }
  return (
    <div>
      <Button variant="secondary" loading={pending} onClick={refresh}>
        {pending ? "Recording…" : "Record current matches"}
      </Button>
      <p className="field-hint">
        Records up to 200 recent jobs. Displayed scores always use your latest
        verified profile.
      </p>
      <FormFeedback result={result} />
    </div>
  );
}
