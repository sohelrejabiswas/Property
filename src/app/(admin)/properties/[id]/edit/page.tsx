import { notFound } from "next/navigation";
import PropertyForm from "@/components/PropertyForm";
import { requireAdmin } from "@/lib/auth";
import { DRIVE_SETUP_MESSAGE, driveConfigured } from "@/lib/drive";
import { getMedia, getPropertyById } from "@/lib/properties";

export const metadata = { title: "Edit Property" };
export const dynamic = "force-dynamic";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const p = await getPropertyById(id);
  if (!p) notFound();
  const media = await getMedia(p.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Edit Property</h1>
        <p className="text-stone-600">{p.propertyCode}</p>
      </div>
      <PropertyForm
        driveReady={driveConfigured()}
        driveMessage={DRIVE_SETUP_MESSAGE}
        media={media.map((m) => ({ id: m.id, fileName: m.fileName, fileType: m.fileType, isCover: m.isCover }))}
        property={{
          id: p.id,
          propertyCode: p.propertyCode,
          title: p.title,
          description: p.description ?? "",
          status: p.status,
          askingPrice: p.askingPrice ? String(Number(p.askingPrice)) : "",
          landArea: p.landArea ? String(Number(p.landArea)) : "",
          areaUnit: p.areaUnit,
          state: p.state ?? "",
          district: p.district ?? "",
          locality: p.locality ?? "",
          address: p.address ?? "",
          latitude: p.latitude != null ? String(p.latitude) : "",
          longitude: p.longitude != null ? String(p.longitude) : "",
          contactName: p.contactName ?? "",
          contactPhone: p.contactPhone ?? "",
          whatsappNumber: p.whatsappNumber ?? "",
          internalNotes: p.internalNotes ?? "",
        }}
      />
    </div>
  );
}
