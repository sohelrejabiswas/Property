import "server-only";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const ROOT_NAME = "Land Management App";

export function driveConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

export const DRIVE_SETUP_MESSAGE =
  "Google Drive is not configured yet. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN in your environment (see README, section 'Google Drive setup'), then redeploy.";

let cached: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (!driveConfigured()) throw new Error(DRIVE_SETUP_MESSAGE);
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Google rejected the Drive credentials (${json.error_description || json.error || res.status}). Re-check your refresh token.`);
  }
  cached = { token: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cached.token;
}

async function drive(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  return fetch(path.startsWith("http") ? path : API + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    cache: "no-store",
  });
}

async function jsonOrThrow<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Drive error while ${what} (${res.status}). ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

async function findFolder(query: string): Promise<string | null> {
  const params = new URLSearchParams({ q: query, fields: "files(id)", pageSize: "1", spaces: "drive" });
  const data = await jsonOrThrow<{ files: { id: string }[] }>(await drive(`/files?${params}`), "searching folders");
  return data.files[0]?.id ?? null;
}

async function createFolder(name: string, parent?: string): Promise<string> {
  const res = await drive(`/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parent ? { parents: [parent] } : {}) }),
  });
  return (await jsonOrThrow<{ id: string }>(res, "creating a folder")).id;
}

async function rootFolder(): Promise<string> {
  const found = await findFolder(
    `name = '${ROOT_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents`,
  );
  return found ?? (await createFolder(ROOT_NAME));
}

/** One folder per property, named "LND-00001 - Title", inside the "Land Management App" folder. */
export async function ensurePropertyFolder(code: string, title: string): Promise<string> {
  const root = await rootFolder();
  const found = await findFolder(
    `'${esc(root)}' in parents and name contains '${esc(code)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
  if (found) return found;
  return createFolder(`${code} - ${title}`.slice(0, 120), root);
}

export async function findPropertyFolder(code: string): Promise<string | null> {
  const root = await rootFolder();
  return findFolder(
    `'${esc(root)}' in parents and name contains '${esc(code)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
}

/** Starts a resumable upload; the browser then PUTs the file straight to Google (bypasses Vercel's 4.5 MB body limit). */
export async function startResumableUpload(opts: {
  folderId: string;
  fileName: string;
  mimeType: string;
  size: number;
  origin: string;
}): Promise<string> {
  const res = await drive(`${UPLOAD}?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": opts.mimeType,
      "X-Upload-Content-Length": String(opts.size),
      Origin: opts.origin, // makes Google return CORS headers for the browser upload
    },
    body: JSON.stringify({ name: opts.fileName, parents: [opts.folderId] }),
  });
  if (!res.ok) {
    throw new Error(`Google Drive refused to start the upload (${res.status}). ${(await res.text()).slice(0, 200)}`);
  }
  const url = res.headers.get("location");
  if (!url) throw new Error("Google Drive did not return an upload URL.");
  return url;
}

export async function getFileMeta(fileId: string) {
  const res = await drive(`/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,parents,trashed`);
  return jsonOrThrow<{ id: string; name: string; mimeType: string; parents?: string[]; trashed?: boolean }>(res, "reading a file");
}

export async function deleteDriveItem(id: string) {
  const res = await drive(`/files/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Google Drive could not delete the file (${res.status}).`);
  }
}

/** Streams a file (with Range support for video seeking). */
export async function downloadFile(fileId: string, range: string | null) {
  return drive(`/files/${encodeURIComponent(fileId)}?alt=media`, range ? { headers: { Range: range } } : {});
}

/** Real end-to-end check used by Settings -> "Test Google Drive". */
export async function testDrive() {
  const about = await jsonOrThrow<{ user?: { emailAddress?: string } }>(await drive(`/about?fields=user(emailAddress)`), "checking the account");
  const root = await rootFolder();
  return { email: about.user?.emailAddress ?? "unknown", rootFolderId: root };
}
