import { serve } from "inngest/next";
import { NextRequest } from "next/server";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";
import { localExportRequest } from "@/lib/export-format";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handler = serve({ client: inngest, functions });
async function localRequest(
  request: NextRequest,
  method: "GET" | "POST" | "PUT",
) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (
    !localExportRequest(request) ||
    (forwardedHost && forwardedHost !== request.headers.get("host"))
  )
    return new Response("Local same-origin access only", { status: 403 });
  if (method === "GET") return handler.GET(request, undefined);
  const body = await request.text();
  if (Buffer.byteLength(body) > 1_000_000)
    return new Response("Request too large", { status: 413 });
  return handler[method](
    new NextRequest(request.url, { method, headers: request.headers, body }),
    undefined,
  );
}
export function GET(request: NextRequest) {
  return localRequest(request, "GET");
}
export function POST(request: NextRequest) {
  return localRequest(request, "POST");
}
export function PUT(request: NextRequest) {
  return localRequest(request, "PUT");
}
