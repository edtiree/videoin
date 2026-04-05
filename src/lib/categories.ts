export interface SubCategory {
  key: string;
  label: string;
}

export interface MainCategory {
  key: string;
  label: string;
  icon: string;
  subs: SubCategory[];
}

export const CATEGORIES: MainCategory[] = [
  {
    key: "영상 편집", label: "영상 편집", icon: "🎬",
    subs: [
      { key: "유튜브 영상", label: "유튜브 영상" },
      { key: "숏폼 영상", label: "숏폼 영상" },
      { key: "광고·홍보 영상", label: "광고·홍보 영상" },
      { key: "제품 영상", label: "제품 영상" },
      { key: "교육 영상", label: "교육 영상" },
      { key: "업종별 영상", label: "업종별 영상" },
      { key: "행사 영상", label: "행사 영상" },
      { key: "온라인 중계", label: "온라인 중계" },
      { key: "영상 후반작업", label: "영상 후반작업" },
      { key: "영상 기타", label: "영상 기타" },
    ],
  },
  {
    key: "영상 촬영", label: "영상 촬영", icon: "📸",
    subs: [
      { key: "유튜브 촬영", label: "유튜브 촬영" },
      { key: "광고·홍보 촬영", label: "광고·홍보 촬영" },
      { key: "제품 촬영", label: "제품 촬영" },
      { key: "행사 촬영", label: "행사 촬영" },
      { key: "인터뷰 촬영", label: "인터뷰 촬영" },
      { key: "드론 촬영", label: "드론 촬영" },
      { key: "웨딩 촬영", label: "웨딩 촬영" },
      { key: "현장 스탭", label: "현장 스탭" },
      { key: "촬영 기타", label: "촬영 기타" },
    ],
  },
  {
    key: "썸네일", label: "썸네일", icon: "🖼️",
    subs: [
      { key: "유튜브 썸네일", label: "유튜브 썸네일" },
      { key: "강의 썸네일", label: "강의 썸네일" },
      { key: "광고 배너", label: "광고 배너" },
      { key: "채널아트", label: "채널아트" },
      { key: "제품·홍보 사진", label: "제품·홍보 사진" },
      { key: "사진 보정", label: "사진 보정" },
      { key: "이벤트 스냅", label: "이벤트 스냅" },
    ],
  },
  {
    key: "모션그래픽", label: "모션그래픽", icon: "✨",
    subs: [
      { key: "모션그래픽", label: "모션그래픽" },
      { key: "인포그래픽", label: "인포그래픽" },
      { key: "인트로·로고", label: "인트로·로고" },
      { key: "타이포그래피", label: "타이포그래피" },
      { key: "3D 모델링", label: "3D 모델링" },
      { key: "2D 애니메이션", label: "2D 애니메이션" },
      { key: "3D 애니메이션", label: "3D 애니메이션" },
      { key: "미디어 아트", label: "미디어 아트" },
      { key: "AR·VR·XR", label: "AR·VR·XR" },
    ],
  },
  {
    key: "스크립트", label: "스크립트", icon: "✏️",
    subs: [
      { key: "유튜브 대본", label: "유튜브 대본" },
      { key: "광고 카피", label: "광고 카피" },
      { key: "시나리오", label: "시나리오" },
      { key: "콘티·스토리보드", label: "콘티·스토리보드" },
      { key: "기획안 작성", label: "기획안 작성" },
    ],
  },
  {
    key: "성우", label: "성우", icon: "🎙️",
    subs: [
      { key: "내레이션", label: "내레이션" },
      { key: "광고 성우", label: "광고 성우" },
      { key: "캐릭터 더빙", label: "캐릭터 더빙" },
      { key: "음악·음원", label: "음악·음원" },
      { key: "오디오 콘텐츠", label: "오디오 콘텐츠" },
      { key: "오디오 엔지니어링", label: "오디오 엔지니어링" },
      { key: "AI 음향", label: "AI 음향" },
    ],
  },
  {
    key: "출연자", label: "출연자", icon: "🎭",
    subs: [
      { key: "배우", label: "배우" },
      { key: "모델", label: "모델" },
      { key: "MC·쇼호스트", label: "MC·쇼호스트" },
      { key: "공연", label: "공연" },
      { key: "헤어메이크업", label: "헤어메이크업" },
    ],
  },
  {
    key: "스튜디오", label: "스튜디오", icon: "🏠",
    subs: [
      { key: "촬영 스튜디오", label: "촬영 스튜디오" },
      { key: "녹음 스튜디오", label: "녹음 스튜디오" },
      { key: "크로마키 스튜디오", label: "크로마키 스튜디오" },
      { key: "개인 공간", label: "개인 공간" },
      { key: "장비 대여", label: "장비 대여" },
    ],
  },
];

export function getCategoryByKey(key: string): MainCategory | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

export function getAllSubCategories(): string[] {
  return CATEGORIES.flatMap((c) => c.subs.map((s) => s.label));
}
