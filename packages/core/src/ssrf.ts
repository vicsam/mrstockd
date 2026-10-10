import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard for seller-provided endpoints.
 *
 * The gateway forwards buyer requests to URLs that sellers supply. Without
 * this check, a seller could point a listing at an internal address and use
 * the gateway to reach the database or other private services.
 *
 * Call assertSafeOutboundUrl() when a listing is created or edited AND
 * before every proxied request, because DNS answers can change.
 */

export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(`Unsafe outbound URL: ${reason}`);
    this.name = "UnsafeUrlError";
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

const BLOCKED_V4: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function isBlockedV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  // IPv4-mapped (::ffff:a.b.c.d)
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped?.[1]) return isBlockedV4(mapped[1]);
  return (
    lower.startsWith("fc") || // unique local fc00::/7
    lower.startsWith("fd") ||
    lower.startsWith("fe8") || // link-local fe80::/10
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb") ||
    lower.startsWith("ff") // multicast
  );
}

export function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedV4(ip);
  if (version === 6) return isBlockedV6(ip);
  return true;
}

export interface SafeUrlOptions {
  /** Allow http:// (only for local development). Defaults to false. */
  allowHttp?: boolean;
}

/**
 * Validates the URL and every address its hostname resolves to.
 * Returns the parsed URL and the vetted addresses.
 */
export async function assertSafeOutboundUrl(
  raw: string,
  options: SafeUrlOptions = {},
): Promise<{ url: URL; addresses: string[] }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("not a valid URL");
  }

  const allowed = options.allowHttp ? ["https:", "http:"] : ["https:"];
  if (!allowed.includes(url.protocol)) throw new UnsafeUrlError("protocol not allowed");
  if (url.username || url.password) throw new UnsafeUrlError("credentials in URL");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const lowerHost = host.toLowerCase();
  if (lowerHost === "localhost" || lowerHost.endsWith(".localhost") || lowerHost.endsWith(".internal")) {
    throw new UnsafeUrlError("internal hostname");
  }

  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true, verbatim: true })).map((r) => r.address);

  if (addresses.length === 0) throw new UnsafeUrlError("hostname did not resolve");
  for (const address of addresses) {
    if (isBlockedAddress(address)) throw new UnsafeUrlError(`resolves to blocked address ${address}`);
  }
  return { url, addresses };
}
