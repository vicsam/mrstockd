"use client";

import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type RevealedKey = { key: string; prefix: string; creditsRemaining: number };

export type BuyWithPayPalProps = {
  toolSlug: string;
  toolName: string;
  unitPriceCents: number;
  creditsPerUnit: number;
};

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

function friendlyError(code: string | undefined): string {
  switch (code) {
    case "capture_failed":
      return "The payment didn't complete. You haven't been charged.";
    case "amount_mismatch":
      return "The payment didn't match the order. No key was issued.";
    case "not_found":
      return "Order not found.";
    case "validation":
      return "Please choose between 1 and 10 packs.";
    case "already_completed":
      return "This purchase is already complete.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function BuyWithPayPal(props: BuyWithPayPalProps) {
  const { toolSlug, toolName, unitPriceCents, creditsPerUnit } = props;
  const [packs, setPacks] = useState(1);
  const [ourOrderId, setOurOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedKey | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [copied, setCopied] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  if (!clientId) {
    return <p className="text-sm text-red-600">PayPal is not configured.</p>;
  }

  if (revealed) {
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(revealed.key);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    return (
      <div className="flex flex-col gap-4" role="status" aria-live="polite">
        <p className="font-medium text-green-700">Purchase complete. Your API key is shown once.</p>
        <div className="rounded-lg border border-current/15 p-4">
          <code className="break-all text-sm">{revealed.key}</code>
        </div>
        <button
          type="button"
          onClick={copy}
          className="min-h-11 self-start rounded-full border border-current/20 px-4 py-2 text-sm font-medium"
        >
          {copied ? "Copied" : "Copy key"}
        </button>
        <p className="text-sm text-red-600">This key won't be shown again. Copy it now and store it safely.</p>
        <pre className="overflow-x-auto rounded-lg border border-current/15 p-4 text-xs">
          <code>{`curl https://gateway.example.com/v1/tools/${toolSlug}/ \\\n  -H "Authorization: Bearer ${revealed.key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"input": "..."}'`}</code>
        </pre>
        <a href="/account/keys" className="text-sm underline-offset-4 hover:underline">
          Go to your keys
        </a>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="flex flex-col gap-3" role="status" aria-live="polite">
        <p className="font-medium">Your purchase is already complete.</p>
        <a href="/account/keys" className="text-sm underline-offset-4 hover:underline">
          View your keys
        </a>
      </div>
    );
  }

  const totalCents = unitPriceCents * packs;
  const totalCalls = creditsPerUnit * packs;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label htmlFor="packs" className="text-sm font-medium">
          Packs
        </label>
        <select
          id="packs"
          value={packs}
          onChange={(e) => setPacks(Number(e.target.value))}
          className="min-h-11 rounded-lg border border-current/20 px-3 py-2"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">
          {totalCalls} calls for ${money(totalCents)} USD
        </span>
      </div>

      {error ? (
        <p role="alert" aria-live="assertive" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <PayPalScriptProvider options={{ clientId, currency: "USD", intent: "capture" }}>
        <PayPalButtons
          style={{ layout: "vertical", label: "pay" }}
          disabled={busy}
          createOrder={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/checkout/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug: toolSlug, packs }),
              });
              const json = await res.json();
              if (!res.ok) {
                setError(friendlyError(json?.error));
                throw new Error(typeof json?.error === "string" ? json.error : "create_failed");
              }
              setOurOrderId(json.orderId);
              return json.paypalOrderId as string;
            } catch (e) {
              if (!error) setError("Something went wrong. Please try again.");
              throw e instanceof Error ? e : new Error("create_failed");
            } finally {
              setBusy(false);
            }
          }}
          onApprove={async () => {
            if (!ourOrderId) {
              setError("Something went wrong. Please try again.");
              return;
            }
            setBusy(true);
            setError(null);
            try {
              const res = await fetch(`/api/checkout/orders/${ourOrderId}/capture`, { method: "POST" });
              const json = await res.json();
              if (!res.ok) {
                setError(friendlyError(json?.error));
                return;
              }
              if (json.status === "completed") {
                setRevealed(json.key as RevealedKey);
              } else {
                setAlreadyCompleted(true);
              }
            } catch {
              setError("Something went wrong. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
          onCancel={() => setError("Checkout cancelled.")}
          onError={() => setError("PayPal couldn't process the payment. Please try again.")}
        />
      </PayPalScriptProvider>
      <p className="sr-only">Buying {toolName}</p>
    </div>
  );
}