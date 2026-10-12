"use client";
import { useRef, useState } from "react";
import { usePendingAction } from "@/hooks/use-pending-action";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { FormFeedback } from "@/components/form-feedback";
import type { ActionResult } from "@/lib/action-result";
import { useRouter } from "next/navigation";
import { trackingAction } from "@/app/tracker/actions";
import { transitions, statusLabels, type TrackingStatus } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
type FollowUpView = {
  id: string;
  revision: number;
  label: string;
  date: string;
  state: string;
};
export function TrackingControls({
  id,
  revision,
  status,
  nextStep,
  today,
  followUps,
}: {
  id: string;
  revision: number;
  status: TrackingStatus;
  nextStep: string;
  today: string;
  followUps: FollowUpView[];
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const { pending, active, begin, finish } = usePendingAction();
  const returnFocus = useRef<HTMLElement | null>(null);
  const [confirm, setConfirm] = useState<{
    data: Record<string, unknown>;
    title: string;
    description: string;
    label: string;
    pendingLabel: string;
  } | null>(null);
  useUnsavedChanges(dirty);
  function actionKey(data: Record<string, unknown>) {
    return `${data.operation}:${data.followUpId ?? data.status ?? ""}`;
  }
  async function send(data: Record<string, unknown>) {
    if (!begin(actionKey(data))) return;
    setResult(null);
    try {
      const response = await trackingAction({
        id,
        expectedRevision: revision,
        ...data,
      });
      setResult(response);
      if (response.ok) {
        setConfirm(null);
        setDirty(false);
        router.refresh();
      }
    } catch {
      setResult({
        ok: false,
        message:
          "Tracking could not be saved. Your edits are retained. Check the local services and try again.",
      });
    } finally {
      finish();
    }
  }
  function requestConfirmation(
    value: NonNullable<typeof confirm>,
    trigger: HTMLElement | null,
  ) {
    if (pending) return;
    returnFocus.current = trigger;
    setResult(null);
    setConfirm(value);
  }
  const allowed = transitions[status];
  return (
    <div
      className="min-w-0 space-y-4 [overflow-wrap:anywhere]"
      onChange={() => setDirty(true)}
    >
      <FormFeedback result={confirm ? null : result} />
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        {allowed.includes("APPLIED") && (
          <form
            className="panel space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (form.get("confirmed") !== "on") {
                setResult({
                  ok: false,
                  message:
                    "Confirm that you submitted this application yourself before marking it Applied.",
                });
                return;
              }
              void send({
                operation: "status",
                status: "APPLIED",
                date: form.get("date"),
                confirmed: form.get("confirmed") === "on",
              });
            }}
          >
            <h2>Mark as applied</h2>
            <p className="text-sm text-text-muted">
              Record an application you already submitted yourself. Preparing
              materials or opening a listing never records Applied.
            </p>
            <label className="field-label" htmlFor="applied-date">
              Application date (Asia/Kolkata)
            </label>
            <input
              id="applied-date"
              name="date"
              type="date"
              max={today}
              defaultValue={today}
              required
              className="field-input"
            />
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input name="confirmed" type="checkbox" required />I confirm I
              submitted this application myself.
            </label>
            <Button loading={active === "status:APPLIED"}>
              {active === "status:APPLIED" ? "Recording…" : "Mark as applied"}
            </Button>
          </form>
        )}
        {allowed.some((s) => s !== "APPLIED") && (
          <form
            className="panel space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (form.get("confirmed") !== "on") {
                setResult({
                  ok: false,
                  message:
                    "Review and confirm this status change before saving.",
                });
                return;
              }
              const data = {
                operation: "status",
                status: form.get("status"),
                confirmed: true,
                date: "",
              };
              if (data.status === "ARCHIVED") {
                requestConfirmation(
                  {
                    data,
                    title: "Archive this application?",
                    description:
                      "This moves the application to Archived. All notes, saved drafts, and status history are retained. You can restore its previous status from the tracker.",
                    label: "Archive application",
                    pendingLabel: "Archiving…",
                  },
                  event.currentTarget.querySelector(
                    'button[type="submit"], button:not([type])',
                  ),
                );
              } else void send(data);
            }}
          >
            <h2>Update status</h2>
            <label className="field-label" htmlFor="tracking-status">
              Next status
            </label>
            <select id="tracking-status" name="status" className="field-input">
              {allowed
                .filter((s) => s !== "APPLIED")
                .map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
            </select>
            <p className="field-hint">
              Ready to apply requires a current reviewed draft with all
              unanswered questions and warnings resolved. Archive preserves
              history.
            </p>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input name="confirmed" type="checkbox" required />I have reviewed
              and confirm this status change.
            </label>
            <Button
              variant="secondary"
              loading={
                !confirm &&
                active !== "status:APPLIED" &&
                active?.startsWith("status:")
              }
            >
              {!confirm &&
              active !== "status:APPLIED" &&
              active?.startsWith("status:")
                ? "Saving…"
                : "Save status"}
            </Button>
          </form>
        )}
        {status === "ARCHIVED" && (
          <form
            className="panel space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              send({ operation: "restore", confirmed: true });
            }}
          >
            <h2>Restore tracking</h2>
            <p className="field-hint">
              Returns to the recorded status before archive. A draft may need
              review first.
            </p>
            <Button variant="secondary" loading={active === "restore:"}>
              {active === "restore:" ? "Restoring…" : "Restore previous status"}
            </Button>
          </form>
        )}
        <form
          className="panel space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            send({
              operation: "nextStep",
              nextStep: new FormData(event.currentTarget).get("nextStep"),
            });
          }}
        >
          <h2>Next step</h2>
          <label className="field-label" htmlFor="next-step">
            Your next step (user-provided)
          </label>
          <textarea
            id="next-step"
            name="nextStep"
            defaultValue={nextStep}
            maxLength={1000}
            className="field-input"
          />
          <Button variant="secondary" loading={active === "nextStep:"}>
            {active === "nextStep:" ? "Saving…" : "Save next step"}
          </Button>
        </form>
        <form
          className="panel space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            send({
              operation: "note",
              note: new FormData(event.currentTarget).get("note"),
            });
          }}
        >
          <h2>Add a note</h2>
          <label className="field-label" htmlFor="tracking-note">
            Your note (user-provided)
          </label>
          <textarea
            id="tracking-note"
            name="note"
            maxLength={5000}
            required
            className="field-input"
          />
          <Button variant="secondary" loading={active === "note:"}>
            {active === "note:" ? "Saving…" : "Save note to history"}
          </Button>
        </form>
        <form
          className="panel space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            send({
              operation: "followUp",
              label: form.get("label"),
              date: form.get("date"),
            });
          }}
        >
          <h2>Add a follow-up</h2>
          <label className="field-label" htmlFor="follow-label">
            Label
          </label>
          <input
            id="follow-label"
            name="label"
            maxLength={300}
            required
            className="field-input"
          />
          <label className="field-label" htmlFor="follow-date">
            Due date (Asia/Kolkata)
          </label>
          <input
            id="follow-date"
            name="date"
            type="date"
            required
            className="field-input"
          />
          <Button variant="secondary" loading={active === "followUp:"}>
            {active === "followUp:" ? "Adding…" : "Add follow-up"}
          </Button>
          <p className="field-hint">
            Local reminders only; no messages or scheduled notifications are
            sent.
          </p>
        </form>
        {followUps.map((f) => (
          <section key={f.id} className="panel space-y-3">
            <h3>{f.label}</h3>
            <p className="text-sm text-text-muted">
              {f.date} · {f.state} · User-provided
            </p>
            {f.state === "Pending" && (
              <>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    send({
                      operation: "followUp",
                      followUpId: f.id,
                      followUpRevision: f.revision,
                      label: form.get("label"),
                      date: form.get("date"),
                    });
                  }}
                >
                  <label className="field-label" htmlFor={`label-${f.id}`}>
                    Edit label
                  </label>
                  <input
                    id={`label-${f.id}`}
                    name="label"
                    defaultValue={f.label}
                    maxLength={300}
                    required
                    className="field-input"
                  />
                  <label className="field-label" htmlFor={`date-${f.id}`}>
                    Edit due date
                  </label>
                  <input
                    id={`date-${f.id}`}
                    name="date"
                    defaultValue={f.date}
                    type="date"
                    required
                    className="field-input"
                  />
                  <Button
                    variant="secondary"
                    loading={active === `followUp:${f.id}`}
                  >
                    {active === `followUp:${f.id}`
                      ? "Saving…"
                      : "Save follow-up"}
                  </Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={(event) =>
                      requestConfirmation(
                        {
                          data: {
                            operation: "completeFollowUp",
                            followUpId: f.id,
                            followUpRevision: f.revision,
                            confirmed: true,
                          },
                          title: "Complete this follow-up?",
                          description: `“${f.label}” will be recorded as completed. It will leave the pending reminder list, and its history is retained. No message is sent.`,
                          label: "Complete follow-up",
                          pendingLabel: "Completing…",
                        },
                        event.currentTarget,
                      )
                    }
                  >
                    Complete
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={(event) =>
                      requestConfirmation(
                        {
                          data: {
                            operation: "cancelFollowUp",
                            followUpId: f.id,
                            followUpRevision: f.revision,
                            confirmed: true,
                          },
                          title: "Cancel this follow-up?",
                          description: `“${f.label}” will leave the pending reminder list. Its history is retained. No message is sent.`,
                          label: "Cancel follow-up",
                          pendingLabel: "Cancelling…",
                        },
                        event.currentTarget,
                      )
                    }
                  >
                    Cancel follow-up
                  </Button>
                </div>
              </>
            )}
          </section>
        ))}
      </fieldset>
      <ConfirmationDialog
        open={confirm !== null}
        title={confirm?.title ?? "Confirm change"}
        description={confirm?.description ?? ""}
        confirmLabel={confirm?.label ?? "Save change"}
        pendingLabel={confirm?.pendingLabel ?? "Saving…"}
        destructive={confirm?.data.operation !== "completeFollowUp"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => (confirm ? send(confirm.data) : undefined)}
        pending={pending}
        result={result}
        returnFocus={returnFocus}
      />
    </div>
  );
}
