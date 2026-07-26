import { getAuthToken, handleUnauthorized } from "@/services/authService";
import { isUniCloudDataSource, requireApiBaseUrl, requireUniCloudMode } from "@/services/apiConfig";
import { releaseNotes as seedReleaseNotes, type ReleaseGroup, type ReleaseNote } from "@/features/help/releaseNotes";

export type ReleasePlatform = "web" | "mini-program" | "android" | "ios";
export type ReleaseStatus = "draft" | "published";

export type ManagedReleaseNote = ReleaseNote & {
  id: string;
  platform: ReleasePlatform;
  status: ReleaseStatus;
  forceUpdate: boolean;
  minSupportedVersion: string;
};

export const releasePlatforms: Array<{ value: ReleasePlatform; label: string }> = [
  { value: "web", label: "Web" },
  { value: "mini-program", label: "小程序" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
];

const STORAGE_KEY = "rizhi-release-notes";

function normalizeGroups(groups: ReleaseGroup[] | undefined): ReleaseGroup[] {
  return [
    { label: "新增", type: "new", items: groups?.find((group) => group.type === "new")?.items || [] },
    { label: "优化", type: "improved", items: groups?.find((group) => group.type === "improved")?.items || [] },
    { label: "修复", type: "fixed", items: groups?.find((group) => group.type === "fixed")?.items || [] },
  ];
}

function compareVersions(left: string, right: string) {
  const leftParts = left.replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (rightParts[index] || 0) - (leftParts[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function sortReleaseNotes(notes: ManagedReleaseNote[]) {
  return [...notes].sort((left, right) => right.date.localeCompare(left.date) || compareVersions(left.version, right.version));
}

function seed(): ManagedReleaseNote[] {
  return seedReleaseNotes.map((note, index) => ({
    ...note,
    id: `seed-${index}`,
    platform: "web",
    status: "published",
    forceUpdate: false,
    minSupportedVersion: "",
    groups: normalizeGroups(note.groups),
  }));
}

function readLocal(): ManagedReleaseNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ManagedReleaseNote[];
  } catch { /* use the built-in seed */ }
  const initial = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function writeLocal(notes: ManagedReleaseNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  return notes;
}

async function cloudRequest<T>(path: string, method = "GET", payload: Record<string, unknown> = {}) {
  requireUniCloudMode("版本管理");
  const response = await fetch(`${requireApiBaseUrl()}${path}`, {
    method: "POST",
    headers: method === "GET" ? undefined : { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ __rizhiTransport: true, method, token: getAuthToken(), payload }),
  });
  const result = await response.json().catch(() => ({})) as { data?: T; error?: { message?: string } };
  if (!response.ok || result.error) {
    if (response.status === 401) handleUnauthorized();
    throw new Error(result.error?.message || "版本记录请求失败");
  }
  return result.data as T;
}

export async function listReleaseNotes(platform?: ReleasePlatform, publishedOnly = false, admin = false) {
  if (isUniCloudDataSource()) {
    const query = new URLSearchParams();
    if (platform) query.set("platform", platform);
    if (publishedOnly) query.set("publishedOnly", "true");
    const notes = await cloudRequest<ManagedReleaseNote[]>(`${admin ? "/admin" : ""}/release-notes${query.size ? `?${query}` : ""}`);
    return sortReleaseNotes(notes);
  }
  return sortReleaseNotes(readLocal()
    .filter((note) => !platform || note.platform === platform)
    .filter((note) => !publishedOnly || note.status === "published"));
}

export async function saveReleaseNote(note: Omit<ManagedReleaseNote, "id"> & { id?: string }) {
  if (isUniCloudDataSource()) {
    return cloudRequest<ManagedReleaseNote>(note.id ? `/admin/release-notes/${encodeURIComponent(note.id)}` : "/admin/release-notes", note.id ? "PATCH" : "POST", note);
  }
  const notes = readLocal();
  const saved = { ...note, id: note.id || `release-${Date.now()}`, groups: normalizeGroups(note.groups) } as ManagedReleaseNote;
  const next = note.id ? notes.map((item) => item.id === note.id ? saved : item) : [saved, ...notes];
  writeLocal(next);
  return saved;
}

export async function deleteReleaseNote(id: string) {
  if (isUniCloudDataSource()) return cloudRequest<null>(`/admin/release-notes/${encodeURIComponent(id)}`, "DELETE");
  writeLocal(readLocal().filter((note) => note.id !== id));
}
