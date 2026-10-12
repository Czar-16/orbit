"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { usePendingAction } from "@/hooks/use-pending-action";
import {
  sections,
  profileConflicts,
  type SourceContent,
  type SourceItem,
} from "@/lib/resume-content";
import { type ProfileFacts } from "@/lib/profile-schema";
import { type ActionResult } from "@/lib/action-result";
import { reviewSourceAction } from "@/app/queue/resume-actions";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { ProvenanceBadge } from "@/components/provenance-badge";
export function ResumeSourceReview({
  id,
  revision,
  initial,
  facts,
  editable = true,
}: {
  id: string;
  revision: number;
  initial: SourceContent;
  facts: ProfileFacts;
  editable?: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isDirty },
  } = useForm<SourceContent>({ defaultValues: initial });
  const items = useWatch({ control, name: "items" });
  const conflicts = profileConflicts({ ...initial, items }, facts);
  const { pending, begin, finish } = usePendingAction();
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  useUnsavedChanges(isDirty);
  return (
    <form
      onSubmit={handleSubmit(async (content) => {
        if (!begin("review")) return;
        try {
          const response = await reviewSourceAction({
            id,
            expectedRevision: revision,
            content,
            confirmed,
          });
          setResult(response);
          if (response.ok) router.refresh();
        } catch {
          setResult({
            ok: false,
            message:
              "Review failed. Your edits remain here; retry after checking local setup.",
          });
        } finally {
          finish();
        }
      })}
      className="space-y-4 min-w-0"
    >
      {!editable && (
        <p className="text-warning">
          Historical or unavailable source. Open the current active draft to
          review.
        </p>
      )}
      <p>
        Correct extraction and confirm each fact before tailoring. Classify
        every unmapped line or exclude it with a reason.{" "}
        <ProvenanceBadge provenance="inferred" />
      </p>
      <details>
        <summary className="min-h-11 cursor-pointer">
          Compare pinned profile facts
        </summary>
        <dl className="space-y-3">
          {(
            [
              "name",
              "email",
              "location",
              "headline",
              "experience",
              "education",
            ] as const
          ).map((field) => (
            <div key={field}>
              <dt className="field-label">{field}</dt>
              <dd className="break-words">
                {facts[field].value ?? "Needs your input"}{" "}
                <ProvenanceBadge
                  provenance={facts[field].evidence.provenance}
                />
              </dd>
            </div>
          ))}
          {(["skills", "projects", "absentSkills"] as const).map((field) => (
            <div key={field}>
              <dt className="field-label">
                {field === "absentSkills" ? "Skills confirmed absent" : field}
              </dt>
              <dd>
                <ul>
                  {facts[field].map((fact, index) => (
                    <li className="break-words" key={index}>
                      {fact.value ?? "Needs your input"}{" "}
                      <ProvenanceBadge provenance={fact.evidence.provenance} />
                    </li>
                  ))}
                </ul>
                {!facts[field].length && "Needs your input"}
              </dd>
            </div>
          ))}
        </dl>
        <a
          href="/profile"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center underline"
        >
          Open authoritative profile
        </a>
      </details>
      {initial.extractionFailed && (
        <p className="text-warning">
          Extraction failed. Reconstruct your resume manually alongside the
          original. No OCR or invented facts are used.
        </p>
      )}
      <fieldset disabled={pending || !editable} className="space-y-4 min-w-0">
        {items.map((item, i) => (
          <div
            className="rounded-xl border border-border p-4 space-y-3 min-w-0"
            key={item.id}
          >
            <p className="text-sm break-words">
              Item {i + 1} · Original line {item.line + 1} ·{" "}
              <ProvenanceBadge provenance="user-provided" />
            </p>
            <p className="whitespace-pre-wrap break-words text-sm text-text-muted">
              {item.original || "Manually reconstructed item"}
            </p>
            <label className="field-label">
              Reviewed text
              <textarea
                className="field-input min-h-24"
                maxLength={5000}
                {...register(`items.${i}.text`)}
              />
            </label>
            <div className="form-grid">
              <label className="field-label">
                Section
                <select
                  className="field-input"
                  {...register(`items.${i}.section`)}
                >
                  {sections.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Item type
                <select
                  className="field-input"
                  {...register(`items.${i}.kind`)}
                >
                  {["heading", "entry", "bullet", "text"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Parent entry
                <select
                  className="field-input"
                  value={item.entryId ?? ""}
                  onChange={(e) =>
                    setValue(`items.${i}.entryId`, e.target.value || null, {
                      shouldDirty: true,
                    })
                  }
                >
                  <option value="">No parent entry</option>
                  {items
                    .filter(
                      (e) =>
                        e.kind === "entry" &&
                        e.section === item.section &&
                        !e.excluded,
                    )
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.text.slice(0, 100)}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" {...register(`items.${i}.excluded`)} />
              Exclude this item
            </label>
            {item.excluded && (
              <label className="field-label">
                Exclusion reason
                <input
                  className="field-input"
                  maxLength={500}
                  {...register(`items.${i}.exclusionReason`)}
                />
              </label>
            )}
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" {...register(`items.${i}.confirmed`)} />I
              confirm this item and its classification are accurate.
            </label>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const item: SourceItem = {
              id: `manual-${crypto.randomUUID()}`,
              original: "",
              text: "",
              line: 0,
              section: "other",
              kind: "text",
              entryId: null,
              excluded: false,
              exclusionReason: "",
              confirmed: false,
            };
            setValue("items", [...items, item], { shouldDirty: true });
          }}
          disabled={items.length >= 300}
        >
          Add missing source item
        </Button>
        {conflicts.map((c) => (
          <label key={c.id} className="field-label text-warning">
            {c.message}
            <textarea
              className="field-input"
              required
              minLength={10}
              maxLength={1000}
              {...register(`conflictResolutions.${c.id}`)}
            />
          </label>
        ))}
        <label className="flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I compared the whole source with the original and verified profile,
          and confirm all facts and exclusions.
        </label>
        <Button disabled={!confirmed || pending} loading={pending}>
          Confirm reviewed source
        </Button>
      </fieldset>
      <FormFeedback result={result} />
    </form>
  );
}
