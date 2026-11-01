"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevokeKeyButton({ keyId }: { keyId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);

  if (revoked) {
    return <span className="text-xs text-muted" aria-live="polite">Revoked</span>;
  }

  const revoke = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/keys/${keyId}/revoke`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(typeof json?.error === "string" ? json.error : "revoke_failed");
      }
      setRevoked(true);
      router.refresh();
    } catch {
      setError("Could not revoke the key. Please try again.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {confirming ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={revoke}
            aria-label={`Confirm revoke key ${keyId}`}
            className="min-h-11 rounded-full border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-60"
          >
            {busy ? "Revoking..." : "Confirm"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            aria-label="Cancel revoke"
            className="min-h-11 rounded-full border border-current/20 px-3 py-1.5 text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Revoke key ${keyId}`}
          className="min-h-11 rounded-full border border-current/20 px-3 py-1.5 text-xs font-medium"
        >
          Revoke
        </button>
      )}
      {error ? (
        <p role="alert" aria-live="assertive" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}