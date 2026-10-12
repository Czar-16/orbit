"use client";
import { usePendingAction } from "@/hooks/use-pending-action";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { uploadResumeAction } from "@/app/profile/actions";
import { type ActionResult } from "@/lib/action-result";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
export function ResumeUpload() {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const { pending, begin, finish } = usePendingAction();
  const [selected, setSelected] = useState(false);
  useUnsavedChanges(selected);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!begin()) return;
    setResult(null);
    try {
      const response = await uploadResumeAction(
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
          "The upload request failed. Check the 5 MB limit and try again.",
      });
    } finally {
      finish();
    }
  }
  return (
    <form ref={form} onSubmit={submit}>
      <label htmlFor="resume-upload" className="field-label">
        Private resume document
      </label>
      <input
        className="field-input"
        id="resume-upload"
        name="resume"
        type="file"
        accept=".pdf,.txt,application/pdf,text/plain"
        required
        disabled={pending}
        onChange={(event) => setSelected(!!event.target.files?.length)}
        aria-describedby="resume-hint"
      />
      <p className="field-hint" id="resume-hint">
        PDF or UTF-8 TXT, up to 5 MB. Use a simple filename. Stored outside the
        public directory; no automatic fact extraction.
      </p>
      <Button variant="secondary" className="mt-4" loading={pending}>
        {pending ? "Uploading…" : "Upload privately"}
      </Button>
      <FormFeedback result={result} />
    </form>
  );
}
