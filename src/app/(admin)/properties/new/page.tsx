import PropertyForm from "@/components/PropertyForm";
import { requireAdmin } from "@/lib/auth";
import { DRIVE_SETUP_MESSAGE, driveConfigured } from "@/lib/drive";

export const metadata = { title: "Add New Land" };
export const dynamic = "force-dynamic";

export default async function NewPropertyPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Add New Land</h1>
      <PropertyForm driveReady={driveConfigured()} driveMessage={DRIVE_SETUP_MESSAGE} />
    </div>
  );
}
