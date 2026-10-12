import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { z } from "zod";
import { InputError } from "@/lib/action-result";
export function isPublicAddress(value: string) {
  try {
    const address = ipaddr.process(value);
    return address.range() === "unicast";
  } catch {
    return false;
  }
}
export const listingUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .superRefine((value, ctx) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Use a valid HTTPS listing URL.",
      });
      return;
    }
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      url.hash ||
      !host ||
      host.endsWith(".") ||
      host.includes("%") ||
      (!isIP(host) &&
        (!host.includes(".") ||
          /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(
            host,
          ))) ||
      (isIP(host) && !isPublicAddress(host))
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Use a public HTTPS listing URL without credentials, fragments, or a custom port.",
      });
  });
export type AddressResolver = (
  hostname: string,
) => Promise<{ address: string }[]>;
const resolveAddresses: AddressResolver = (hostname) =>
  lookup(hostname, { all: true, verbatim: true });
export async function validateListingUrl(
  value: string,
  resolver: AddressResolver = resolveAddresses,
) {
  const result = listingUrlSchema.safeParse(value);
  if (!result.success)
    throw new InputError(
      "Use a public HTTPS listing URL. Private, loopback, and metadata targets are blocked.",
    );
  const url = new URL(result.data);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!isIP(host)) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const addresses = await Promise.race([
        resolver(host),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("DNS timeout")), 3000);
        }),
      ]);
      if (
        !addresses.length ||
        addresses.some((address) => !isPublicAddress(address.address))
      )
        throw new Error("Unsafe DNS address");
    } catch {
      throw new InputError(
        "This hostname could not be validated as public. Check the URL or import the description without a URL.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
  // No listing page is fetched. No redirects are requested or followed.
  return url.toString();
}
