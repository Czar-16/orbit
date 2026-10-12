"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type DraftContent, providerSchema } from "@/lib/preparation";
import { prepareDraftAction, reviseDraftAction } from "@/app/queue/actions";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import { ProvenanceBadge } from "@/components/provenance-badge";
import { FormFeedback } from "@/components/form-feedback";
import { type ActionResult } from "@/lib/action-result";
const schema = z.object({
  letter: z.string().max(20000),
  answers: z.array(z.object({ value: z.string().max(5000) })).max(30),
  order: z
    .string()
    .max(200)
    .refine(
      (v) => !v.trim() || /^\s*\d+\s*(,\s*\d+\s*)*$/.test(v),
      "Use comma-separated bullet numbers.",
    ),
  confirmed: z
    .boolean()
    .refine((v) => v, "Confirm your edits contain only supported facts."),
});
type Values = z.infer<typeof schema>;
export function DraftReview({
  id,
  jobId,
  revision,
  content,
  editable,
  resumes,
  selectedResume,
  providers,
}: {
  id: string;
  jobId: string;
  revision: number;
  content: DraftContent;
  editable: boolean;
  resumes: { id: string; filename: string; roleCategory: string | null }[];
  selectedResume: string;
  providers: { openai: boolean; ollama: boolean };
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, setPending] = useState(false);
  const [resume, setResume] = useState(
    resumes.some((r) => r.id === selectedResume)
      ? selectedResume
      : (resumes[0]?.id ?? ""),
  );
  const [provider, setProvider] =
    useState<z.infer<typeof providerSchema>>("off");
  const [questions, setQuestions] = useState("");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      letter: content.letter,
      answers: content.answers.map((a) => ({ value: a.value })),
      order: content.order.map((i) => i + 1).join(", "),
      confirmed: false,
    },
  });
  useUnsavedChanges(form.formState.isDirty);
  const editedLetter = useWatch({ control: form.control, name: "letter" });
  const editedAnswers = useWatch({ control: form.control, name: "answers" });
  function orderedIndexes() {
    return form.getValues("order").trim()
      ? form
          .getValues("order")
          .split(",")
          .map((s) => Number(s.trim()) - 1)
      : [];
  }
  async function perform(
    operation: "edit" | "discard" | "regenerate",
    values?: Values,
  ) {
    if (
      operation === "discard" &&
      !window.confirm(
        "Discard this draft? All earlier revisions will remain in history.",
      )
    )
      return;
    if (
      operation === "regenerate" &&
      form.formState.isDirty &&
      !window.confirm(
        "Regenerate without saving these edits? Your last saved revision will remain in history.",
      )
    )
      return;
    setPending(true);
    setResult(null);
    try {
      const response =
        operation === "regenerate"
          ? await prepareDraftAction({
              jobId,
              resumeVersionId: resume,
              expectedRevision: revision,
              provider,
              questions: questions
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          : await reviseDraftAction({
              id,
              expectedRevision: revision,
              operation,
              confirmed: operation === "discard" ? true : !!values?.confirmed,
              ...(values
                ? {
                    letter: values.letter,
                    answers: values.answers.map((a) => a.value),
                    order: orderedIndexes(),
                  }
                : {}),
            });
      setResult(response);
      if (response.ok && response.id) {
        form.reset(form.getValues());
        router.push(`/queue/${response.id}`);
        router.refresh();
      }
    } catch {
      setResult({ ok: false, message: "Draft operation failed. Try again." });
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      <form onSubmit={form.handleSubmit((v) => perform("edit", v))}>
        <section className="panel">
          <h2 className="mb-4 flex items-center gap-2">
            Cover letter / short message{" "}
            <ProvenanceBadge
              provenance={
                editedLetter === content.letter
                  ? content.letterProvenance
                  : "user-provided"
              }
            />
          </h2>
          <label htmlFor="draft-letter" className="field-label">
            Review every claim before use
          </label>
          <textarea
            id="draft-letter"
            rows={14}
            className="field-input max-w-[70ch]"
            disabled={!editable || pending}
            {...form.register("letter")}
          />
          <p className="field-error">{form.formState.errors.letter?.message}</p>
        </section>
        <section className="panel mt-4">
          <h2 className="mb-4">Proposed answers</h2>
          <div className="space-y-4">
            {content.answers.map((a, i) => (
              <div
                key={`${i}-${a.question}`}
                className={
                  !a.value
                    ? "rounded-md border border-dashed border-warning p-3"
                    : ""
                }
              >
                <label htmlFor={`answer-${i}`} className="field-label">
                  {a.question}
                </label>
                <ProvenanceBadge
                  provenance={
                    editedAnswers[i]?.value === a.value
                      ? a.provenance
                      : editedAnswers[i]?.value
                        ? "user-provided"
                        : "unknown"
                  }
                />
                {!a.value && (
                  <p className="field-hint text-warning">
                    Needs your input · Required from you
                  </p>
                )}
                {a.sensitive && (
                  <p className="field-hint">
                    Only you can answer this question. No answer has been
                    inferred.
                  </p>
                )}
                <textarea
                  id={`answer-${i}`}
                  className="field-input mt-2"
                  rows={2}
                  disabled={!editable || pending}
                  {...form.register(`answers.${i}.value`)}
                />
                <p className="field-error">
                  {form.formState.errors.answers?.[i]?.value?.message}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="panel mt-4">
          <h2 className="mb-2">Resume emphasis diff</h2>
          <p className="field-hint mb-4">
            Selection and order only. Original uploaded bytes stay unchanged.
            These verified project bullets occur verbatim in the selected
            resume.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm">Original order</h3>
              <ol className="list-inside list-decimal space-y-2 text-sm">
                {content.originals.map((b, i) => (
                  <li className="break-words" key={i}>
                    {b} <ProvenanceBadge provenance="verified" />
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="mb-2 text-sm">Recommended order</h3>
              <ol className="list-inside list-decimal space-y-2 text-sm">
                {content.order.map((i) => (
                  <li className="break-words" key={i}>
                    {content.originals[i]}
                  </li>
                ))}
              </ol>
              <p className="field-hint">
                Omitted:{" "}
                {content.originals
                  .map((_, i) => i)
                  .filter((i) => !content.order.includes(i))
                  .map((i) => i + 1)
                  .join(", ") || "None"}
              </p>
              <ProvenanceBadge provenance="inferred" />
            </div>
          </div>
          {!content.originals.length && (
            <p className="text-sm text-warning">
              No verified project bullets found in this resume. Needs your
              input.
            </p>
          )}
          <label className="field-label mt-4" htmlFor="emphasis-order">
            Selected bullet numbers in desired order (comma separated; empty
            omits all)
          </label>
          <input
            id="emphasis-order"
            className="field-input"
            disabled={!editable || pending}
            {...form.register("order")}
          />
        </section>
        {editable && (
          <div className="panel mt-4">
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" {...form.register("confirmed")} />I confirm
              edited claims and answers contain only facts I can support.
            </label>
            <p className="field-error">
              {form.formState.errors.confirmed?.message}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={pending} type="submit">
                {pending ? "Saving…" : "Save revision"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => perform("discard")}
              >
                Discard draft
              </Button>
            </div>
          </div>
        )}
      </form>
      {editable && (
        <section className="panel mt-4">
          <h2 className="mb-4">Regenerate</h2>
          <label htmlFor="draft-resume" className="field-label">
            Resume version
          </label>
          <select
            id="draft-resume"
            className="field-input"
            value={resume}
            disabled={pending}
            onChange={(e) => setResume(e.target.value)}
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.filename}
                {r.roleCategory ? ` · ${r.roleCategory}` : ""}
              </option>
            ))}
          </select>
          <label className="field-label mt-4" htmlFor="draft-provider">
            Assistance
          </label>
          <select
            id="draft-provider"
            className="field-input"
            value={provider}
            disabled={pending}
            onChange={(e) => setProvider(providerSchema.parse(e.target.value))}
          >
            <option value="off">Off · deterministic, local</option>
            <option disabled={!providers.ollama} value="ollama">
              Ollama · local, optional, untested
            </option>
            <option disabled={!providers.openai} value="openai">
              OpenAI · sends listed facts externally, may incur cost, untested
            </option>
          </select>
          <p className="field-hint">
            Optional AI receives relevant skill sentences and project bullets
            plus supplied requirement skills. It can select existing content
            only. Every attempt is logged in Settings.
          </p>
          <label className="field-label mt-4" htmlFor="draft-questions">
            Additional employer questions (one per line, up to 20)
          </label>
          <textarea
            id="draft-questions"
            rows={3}
            className="field-input"
            value={questions}
            disabled={pending}
            onChange={(e) => setQuestions(e.target.value)}
          />
          <p className="field-hint">
            Additional and sensitive questions remain empty until you answer
            them.
          </p>
          <Button
            className="mt-3"
            type="button"
            variant="secondary"
            disabled={pending || !resumes.length}
            onClick={() => perform("regenerate")}
          >
            Regenerate draft
          </Button>
        </section>
      )}
      <FormFeedback result={result} />
    </div>
  );
}
