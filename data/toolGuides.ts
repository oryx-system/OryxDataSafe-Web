export interface ToolGuideSection {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
  ordered?: boolean;
}

export const modbusUserGuideUrl = 'https://github.com/oryx-system/OryxDataSafe-Web/blob/main/release/modbus-check/USER_GUIDE.ko.md';

/** Keep the homepage brief; the complete usage guide is maintained on GitHub. */
export const toolGuides: Record<string, ToolGuideSection[]> = {
  'modbus-check': [
    {
      id: 'benefits',
      title: '핵심 편의 기능',
      paragraphs: [],
      items: [
        '통신 설정 찾기: 읽기 전용 검색으로 응답하는 연결 조건을 확인합니다.',
        '주소맵 한눈에 보기: 정수·Float·Binary·ASCII 값을 주소별로 비교합니다.',
        'Excel 재입력 줄이기: 비트 설명을 직접 편집하고 주소맵을 내보내 다시 불러옵니다.',
        '시운전 기록 남기기: 값의 변화를 트렌드로 보고 읽기 기록을 CSV·Excel로 저장합니다.',
      ],
    },
  ],
};
