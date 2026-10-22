/** Program information is independent of release history. Add programs here. */
export interface FreeTool {
  slug: string;
  name: string;
  category: string;
  description: string;
}

export interface ToolRelease {
  version: string;
  prerelease?: boolean;
  /** Verified official release page, separate from the installer asset. */
  releaseNotesUrl?: string;
  /** Release-specific limitations shown next to the download. */
  notice?: string;
  /** ISO date, only when the release date has been verified. */
  releasedOn?: string;
  /** Public GitHub Releases asset, independently downloaded and hash-verified before publishing. */
  download: {
    /** Pinned /releases/download/<tag>/<asset> URL, never a moving latest link. */
    url: string;
    sha256: string;
  };
  changes: { added: string[]; improved: string[]; fixed: string[] };
}

export const freeTools: FreeTool[] = [
  {
    slug: 'modbus-check',
    name: 'Modbus Check',
    category: '통신 점검',
    description: 'Excel에서 작성한 주소맵을 불러와 통신 확인과 기록으로 이어가는 BMS·MES 실무용 무료 도구입니다.',
  },
];

/** Newest first. Publish only verified releases with an accessible file.
 * Until a real release is supplied, leave the program's array empty.
 * The first entry is the single source for every latest-download button.
 */
export const toolReleases: Record<string, ToolRelease[]> = {
  'modbus-check': [
{
      "version": "0.2.0-rc.11",
      "prerelease": true,
      "releasedOn": "2026-10-22",
      "releaseNotesUrl": "https://github.com/oryx-system/ModbusCheck-Releases/releases/tag/v0.2.0-rc.11",
      "notice": "사전 릴리스 · 미서명 EXE · 다른 PC 기본 Office 환경 미검증.",
      "download": {
            "url": "https://github.com/oryx-system/ModbusCheck-Releases/releases/download/v0.2.0-rc.11/ModbusCheck-0.2.0-rc.11-Setup-win-x64.exe",
            "sha256": "dd63d97fba5b375dc942ad270b5043f57cfd61f6e6e2df9f43a08a40b281d185"
      },
      "changes": {
            "added": [
                  "PDU 0~1000 표준 양식과 FC03/FC04·0/1 기반 참조 주소 선택을 제공합니다."
            ],
            "improved": [
                  "표준·현재 주소맵은 Windows 저장 창에서 생성하며 보안 검사와 기존 파일 보호를 유지합니다.",
                  "최대 ASCII 편집 속도와 반복 전환 안정성을 개선했습니다(검증 PC 측정).",
                  "공식 Node.js 24.22.1 보안 수정판을 반영했습니다."
            ],
            "fixed": [
                  "Binary 문서용 ON/OFF 입력 보호와 ASCII Bytes 1~246 유효성 오류를 수정했습니다.",
                  "주소 행은 중성 회색/흰색 교차, Binary 하위 행은 흰색으로 통일하고 주소 값을 가운데 정렬했습니다."
            ]
      }
},
    {
      version: '0.2.0-rc.7',
      prerelease: true,
      releasedOn: '2026-10-20',
      releaseNotesUrl: 'https://github.com/oryx-system/ModbusCheck-Releases/releases/tag/v0.2.0-rc.7',
      notice: '미서명 EXE · 예정된 Node HIGH 보안 수정 미포함.',
      download: {
        url: 'https://github.com/oryx-system/ModbusCheck-Releases/releases/download/v0.2.0-rc.7/ModbusCheck-0.2.0-rc.7-Setup-win-x64.exe',
        sha256: '9b8dd1f9e9718248e4634ff248fe0100226e9a6756e343502a1943665361bc08',
      },
      changes: {
        added: [
          'Windows x64용 0.2.0-rc.7 사전 공개 설치 파일을 제공합니다. Node.js는 별도로 설치하지 않습니다.',
        ],
        improved: [
          '콘솔 창 없는 GUI 실행기, Windows 아이콘과 기본 바탕화면 바로가기를 제공합니다.',
          '편집용 XLSM의 Bit 0~15 직접 입력과 다중 워드 후속 행 보호, 일반 설명·비트 메타데이터 보존을 지원합니다.',
        ],
        fixed: [],
      },
    },
  ],
};

/** Checks metadata format only; file access and bytes must be verified before registration. */
export function githubReleaseDownloadUrl(download: ToolRelease['download']): string | null {
  if (!/^[a-f0-9]{64}$/i.test(download.sha256)) return null;
  try {
    const url = new URL(download.url);
    if (url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash || url.href !== download.url) return null;
    const path = url.pathname.split('/');
    if (path.length !== 7 || path[3] !== 'releases' || path[4] !== 'download') return null;
    if (!/^[A-Za-z0-9-]+$/.test(path[1]) || !/^[A-Za-z0-9_.-]+$/.test(path[2])) return null;
    // Reject encoded separators, dot segments and control characters in tags/assets.
    if ([path[1], path[2], path[5], path[6]].some(part => {
      const decoded = decodeURIComponent(part);
      return !decoded.trim() || decoded === '.' || decoded === '..' || /[/\\\u0000-\u001f\u007f]/.test(decoded);
    })) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function latestToolRelease(slug: string): ToolRelease | undefined {
  const latest = toolReleases[slug]?.[0];
  return latest && githubReleaseDownloadUrl(latest.download) ? latest : undefined;
}
