export function csvCell(value: unknown) {
  let text =
    value === null || value === undefined
      ? "null"
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  // Defend spreadsheet formulas even after whitespace/control prefixes.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
    text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function tableCsv(rows: Record<string, unknown>[]) {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  if (!keys.length) return "\r\n";
  return (
    [
      keys.map(csvCell).join(","),
      ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(",")),
    ].join("\r\n") + "\r\n"
  );
}
export function localExportRequest(request: Request) {
  const host = request.headers.get("host") ?? "";
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) return false;
  const url = new URL(request.url);
  if (
    !/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(url.host) ||
    !["http:", "https:"].includes(url.protocol)
  )
    return false;
  // NextRequest normalizes loopback URL hostnames to localhost. Use the validated
  // actual Host for browser-origin checks, while requiring the internal port to match.
  const actualOrigin = new URL(`${url.protocol}//${host}`);
  if (actualOrigin.port !== url.port) return false;
  const origin = request.headers.get("origin");
  if (origin && origin !== actualOrigin.origin) return false;
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== actualOrigin.origin) return false;
    } catch {
      return false;
    }
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
}
