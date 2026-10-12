import "server-only";
import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isPublicAddress } from "@/lib/url-validation";
import { InputError } from "@/lib/action-result";
// Fixed official hosts only. Resolve once, validate all addresses, then connect to the
// selected public IP with the original TLS servername. Never follow redirects.
export async function publicApiJson(url: URL): Promise<unknown> {
  if (
    url.protocol !== "https:" ||
    !["himalayas.app", "remotive.com", "jobicy.com", "remoteok.com"].includes(
      url.hostname,
    ) ||
    url.username ||
    url.password ||
    url.port
  )
    throw new InputError("Unsupported API endpoint.");
  let dnsTimer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true }),
    new Promise<never>((_, reject) => {
      dnsTimer = setTimeout(
        () => reject(new InputError("API DNS timeout.")),
        3000,
      );
    }),
  ]).finally(() => clearTimeout(dnsTimer));
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address)))
    throw new InputError("API DNS target is not public.");
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    const req = request(
      {
        hostname: addresses[0].address,
        family: addresses[0].family,
        servername: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: "GET",
        agent: false,
        headers: {
          Host: url.hostname,
          Accept: "application/json",
          "User-Agent":
            "Orbit/0.1 (local personal job-search; official public API only)",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(
            new InputError(
              res.statusCode === 429
                ? "Source rate limit reached. No retry today."
                : `Source returned HTTP ${res.statusCode}.`,
            ),
          );
          return;
        }
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000) {
            req.destroy(new Error("API response too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            reject(new InputError("Source returned invalid JSON."));
          }
        });
      },
    );
    const timer = setTimeout(
      () => req.destroy(new Error("API timeout")),
      15000,
    );
    req.on("close", () => clearTimeout(timer));
    req.on("error", () =>
      reject(new InputError("API connection failed or timed out.")),
    );
    req.end();
  });
}
