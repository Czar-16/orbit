"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
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
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirm, setConfirm] = useState<"dismiss" | "archive" | null>(null);
  async function act(
    operation: "save" | "unsave" | "dismiss" | "archive" | "restore",
  ) {
    setPending(true);
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
      setPending(false);
    }
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => act(saved ? "unsave" : "save")}
        >
          {saved ? "Unsave" : "Save job"}
        </Button>
        {hidden ? (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => act("restore")}
          >
            Restore job
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={(event) => {
                returnFocus.current = event.currentTarget;
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
                setConfirm("archive");
              }}
            >
              Archive
            </Button>
          </>
        )}
      </div>
      <FormFeedback result={confirm ? null : result} />
      <Dialog.Root
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirm(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/80" />
          <Dialog.Content
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (returnFocus.current?.isConnected) returnFocus.current.focus();
              else document.getElementById("main")?.focus();
            }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%_-_32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border-strong bg-surface-3 p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <Dialog.Title className="text-base font-semibold">
                {confirm === "archive"
                  ? "Archive this job?"
                  : "Dismiss this job?"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  variant="ghost"
                  disabled={pending}
                  aria-label="Close confirmation"
                >
                  <X size={18} aria-hidden="true" />
                </Button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-4 text-sm text-text-muted">
              This removes it from active and saved lists. You can restore it
              from the {confirm === "archive" ? "archived" : "dismissed"}{" "}
              filter. No application status is changed.
            </Dialog.Description>
            <FormFeedback result={result?.ok === false ? result : null} />
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="secondary" disabled={pending}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                className="bg-danger hover:bg-danger/80"
                disabled={pending || !confirm}
                onClick={() => confirm && act(confirm)}
              >
                {pending ? "Updating…" : "Confirm"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
export function RefreshMatches() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();
  async function refresh() {
    setPending(true);
    setResult(null);
    try {
      const response = await refreshMatchesAction();
      setResult(response);
      if (response.ok) router.refresh();
    } catch {
      setResult({ ok: false, message: "Match recording failed. Try again." });
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <Button variant="secondary" disabled={pending} onClick={refresh}>
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
