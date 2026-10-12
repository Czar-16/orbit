export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
export class InputError extends Error {}
export function safeActionError(error: unknown): ActionResult {
  return {
    ok: false,
    message:
      error instanceof InputError
        ? error.message
        : "The operation could not be completed. Check database setup and try again. No successful save is assumed.",
  };
}
