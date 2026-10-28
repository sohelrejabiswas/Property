import { statusLabel } from "@/lib/format";

const styles: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-800",
  sold: "bg-stone-200 text-stone-700",
  on_hold: "bg-amber-100 text-amber-800",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${styles[status] ?? "bg-stone-100"}`}>
      {statusLabel(status)}
    </span>
  );
}
