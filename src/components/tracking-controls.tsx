"use client";
import { useState, useTransition } from "react";
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
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  useUnsavedChanges(dirty);
  const send = (data: Record<string, unknown>) =>
    startTransition(async () => {
      const result = await trackingAction({
        id,
        expectedRevision: revision,
        ...data,
      });
      setMessage(result.message);
      if (result.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  const allowed = transitions[status];
  return (
    <div
      className="min-w-0 space-y-4 [overflow-wrap:anywhere]"
      onChange={() => setDirty(true)}
    >
      <p role="status" aria-live="polite" className="text-sm text-text-muted">
        {message}
      </p>
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        {allowed.includes("APPLIED") && (
          <form
            className="panel space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              send({
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
            <Button>Mark as applied</Button>
          </form>
        )}
        {allowed.some((s) => s !== "APPLIED") && (
          <form
            className="panel space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (
                form.get("status") === "ARCHIVED" &&
                !window.confirm(
                  "Archive this application? Its history will be preserved.",
                )
              )
                return;
              send({
                operation: "status",
                status: form.get("status"),
                confirmed: form.get("confirmed") === "on",
                date: "",
              });
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
            <Button variant="secondary">Save status</Button>
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
            <Button variant="secondary">Restore previous status</Button>
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
          <Button variant="secondary">Save next step</Button>
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
          <Button variant="secondary">Save note to history</Button>
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
          <Button variant="secondary">Add follow-up</Button>
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
                  <Button variant="secondary">Save follow-up</Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (window.confirm("Mark this follow-up completed?"))
                        send({
                          operation: "completeFollowUp",
                          followUpId: f.id,
                          followUpRevision: f.revision,
                          confirmed: true,
                        });
                    }}
                  >
                    Complete
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Cancel this follow-up? History is preserved.",
                        )
                      )
                        send({
                          operation: "cancelFollowUp",
                          followUpId: f.id,
                          followUpRevision: f.revision,
                          confirmed: true,
                        });
                    }}
                  >
                    Cancel follow-up
                  </Button>
                </div>
              </>
            )}
          </section>
        ))}
      </fieldset>
    </div>
  );
}
