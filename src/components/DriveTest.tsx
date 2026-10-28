"use client";

import { useState } from "react";
import { testDriveAction } from "@/app/actions";

export default function DriveTest() {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy}
        className="btn-secondary"
        onClick={async () => {
          setBusy(true);
          const r = await testDriveAction();
          setBusy(false);
          setState(r.ok ? { ok: true, text: `Working. Connected as ${r.email}. Files go into the “Land Management App” folder.` } : { ok: false, text: r.error });
        }}
      >
        {busy ? "Testing…" : "Test Google Drive"}
      </button>
      {state && <p role="status" className={`rounded-xl p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{state.text}</p>}
    </div>
  );
}
