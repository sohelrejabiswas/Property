"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPublished } from "@/app/actions";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export default function ShareButtons({
  propertyId,
  title,
  isPublished,
  link,
  text,
  textWithLink,
}: {
  propertyId: string;
  title: string;
  isPublished: boolean;
  link: string;
  /** Share message without link (used while unpublished) */
  text: string;
  /** Share message with the public link appended (used once published) */
  textWithLink: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const message = isPublished ? textWithLink : text;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(null), 3500); };

  async function togglePublish() {
    setBusy(true);
    const r = await setPublished(propertyId, !isPublished);
    setBusy(false);
    if (!r.ok) return flash(r.error);
    router.refresh();
  }

  async function copyLink() {
    if (!isPublished) return flash("Publish this property first to get a public link.");
    flash((await copy(link)) ? "Link copied" : "Could not copy. Long-press the link below to copy it.");
  }

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title !mb-1">Share this property</h2>
          <p className="text-sm text-stone-600">
            {isPublished ? "Published: anyone with the link can see photos, price and location. Internal notes stay private." : "Not published: only you can see this property. Publish it to get a link for buyers."}
          </p>
        </div>
        <button type="button" onClick={() => void togglePublish()} disabled={busy} className={isPublished ? "btn-secondary" : "btn-primary"}>
          {busy ? "Please wait…" : isPublished ? "Unpublish" : "Publish page"}
        </button>
      </div>

      {isPublished && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="block break-all rounded-xl bg-stone-50 px-4 py-3 text-sm text-brand-800 underline">{link}</a>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className="btn bg-[#25D366] text-white hover:brightness-95">
          Share on WhatsApp
        </a>
        <button type="button" className="btn-secondary" onClick={async () => flash((await copy(message)) ? "Details copied" : "Could not copy")}>Copy property details</button>
        <button type="button" className="btn-secondary" onClick={() => void copyLink()}>Copy property link</button>
        {canNativeShare && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigator.share({ title, text: message, ...(isPublished ? { url: link } : {}) }).catch(() => {})}
          >
            Share…
          </button>
        )}
      </div>
      {note && <p role="status" className="rounded-xl bg-stone-900 px-4 py-3 text-sm text-white">{note}</p>}
    </section>
  );
}
