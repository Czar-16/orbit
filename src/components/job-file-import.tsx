"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importJobFileAction } from "@/app/discover/actions";
import { type ActionResult } from "@/lib/action-result";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
export function JobFileImport() {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  useUnsavedChanges(selected);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const response = await importJobFileAction(
        new FormData(event.currentTarget),
      );
      setResult(response);
      if (response.ok) {
        form.current?.reset();
        setSelected(false);
        router.refresh();
      }
    } catch {
      setResult({
        ok: false,
        message:
          "The file import request failed. Check the file limit and try again.",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <form ref={form} onSubmit={submit}>
      <label className="field-label" htmlFor="job-file">
        JSON job list
      </label>
      <input
        className="field-input"
        id="job-file"
        name="jobs"
        type="file"
        accept=".json,application/json"
        required
        onChange={(event) => setSelected(!!event.target.files?.length)}
        aria-describedby="job-file-hint"
      />
      <p className="field-hint" id="job-file-hint">
        Up to 50 jobs and 1 MB. Use an array of objects with listingUrl,
        description, and optional job fields. All rows are validated before any
        job is saved.
      </p>
      <details className="mt-4 text-xs text-text-muted">
        <summary className="min-h-11 cursor-pointer py-3">
          Show file format
        </summary>
        <pre className="overflow-x-auto rounded-md bg-surface-2 p-3 font-mono">
          {
            '[{"listingUrl":"<public HTTPS URL>","description":"<pasted description>","title":"<employer-stated title>","skills":"<comma-separated requirements>"}]'
          }
        </pre>
        <p className="mt-2">
          Replace the angle-bracket instructions with your actual input. No
          example jobs are added.
        </p>
      </details>
      <Button variant="secondary" className="mt-4" disabled={pending}>
        {pending ? "Importing…" : "Import JSON list"}
      </Button>
      <FormFeedback result={result} />
    </form>
  );
}
