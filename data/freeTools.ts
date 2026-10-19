/** Program information is independent of release history. Add programs here. */
export interface FreeTool {
  slug: string;
  name: string;
  category: string;
  description: string;
}

export interface ToolRelease {
  version: string;
  /** ISO date, only when the release date has been verified. */
  releasedOn?: string;
  /** A verified, shared Google Drive file ID. Never a folder or preview URL. */
  driveFileId: string;
  changes: { added: string[]; improved: string[]; fixed: string[] };
}

export const freeTools: FreeTool[] = [
  {
    slug: 'modbus-check',
    name: 'Modbus Check',
    category: '통신 점검',
    description: '현장에서 Modbus 통신과 주소별 데이터를 확인하는 무료 점검 도구입니다.',
  },
];

/** Newest first. Publish only verified releases with an accessible file.
 * Until a real release is supplied, leave the program's array empty.
 * The first entry is the single source for every latest-download button.
 */
export const toolReleases: Record<string, ToolRelease[]> = {
  'modbus-check': [],
};

export function driveDownloadUrl(fileId: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(fileId)) return null;
  // Google's normal download endpoint preserves its permission and scan checks.
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

export function latestToolRelease(slug: string): ToolRelease | undefined {
  const latest = toolReleases[slug]?.[0];
  return latest && driveDownloadUrl(latest.driveFileId) ? latest : undefined;
}
