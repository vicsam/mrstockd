"use client";

import { useState } from "react";

function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = u.hostname.includes("youtu.be")
        ? u.pathname.slice(1)
        : u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("loom.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.loom.com/embed/${id}` : null;
    }
    return url;
  } catch {
    return null;
  }
}

export function DemoVideo() {
  const url = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL;
  const [loaded, setLoaded] = useState(false);
  if (!url) {
    return (
      <div className="l-card flex aspect-video w-full items-center justify-center bg-[var(--l-inset)] text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="text-[16px] font-semibold text-[var(--l-ink)]">Demo video coming soon</span>
          <span className="text-[13px] text-[var(--l-muted)]">Illustrative preview</span>
        </div>
      </div>
    );
  }
  const embed = toEmbed(url);
  if (!embed) return null;
  return (
    <div className="l-card aspect-video w-full overflow-hidden">
      {loaded ? (
        <iframe
          src={embed}
          title="Demo video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="flex h-full w-full items-center justify-center bg-[var(--l-inset)] text-[14px] font-semibold text-[var(--l-brand-text)]"
        >
          Play demo video
        </button>
      )}
    </div>
  );
}
