import "server-only";
import { Inngest } from "inngest";

export const LOCAL_INNGEST_URL = "http://127.0.0.1:8288";
// Explicit options and a transport allowlist prevent environment variables or
// development-server discovery from redirecting requests to Inngest Cloud.
export const inngest = new Inngest({
  id: "orbit-local",
  isDev: true,
  baseUrl: LOCAL_INNGEST_URL,
  eventKey: "orbit-local-only",
  fetch: async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== LOCAL_INNGEST_URL)
      throw new Error("Local Inngest transport only.");
    return fetch(input, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    });
  },
});
