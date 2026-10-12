"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import {
  type TailoredContent,
  type TailoredItem,
  compareItems,
  deterministicSelection,
} from "@/lib/tailored-resume";
import { type ActionResult } from "@/lib/action-result";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { usePendingAction } from "@/hooks/use-pending-action";
import {
  generateTailoredAction,
  approveTailoredAction,
  selectTailoredAction,
} from "@/app/queue/resume-actions";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { ProvenanceBadge } from "@/components/provenance-badge";
type Version = {
  id: string;
  revision: number;
  contentHash: string;
  approved: boolean;
  content: TailoredContent;
  stale: boolean;
};
export function TailoredResumeReview({
  draftId,
  draftRevision,
  sourceId,
  sourceRevision,
  candidates,
  comparisonCandidates,
  expectedTailoredRevision,
  version,
  editable,
  selectedId,
}: {
  draftId: string;
  draftRevision: number;
  sourceId: string;
  sourceRevision: number;
  candidates: TailoredItem[];
  comparisonCandidates: TailoredItem[];
  expectedTailoredRevision: number;
  version: Version | null;
  editable: boolean;
  selectedId: string | null;
}) {
  const initialItems =
    version?.content.items ?? deterministicSelection(candidates);
  const {
    control,
    register,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<{ items: TailoredItem[] }>({
    defaultValues: { items: initialItems },
  });
  const items = useWatch({ control, name: "items" });
  const [inspected, setInspected] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const { pending, begin, finish } = usePendingAction();
  const router = useRouter();
  useUnsavedChanges(isDirty);
  async function act(
    key: string,
    operation: () => Promise<ActionResult & { id?: string; draftId?: string }>,
  ) {
    if (!begin(key)) return;
    setResult(null);
    try {
      const response = await operation();
      setResult(response);
      if (response.ok) {
        reset({ items });
        if (response.draftId) router.push(`/queue/${response.draftId}/resume`);
        else if (response.id)
          router.push(`/queue/${draftId}/resume?version=${response.id}`);
        router.refresh();
      }
    } catch {
      setResult({
        ok: false,
        message:
          "Request failed. Edits are retained. Check local setup and retry.",
      });
    } finally {
      finish();
    }
  }
  const compare = compareItems(isDirty ? candidates : comparisonCandidates, {
    schemaVersion: 1,
    ruleVersion: "resume-selection-v1",
    items,
  });
  function move(index: number, step: number) {
    const target = index + step;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setValue("items", next, { shouldDirty: true });
  }
  return (
    <div className="space-y-4 min-w-0">
      <p>
        Relevance uses the pinned job vocabulary and is{" "}
        <ProvenanceBadge provenance="inferred" />. Only reviewed facts are
        selected; no AI rewriting or job qualifications are added.
      </p>
      <form
        onSubmit={handleSubmit((values) =>
          act("generate", () =>
            generateTailoredAction({
              draftId,
              expectedDraftRevision: draftRevision,
              sourceId,
              expectedSourceRevision: sourceRevision,
              expectedTailoredRevision,
              parentId: version?.id ?? null,
              selections: values.items.map((i) => ({
                id: i.id,
                text: i.text,
                wordingConfirmed: i.wordingConfirmed,
              })),
            }),
          ),
        )}
      >
        <fieldset disabled={pending || !editable} className="min-w-0 space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-border p-4 space-y-2 min-w-0"
            >
              <p className="text-sm">
                {index + 1}. {item.section} · {item.kind} ·{" "}
                {item.origin === "profile"
                  ? "Explicit verified profile addition"
                  : `Original ${item.locator}`}{" "}
                <ProvenanceBadge provenance="verified" />
              </p>
              {item.kind === "bullet" ? (
                <label className="field-label">
                  Bullet wording
                  <textarea
                    className="field-input min-h-24"
                    maxLength={5000}
                    {...register(`items.${index}.text`, {
                      onChange: () =>
                        setValue(`items.${index}.wordingConfirmed`, false, {
                          shouldDirty: true,
                        }),
                    })}
                  />
                </label>
              ) : (
                <p className="whitespace-pre-wrap break-words">{item.text}</p>
              )}
              {item.kind === "bullet" && (
                <>
                  <p className="text-sm break-words text-text-muted">
                    Original:{" "}
                    {(isDirty ? candidates : comparisonCandidates).find(
                      (i) => i.id === item.id,
                    )?.text ?? item.original}
                  </p>
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      {...register(`items.${index}.wordingConfirmed`)}
                    />
                    I individually confirm this rewrite preserves the original
                    facts.
                  </label>
                </>
              )}
              <p className="text-sm text-text-muted">
                Inferred relevance:{" "}
                {item.relevance.join(", ") || "No matching vocabulary"}.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Move item ${index + 1} up`}
                >
                  Move up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Move item ${index + 1} down`}
                >
                  Move down
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setValue(
                      "items",
                      items.filter((i) => i.id !== item.id),
                      { shouldDirty: true },
                    )
                  }
                >
                  Remove item {index + 1}
                </Button>
              </div>
            </div>
          ))}
          <details>
            <summary className="min-h-11 cursor-pointer">
              Include an existing source or verified profile fact
            </summary>
            <p className="text-sm">
              Profile additions are explicit. Move added items into their
              section and keep bullets with their parent entry.
            </p>
            <ul>
              {candidates
                .filter((c) => !items.some((i) => i.id === c.id))
                .map((c) => (
                  <li className="py-2 break-words" key={c.id}>
                    <p>
                      {c.text} · {c.origin}{" "}
                      <ProvenanceBadge provenance="verified" />
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        (() => {
                          const next = [...items];
                          const indices = next
                            .map((item, index) => ({ item, index }))
                            .filter(({ item }) =>
                              c.entryId
                                ? item.id === c.entryId ||
                                  item.entryId === c.entryId
                                : item.section === c.section,
                            );
                          const first = indices[0]?.index;
                          const insertion =
                            c.kind === "heading" && first !== undefined
                              ? first
                              : (indices.at(-1)?.index ?? next.length - 1) + 1;
                          next.splice(insertion, 0, c);
                          setValue("items", next, { shouldDirty: true });
                        })()
                      }
                    >
                      Include {c.section} item
                    </Button>
                  </li>
                ))}
            </ul>
          </details>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setValue("items", deterministicSelection(candidates), {
                shouldDirty: true,
              })
            }
          >
            Reset selection to current reviewed source
          </Button>
          <p className="text-sm text-text-muted">
            Manual rewrites may reuse original factual wording and simple
            connecting words. New claims belong in authoritative source/profile
            review first. Keep sections together, employment chronology, and
            entry relationships. Generation saves a new unapproved version and
            preserves history.
          </p>
          <Button disabled={pending || !editable} loading={pending}>
            {version ? "Generate edited version" : "Generate PDF and DOCX"}
          </Button>
        </fieldset>
      </form>
      <details open>
        <summary className="min-h-11 cursor-pointer">
          Item comparison · accessible text alternative
        </summary>
        <ul className="space-y-3">
          {compare.map((c) => (
            <li key={c.id} className="break-words border-b border-border pb-3">
              <p className="text-sm font-semibold">
                {c.changes.join(" · ") || "Unchanged"} · {c.id}
                {c.after && ` · Position ${c.to + 1}`}
              </p>
              <p className="whitespace-pre-wrap text-sm">
                Before: {c.before ?? "Absent from original"}
              </p>
              <p className="whitespace-pre-wrap text-sm">
                After: {c.after ?? "Removed"}
              </p>
            </li>
          ))}
        </ul>
      </details>
      {version && (
        <section className="space-y-3 min-w-0">
          <h3>Actual generated PDF · revision {version.revision}</h3>
          {version.stale && (
            <p className="text-warning">
              Historical snapshots: job, profile, preferences, original source
              or draft have newer versions. Approved historical files remain
              downloadable; select a compatible current version for readiness.
            </p>
          )}
          <a
            className="inline-flex min-h-11 items-center underline"
            href={`/api/tailored-resumes/${version.id}?preview=1`}
            target="_blank"
            rel="noreferrer"
          >
            Open actual PDF for inspection
          </a>
          <iframe
            title={`Generated resume PDF revision ${version.revision}`}
            className="w-full h-[36rem] rounded-xl border border-border"
            src={`/api/tailored-resumes/${version.id}?preview=1`}
          />
          <p className="text-sm">
            The preview above is the generated file. The comparison provides a
            text alternative. Automated checks establish basic text/layout
            readability, not universal ATS compatibility. Editable DOCX may
            reflow in Word/LibreOffice.
          </p>
          {isDirty && (
            <p className="text-warning">
              Unsaved edits differ from this PDF. Generate and inspect a new
              version before approval or selection.
            </p>
          )}
          {version.approved ? (
            <>
              <p>
                <ProvenanceBadge provenance="verified" /> Exact content and
                document hashes approved.
                {selectedId === version.id ? " Selected for this draft." : ""}
              </p>
              <div className="flex flex-wrap gap-3">
                {(["PDF", "DOCX"] as const).map((format) => (
                  <a
                    key={format}
                    download
                    className="inline-flex min-h-11 items-center underline"
                    href={`/api/tailored-resumes/${version.id}?format=${format}`}
                  >
                    Download {format}
                  </a>
                ))}
                <Button
                  variant="secondary"
                  disabled={
                    pending || !editable || isDirty || selectedId === version.id
                  }
                  onClick={() =>
                    act("select", () =>
                      selectTailoredAction({
                        draftId,
                        expectedDraftRevision: draftRevision,
                        versionId: version.id,
                      }),
                    )
                  }
                >
                  Select approved resume
                </Button>
              </div>
            </>
          ) : (
            <>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={inspected}
                  onChange={(e) => setInspected(e.target.checked)}
                />
                I inspected this actual PDF and confirm its facts, completeness
                and readable layout.
              </label>
              <Button
                variant="secondary"
                disabled={
                  pending ||
                  !inspected ||
                  isDirty ||
                  !editable ||
                  version.revision !== expectedTailoredRevision
                }
                onClick={() =>
                  act("approve", () =>
                    approveTailoredAction({
                      id: version.id,
                      expectedRevision: version.revision,
                      expectedContentHash: version.contentHash,
                      pdfInspected: inspected,
                    }),
                  )
                }
              >
                Approve exact documents
              </Button>
            </>
          )}
        </section>
      )}
      <FormFeedback result={result} />
    </div>
  );
}
