"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { profileInputSchema, type ProfileInput } from "@/lib/profile-input";
import { saveProfileAction } from "@/app/profile/actions";
import { type ActionResult } from "@/lib/action-result";
import { type ProfileFacts } from "@/lib/profile-schema";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/form-feedback";
import { ProvenanceBadge } from "@/components/provenance-badge";
const fields = [
  { key: "name", label: "Name", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "location", label: "Location", type: "text" },
  { key: "headline", label: "Professional headline", type: "text" },
  { key: "experience", label: "Employment and experience", type: "textarea" },
  { key: "education", label: "Education and certifications", type: "textarea" },
  { key: "desiredRoles", label: "Roles you want", type: "text" },
  {
    key: "skills",
    label: "Confirmed skills (comma-separated)",
    type: "textarea",
  },
] as const;
export function ProfileForm({
  defaults,
  facts,
  resumes,
}: {
  defaults: ProfileInput;
  facts: ProfileFacts;
  resumes: { id: string; filename: string }[];
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting, dirtyFields },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: defaults,
  });
  useUnsavedChanges(isDirty);
  async function submit(values: ProfileInput) {
    setResult(null);
    let response: ActionResult;
    try {
      response = await saveProfileAction(values);
    } catch {
      response = {
        ok: false,
        message:
          "The save request failed. Your changes are still unsaved; try again.",
      };
    }
    setResult(response);
    if (response.ok) {
      reset({
        ...values,
        expectedRevision: values.expectedRevision + 1,
        confirmed: false,
      });
      router.refresh();
    }
  }
  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="form-grid">
        {fields.map((field) => (
          <div
            key={field.key}
            className={field.type === "textarea" ? "md:col-span-2" : ""}
          >
            <label htmlFor={`profile-${field.key}`} className="field-label">
              {field.label}
              <ProvenanceBadge
                provenance={
                  dirtyFields[field.key]
                    ? "user-provided"
                    : field.key === "skills"
                      ? facts.skills.length
                        ? "verified"
                        : "unknown"
                      : facts[field.key].evidence.provenance
                }
              />
            </label>
            {field.type === "textarea" ? (
              <textarea
                id={`profile-${field.key}`}
                className="field-input min-h-24"
                {...register(field.key)}
                aria-invalid={!!errors[field.key]}
                aria-describedby={`hint-${field.key}`}
              />
            ) : (
              <input
                id={`profile-${field.key}`}
                type={field.type}
                className="field-input"
                {...register(field.key)}
                aria-invalid={!!errors[field.key]}
                aria-describedby={`hint-${field.key}`}
              />
            )}
            <p
              id={`hint-${field.key}`}
              className={errors[field.key] ? "field-error" : "field-hint"}
            >
              {errors[field.key]?.message ??
                "Leave blank if unknown. Needs your input until explicitly confirmed."}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <label htmlFor="profile-resume" className="field-label">
          Resume version used as reference
        </label>
        <select
          id="profile-resume"
          className="field-input"
          {...register("resumeVersionId")}
        >
          <option value="">No resume selected</option>
          {resumes.map((resume) => (
            <option key={resume.id} value={resume.id}>
              {resume.filename} · {resume.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>
      <label className="mt-4 flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4"
          {...register("confirmed")}
          aria-invalid={!!errors.confirmed}
        />
        <span>
          I confirm the entered facts and skills are accurate and reflect my
          resume or my verified profile. Saving creates a verified profile
          revision.
        </span>
      </label>
      {errors.confirmed && (
        <p className="field-error" role="alert">
          {errors.confirmed.message}
        </p>
      )}
      <p className="mt-4 text-xs text-text-muted">
        Sensitive eligibility and demographic answers are not collected or
        guessed here. You will provide them yourself when needed.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <Button disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save verified profile"}
        </Button>
        {isDirty && (
          <span className="text-xs text-warning">Unsaved changes</span>
        )}
      </div>
      <FormFeedback result={result} />
    </form>
  );
}
