"use client";

import { registerMedia } from "@/app/actions";

const MAX_DIM = 2000;

/** Shrinks big phone photos in the browser (faster upload, smaller Drive usage). Videos are untouched. */
async function prepare(file: File): Promise<{ blob: Blob; name: string; mime: string }> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return { blob: file, name: file.name, mime: file.type };
  }
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (blob) return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg", mime: "image/jpeg" };
  } catch {
    /* fall through */
  }
  if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
    throw new Error("This photo format (HEIC) is not supported by this browser. Please choose a JPG or PNG.");
  }
  return { blob: file, name: file.name, mime: file.type };
}

function putToDrive(url: string, blob: Blob, mime: string, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", mime);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText).id as string);
        } catch {
          reject(new Error("Google Drive returned an unexpected response."));
        }
      } else reject(new Error(`Google Drive upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Upload was interrupted (network or browser blocked the request). Please try again."));
    xhr.send(blob);
  });
}

/** Full upload of one file: session -> direct PUT to Drive -> verify + record in Neon. Throws a readable Error on failure. */
export async function uploadMedia(propertyId: string, file: File, onProgress: (pct: number) => void) {
  const { blob, name, mime } = await prepare(file);
  const res = await fetch("/api/drive/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId, fileName: name, mimeType: mime, size: blob.size }),
  });
  const session = (await res.json().catch(() => ({}))) as { uploadUrl?: string; folderId?: string; error?: string };
  if (!res.ok || !session.uploadUrl || !session.folderId) throw new Error(session.error ?? "Could not start the upload.");

  const fileId = await putToDrive(session.uploadUrl, blob, mime, onProgress);
  const reg = await registerMedia({ propertyId, fileId, folderId: session.folderId, fileName: name, mimeType: mime });
  if (!reg.ok) throw new Error(reg.error);
}
