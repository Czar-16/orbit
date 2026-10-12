import { AlertCircle } from "lucide-react";
export function FieldMessage({
  id,
  error,
  hint,
}: {
  id: string;
  error?: string;
  hint: string;
}) {
  return (
    <p
      id={id}
      role={error ? "alert" : undefined}
      className={error ? "field-error flex items-start gap-1" : "field-hint"}
    >
      {error && (
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      )}
      {error ?? hint}
    </p>
  );
}
