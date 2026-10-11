"use client";

import { useActionState, useState } from "react";
import { FormError, FormSuccess } from "@/components/form";
import { type ActionState, testKeyAction } from "../../actions";

export interface ActiveTestKey {
  prefix: string;
  creditsRemaining: number;
  validUntil: string | null;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked (e.g. not https): the text is selectable instead.
        }
      }}
      className="min-h-11 shrink-0 rounded-full border border-current/20 px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-stock/60"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

const buttonClass = {
  primary:
    "min-h-11 rounded-full bg-stock px-5 py-2.5 font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-stock/60 disabled:opacity-60",
  secondary:
    "min-h-11 rounded-full border border-current/20 px-5 py-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-stock/60 disabled:opacity-60",
};

export function TestKeyPanel({
  listingId,
  callUrl,
  pricingModel,
  activeKey,
}: {
  listingId: string;
  /** Gateway URL for this tool, ending in "/". */
  callUrl: string;
  pricingModel: "credits" | "subscription";
  activeKey: ActiveTestKey | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(testKeyAction, {});
  const shownKey = state.testKey;
  const keyForCommand = shownKey ?? "mrs_test_YOUR_KEY";
  const command = `curl -X POST ${callUrl}summarize \\
  -H "Authorization: Bearer ${keyForCommand}" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "MrStockd sells AI tools. Agents can buy them too."}'`;

  return (
    <div className="flex flex-col gap-4">
      <FormError message={state.error} />
      <FormSuccess message={state.ok ? state.message : null} />

      {shownKey ? (
        <div className="flex flex-col gap-2 rounded-lg border border-stock/40 bg-stock/10 p-3">
          <p className="text-sm font-medium">Your test key (shown once)</p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 font-mono text-xs break-all select-all">{shownKey}</code>
            <CopyButton text={shownKey} label="Copy key" />
          </div>
        </div>
      ) : activeKey ? (
        <p className="text-sm">
          Active test key <code className="font-mono text-xs">mrs_test_{activeKey.prefix}_…</code>
          {pricingModel === "credits"
            ? ` · ${activeKey.creditsRemaining} free call${activeKey.creditsRemaining === 1 ? "" : "s"} left`
            : activeKey.validUntil
              ? ` · works until ${new Date(activeKey.validUntil).toLocaleString()}`
              : null}
          . Lost it? Create a new one; the old one stops working.
        </p>
      ) : (
        <p className="text-sm text-muted">No test key yet.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <form action={formAction}>
          <input type="hidden" name="listingId" value={listingId} />
          <input type="hidden" name="intent" value="create" />
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            {activeKey || shownKey ? "Create a new test key" : "Create test key"}
          </button>
        </form>
        {activeKey || shownKey ? (
          <form action={formAction}>
            <input type="hidden" name="listingId" value={listingId} />
            <input type="hidden" name="intent" value="revoke" />
            <button type="submit" disabled={pending} className={buttonClass.secondary}>
              Stop test key
            </button>
          </form>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Try a call</p>
          <CopyButton text={command} label="Copy command" />
        </div>
        <pre className="overflow-x-auto rounded-lg border border-current/15 bg-current/5 p-3 font-mono text-xs leading-relaxed">{command}</pre>
        <p className="text-xs text-muted">
          Paste it into Git Bash or any terminal. Everything after <code className="font-mono">/v1/tools/…/</code> is added to your endpoint, so this
          calls <code className="font-mono">your-endpoint/summarize</code>.
        </p>
      </div>
    </div>
  );
}
