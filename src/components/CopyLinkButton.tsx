"use client";

import { useState } from "react";

export default function CopyLinkButton({ link, className = "btn-secondary" }: { link: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try { await navigator.clipboard.writeText(link); } catch { window.prompt("Copy this link:", link); }
        setDone(true);
        setTimeout(() => setDone(false), 2500);
      }}
    >
      {done ? "✓ Link copied" : "🔗 Copy link"}
    </button>
  );
}
