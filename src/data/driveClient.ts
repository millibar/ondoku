import type { Content } from "../types";

// Google Drive連携。参照: docs/spec.md 7章

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export interface DriveLayout {
  tsvFile: DriveFile | null;
  audioFilesByName: Map<string, DriveFile>;
}

export interface AudioResolutionResult {
  resolved: Map<number, DriveFile>;
  missing: number[];
}

type FetchImpl = typeof fetch;

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const MIME_TYPES: Record<string, string> = {
  ".opus": "audio/ogg; codecs=opus",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
};

export class DriveApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DriveApiError";
    this.status = status;
  }
}

export function mimeTypeForFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  const ext = dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

async function driveFetch(
  url: string,
  accessToken: string,
  fetchImpl: FetchImpl,
): Promise<Response> {
  const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new DriveApiError(res.status, `Google Drive APIエラー（status: ${res.status}）`);
  }
  return res;
}

export async function listFilesInFolder(
  folderId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `${DRIVE_API_BASE}/files?q=${q}&fields=files(id,name,mimeType)&pageSize=1000`;
  const res = await driveFetch(url, accessToken, fetchImpl);
  const data = (await res.json()) as { files?: DriveFile[] };
  return data.files ?? [];
}

export async function resolveDriveLayout(
  rootFolderId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<DriveLayout> {
  const rootFiles = await listFilesInFolder(rootFolderId, accessToken, fetchImpl);

  const tsvFile = rootFiles.find((f) => f.name.toLowerCase().endsWith(".tsv")) ?? null;
  const subfolders = rootFiles.filter((f) => f.mimeType === FOLDER_MIME_TYPE);
  const nonFolderRootFiles = rootFiles.filter((f) => f.mimeType !== FOLDER_MIME_TYPE);

  const subfolderFileLists = await Promise.all(
    subfolders.map((folder) => listFilesInFolder(folder.id, accessToken, fetchImpl)),
  );

  const audioFilesByName = new Map<string, DriveFile>();
  for (const file of [...nonFolderRootFiles, ...subfolderFileLists.flat()]) {
    if (!audioFilesByName.has(file.name)) {
      audioFilesByName.set(file.name, file);
    }
  }

  return { tsvFile, audioFilesByName };
}

export function resolveAudioFiles(
  contents: Content[],
  audioFilesByName: Map<string, DriveFile>,
): AudioResolutionResult {
  const resolved = new Map<number, DriveFile>();
  const missing: number[] = [];

  for (const content of contents) {
    const file = audioFilesByName.get(content.audioFileName);
    if (file) {
      resolved.set(content.id, file);
    } else {
      missing.push(content.id);
    }
  }

  return { resolved, missing };
}

export async function downloadFileText(
  fileId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<string> {
  const res = await driveFetch(
    `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
    accessToken,
    fetchImpl,
  );
  return res.text();
}

export async function downloadFileBinary(
  fileId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<ArrayBuffer> {
  const res = await driveFetch(
    `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
    accessToken,
    fetchImpl,
  );
  return res.arrayBuffer();
}
