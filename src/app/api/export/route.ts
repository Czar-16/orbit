import { z } from "zod";
import { exportEntities, exportWorkspace } from "@/lib/data-export";
import { localExportRequest, tableCsv } from "@/lib/export-format";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const querySchema = z
  .object({
    format: z.enum(["json", "csv"]).default("json"),
    entity: z.enum(exportEntities).optional(),
  })
  .strict()
  .refine(
    (v) => (v.format === "csv" ? !!v.entity : !v.entity),
    "CSV needs one entity; JSON includes all entities.",
  );
export async function GET(request: Request) {
  if (!localExportRequest(request))
    return new Response("Local same-origin access only", { status: 403 });
  const params = new URL(request.url).searchParams;
  if (
    [...new Set(params.keys())].some((key) => params.getAll(key).length !== 1)
  )
    return new Response("Duplicate export parameters", { status: 400 });
  const parsed = querySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success)
    return new Response("Choose JSON or CSV with a supported entity.", {
      status: 400,
    });
  try {
    const snapshot = await exportWorkspace();
    // Serialize once to preserve Decimal/date/null representations in both formats.
    const serializable = JSON.parse(JSON.stringify(snapshot)) as {
      tables: Record<string, Record<string, unknown>[]>;
    };
    const { format, entity } = parsed.data;
    const body =
      format === "json"
        ? JSON.stringify(snapshot, null, 2)
        : tableCsv(serializable.tables[entity!]);
    return new Response(body, {
      headers: {
        "Content-Type":
          format === "json"
            ? "application/json; charset=utf-8"
            : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orbit-${entity ?? "all-data"}.${format}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(
      "Export unavailable. Check local database and migrations.",
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
