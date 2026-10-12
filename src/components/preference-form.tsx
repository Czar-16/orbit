"use client";
import { usePendingAction } from "@/hooks/use-pending-action";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  preferenceSchema,
  categories,
  type Preferences,
} from "@/lib/preferences";
import { savePreferencesAction } from "@/app/settings/actions";
import { type ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
export function PreferenceForm({
  values,
  revision,
}: {
  values: Preferences;
  revision: number;
}) {
  const [result, setResult] = useState<ActionResult | null>(null),
    [dirty, setDirty] = useState(false);
  const { pending, begin, finish } = usePendingAction();
  const router = useRouter();
  useUnsavedChanges(dirty);
  async function submit(form: FormData) {
    if (!begin()) return;
    setResult(null);
    const list = (name: string) =>
      String(form.get(name) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const raw = {
      weights: Object.fromEntries(
        categories.map((c) => [c, Number(form.get(c))]),
      ),
      roles: list("roles"),
      locations: list("locations"),
      arrangements: list("arrangements"),
      employmentTypes: list("employmentTypes"),
      paidOnly: form.get("paidOnly") === "on",
      minimumPay: String(form.get("minimumPay") ?? "").trim()
        ? Number(form.get("minimumPay"))
        : null,
      currency: form.get("currency"),
      period: form.get("period"),
      dailyLimit: Number(form.get("dailyLimit")),
    };
    const parsed = preferenceSchema.safeParse(raw);
    try {
      if (!parsed.success) {
        setResult({
          ok: false,
          message: parsed.error.issues[0]?.message ?? "Check fields",
        });
        return;
      }
      const response = await savePreferencesAction({
        values: parsed.data,
        expectedRevision: revision,
      });
      setResult(response);
      if (response.ok) {
        setDirty(false);
        router.refresh();
      }
    } catch {
      setResult({ ok: false, message: "Save failed. Try again." });
    } finally {
      finish();
    }
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
      onChange={() => setDirty(true)}
    >
      <p className="mb-4 text-sm text-text-muted">
        {revision
          ? `Preference revision ${revision}; user-provided choices.`
          : "Default suggestions from the project brief; save your choices."}{" "}
        Weights total 100. Unknown categories remain unknown.
      </p>
      <fieldset disabled={pending} className="min-w-0">
        <div className="form-grid">
          {categories.map((c) => (
            <label key={c} className="field-label">
              {c} weight
              <input
                name={c}
                type="number"
                min="0"
                max="100"
                defaultValue={values.weights[c]}
                className="field-input"
                required
              />
            </label>
          ))}
          {(
            ["roles", "locations", "arrangements", "employmentTypes"] as const
          ).map((key) => (
            <label className="field-label" key={key}>
              {key} (comma-separated)
              <input
                name={key}
                defaultValue={values[key].join(", ")}
                className="field-input"
              />
            </label>
          ))}
          <label className="field-label">
            Minimum pay (blank if no minimum)
            <input
              name="minimumPay"
              type="number"
              min="0"
              step="0.01"
              defaultValue={values.minimumPay ?? ""}
              className="field-input"
            />
          </label>
          <label className="field-label">
            Currency
            <input
              name="currency"
              defaultValue={values.currency}
              className="field-input"
              required
            />
          </label>
          <label className="field-label">
            Pay period
            <select
              name="period"
              defaultValue={values.period}
              className="field-input"
            >
              {["hour", "month", "year"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Daily relevant-job limit
            <input
              name="dailyLimit"
              type="number"
              min="1"
              max="100"
              defaultValue={values.dailyLimit}
              className="field-input"
              required
            />
          </label>
        </div>
        <label className="my-4 flex min-h-11 items-center gap-2 text-sm">
          <input
            name="paidOnly"
            type="checkbox"
            defaultChecked={values.paidOnly}
          />
          Paid positions only
        </label>
        <p className="field-hint">
          Arrangements: remote, hybrid, on-site. Employment: full-time,
          part-time, contract, internship, temporary.
        </p>
        <Button loading={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </fieldset>
      <FormFeedback result={result} />
    </form>
  );
}
