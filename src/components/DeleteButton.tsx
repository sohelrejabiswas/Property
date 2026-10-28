"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteProperty } from "@/app/actions";

export default function DeleteButton({ id, title, hasMedia }: { id: string; title: string; hasMedia: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    const r = await deleteProperty(id);
    if (!r.ok) { setBusy(false); setError(r.error); return; }
    router.push("/properties");
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-danger-outline">🗑 Delete</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="del-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="del-title" className="text-xl font-bold">Delete this property?</h2>
            <p className="mt-2 text-stone-700">
              “{title}” will be permanently deleted{hasMedia ? ", along with its photos and videos in Google Drive" : ""}. This cannot be undone.
            </p>
            {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
              <button type="button" disabled={busy} onClick={() => void confirmDelete()} className="btn-danger">{busy ? "Deleting…" : "Yes, delete"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
