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
        'Excel에서 준비하기: 주소맵 양식에 주소·자료형·설명·비트 설명을 작성합니다.',
        '앱에서 이어 쓰기: 미리보기 후 주소맵을 불러와 같은 내용을 다시 입력하는 수고를 줄입니다.',
        '통신·값 확인: 준비한 주소맵으로 장비의 수신값을 확인합니다.',
        '시운전 기록 남기기: 값의 변화를 트렌드로 보고 읽기 기록을 CSV·Excel로 저장합니다.',
      ],
    },
  ],
};
