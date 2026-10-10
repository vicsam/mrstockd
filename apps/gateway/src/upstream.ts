import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from "node:dns";
import { assertSafeOutboundUrl, isBlockedAddress, UnsafeUrlError } from "@mrstockd/core";
import { Agent, fetch, type Response } from "undici";

export interface UpstreamOptions {
  /**
   * Allow http:// and private addresses. ONLY for local development and
   * tests, where sellers' tools run on localhost. Refused in production.
   */
  allowPrivate: boolean;
  /** Max time to wait for the upstream's response headers. */
  timeoutMs: number;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * DNS lookup used at connect time. Even if a hostname passed the earlier
 * check, a second resolution (DNS rebinding) cannot sneak a private
 * address in, because this is the resolution the socket actually uses.
 */
export function safeLookup(hostname: string, options: LookupOptions, callback: LookupCallback): void {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = addresses as LookupAddress[];
    const blocked = list.find((a) => isBlockedAddress(a.address));
    if (blocked || list.length === 0) {
      return callback(new UnsafeUrlError(`resolves to blocked address ${blocked?.address ?? "(none)"}`), []);
    }
    if (options.all) return callback(null, list);
    const first = list[0]!;
    return callback(null, first.address, first.family);
  });
}

export interface UpstreamClient {
  send(url: URL, init: { method: string; headers: Record<string, string>; body: ReadableStream | null }): Promise<Response>;
}

export function createUpstreamClient(options: UpstreamOptions): UpstreamClient {
  const agent = new Agent({
    connect: options.allowPrivate ? {} : { lookup: safeLookup },
    headersTimeout: options.timeoutMs,
    bodyTimeout: options.timeoutMs,
  });

  return {
    async send(url, init) {
      // Pre-flight check: catches literal IPs, bad schemes, credentials in
      // the URL, and internal hostnames before any connection is attempted.
      await assertSafeOutboundUrl(url.toString(), { allowHttp: options.allowPrivate, allowPrivate: options.allowPrivate });
      return fetch(url, {
        method: init.method,
        headers: init.headers,
        body: init.body,
        duplex: init.body ? "half" : undefined,
        redirect: "manual",
        dispatcher: agent,
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    },
  };
}
