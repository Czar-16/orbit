"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  reviewResumeAction,
  configureResumeAction,
} from "@/app/profile/actions";
import { type ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { ProvenanceBadge } from "@/components/provenance-badge";
export function ResumeReview({
  id,
  roleCategory,
  isDefault,
}: {
  id: string;
  roleCategory: string | null;
  isDefault: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState(roleCategory ?? "");
  const [defaultResume, setDefault] = useState(isDefault);
  const [text, setText] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, setPending] = useState(false);
  async function act(review: boolean) {
    setPending(true);
    setResult(null);
    try {
      if (review) {
        const r = await reviewResumeAction(id);
        setResult(r);
        if (r.ok && r.text) setText(r.text);
      } else {
        const r = await configureResumeAction({
          id,
          roleCategory: role,
          isDefault: defaultResume,
        });
        setResult(r);
        if (r.ok) router.refresh();
      }
    } catch {
      setResult({ ok: false, message: "Resume operation failed. Try again." });
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="w-full">
      <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm">
          Review text and resume selection
        </summary>
        <label className="field-label" htmlFor={`role-${id}`}>
          Role category
        </label>
        <input
          className="field-input"
          maxLength={100}
          id={`role-${id}`}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={defaultResume}
            onChange={(e) => setDefault(e.target.checked)}
          />
          Default resume (used when the profile has no selected version)
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            variant="secondary"
            onClick={() => act(false)}
          >
            Save selection settings
          </Button>
          <Button
            disabled={pending}
            variant="secondary"
            onClick={() => act(true)}
          >
            {pending ? "Working…" : "Extract text for review"}
          </Button>
        </div>
        {text !== null && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">
              Proposed source text <ProvenanceBadge provenance="inferred" />
            </h3>
            <p className="field-hint">
              Review extraction accuracy. Copy only facts you can confirm into
              the profile form below and explicitly verify them. Nothing is
              auto-saved. Original project bullets must remain verbatim.
            </p>
            <textarea
              aria-label="Extracted resume text for review"
              className="field-input mt-2"
              rows={12}
              readOnly
              value={text}
            />
          </div>
        )}
        <FormFeedback result={result} />
      </details>
    </div>
  );
}
