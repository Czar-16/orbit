"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { jobInputSchema, emptyJob, type JobInput } from "@/lib/job-input";
import { saveJobAction } from "@/app/discover/actions";
import { type ActionResult } from "@/lib/action-result";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import { FieldMessage } from "@/components/field-message";
import { FormFeedback } from "@/components/form-feedback";
const fields = [
  { key: "listingUrl", label: "Original listing URL (HTTPS)", type: "url" },
  { key: "title", label: "Job title", type: "text" },
  { key: "company", label: "Company", type: "text" },
  { key: "location", label: "Location", type: "text" },
  {
    key: "skills",
    label: "Employer-stated required skills (comma-separated)",
    type: "text",
  },
  {
    key: "experienceRequirement",
    label: "Employer-stated experience requirement",
    type: "textarea",
  },
  { key: "description", label: "Pasted job description", type: "textarea" },
  {
    key: "compensationMin",
    label: "Stated compensation minimum",
    type: "text",
  },
  {
    key: "compensationMax",
    label: "Stated compensation maximum",
    type: "text",
  },
  { key: "currency", label: "Currency code, if stated", type: "text" },
] as const;
export function JobImportForm({
  defaults = emptyJob,
}: {
  defaults?: JobInput;
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<JobInput>({
    resolver: zodResolver(jobInputSchema),
    defaultValues: defaults,
  });
  useUnsavedChanges(isDirty);
  async function submit(values: JobInput) {
    setResult(null);
    try {
      const response = await saveJobAction(values);
      setResult(response);
      if (response.ok) {
        if (defaults.jobId) {
          reset({ ...values, expectedRevision: values.expectedRevision + 1 });
          router.refresh();
        } else {
          reset(emptyJob);
          router.refresh();
        }
      }
    } catch {
      setResult({
        ok: false,
        message:
          "The import request failed. Your input is still unsaved; try again.",
      });
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <p className="mb-4 text-sm text-text-muted">
        Paste a link, a description, or both. Listing pages are never fetched.
        Enter employer-stated details manually; blank fields remain Unknown, and
        entered fields are User-provided.
      </p>
      <div className="form-grid">
        {fields.map((field) => (
          <div
            key={field.key}
            className={
              field.type === "textarea" ||
              field.key === "listingUrl" ||
              field.key === "skills"
                ? "md:col-span-2"
                : ""
            }
          >
            <label htmlFor={`job-${field.key}`} className="field-label">
              {field.label}
            </label>
            {field.type === "textarea" ? (
              <textarea
                id={`job-${field.key}`}
                className={`field-input ${field.key === "description" ? "min-h-40" : "min-h-24"}`}
                {...register(field.key)}
                aria-invalid={!!errors[field.key]}
                aria-describedby={`job-hint-${field.key}`}
              />
            ) : (
              <input
                id={`job-${field.key}`}
                type={field.type}
                className="field-input"
                {...register(field.key)}
                aria-invalid={!!errors[field.key]}
                aria-describedby={`job-hint-${field.key}`}
              />
            )}
            <FieldMessage
              id={`job-hint-${field.key}`}
              error={errors[field.key]?.message}
              hint="Optional; leave blank if unknown."
            />
          </div>
        ))}
        {[
          {
            key: "workArrangement",
            label: "Work arrangement",
            options: ["remote", "hybrid", "on-site"],
          },
          {
            key: "employmentType",
            label: "Employment type",
            options: [
              "full-time",
              "part-time",
              "contract",
              "internship",
              "temporary",
            ],
          },
          {
            key: "compensationPeriod",
            label: "Compensation period",
            options: ["hour", "month", "year"],
          },
        ].map((field) => (
          <div key={field.key}>
            <label className="field-label" htmlFor={`job-${field.key}`}>
              {field.label}
            </label>
            <select
              className="field-input"
              id={`job-${field.key}`}
              {...register(
                field.key as
                  | "workArrangement"
                  | "employmentType"
                  | "compensationPeriod",
              )}
            >
              <option value="">Unknown</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Button disabled={isSubmitting}>
          {isSubmitting
            ? "Saving…"
            : defaults.jobId
              ? "Save job revision"
              : "Import job manually"}
        </Button>
        {isDirty && (
          <span className="text-xs text-warning">Unsaved changes</span>
        )}
      </div>
      <p className="mt-4 text-xs text-text-muted">
        Nothing has been submitted. LinkedIn and Indeed intake is manual only.
      </p>
      <FormFeedback result={result} />
    </form>
  );
}
