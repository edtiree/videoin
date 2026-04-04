@AGENTS.md

# 영상인 (Videoin) 프로젝트

## 서비스 개요
- 서비스명: 영상인
- 영문명: Videoin
- 도메인: videoin.kr
- 한 줄 정의: 유튜브 크리에이터와 영상 편집자를 위한 올인원 플랫폼

## 기술 스택
- Framework: Next.js 16.2.1 (App Router)
- Language: TypeScript 5
- Frontend: React 19.2, Tailwind CSS 4, Zustand
- DB: Supabase (supabase-js)
- Storage: Cloudflare R2 (AWS S3 SDK 호환)
- AI: OpenAI API, Anthropic Claude API
- YouTube: ytdl-core, youtube-transcript, youtubei.js
- 기타: bcryptjs, JSZip, sharp, FFmpeg
- 결제: 토스페이먼츠 (나중에 연동 예정 - 지금은 UI만)

## 폴더 구조
- 컴포넌트: /components
- API: /app/api
- Supabase 클라이언트: /lib/supabase.ts, /lib/supabase-browser.ts
- R2 스토리지: /lib/r2.ts
- 세금 계산: /lib/tax.ts
- 캐시: /lib/cache.ts
- YouTube 유틸: /lib/youtube-title/

## 현재 완성된 기능
- 홈 대시보드 (/) → /dashboard 로 이동 예정
- 정산 관리 (/settlement)
- 프로젝트 도구 (/tools)
- 유튜브 제목 생성기 (/youtube-title)
- 쇼츠 제작기 (/youtube-shorts)
- 카드뉴스 메이커 (/instagram-card)
- 화면자료 제작기 (/screen-material)
- 영상 피드백/리뷰 (/review)
- 캘린더 (/calendar)
- 관리자 대시보드 (/admin)
- 알림 시스템 (/notifications)
- 프로필 (/profile)
- 다크모드, PWA, 모바일 반응형 (BottomNav + SideNav)

## 플랜 구조
- 프리: 구인구직 + AI 매칭 추천 + 공고 3개까지
- 크리에이터 (9,900원/월): 구인구직 + AI 툴 전체 + 공고 무제한
- 팀 (29,900원/월): 구인구직 + AI 툴 + 정산/달력/직원관리
- 기업 (49,900원/월): 전체 기능 + 광고 관리

## 구인구직 카테고리
### 1단계 활성화
- 영상 편집
- 영상 촬영
- 썸네일
- 모션그래픽

### 2단계 비활성 (출시예정 뱃지 표시)
- 스크립트 작가
- 성우
- 출연자/배우
- 스튜디오 대여

## 역할 시스템
- 가입: 소셜 로그인 바로 (역할 선택 없음)
- 첫 로그인 시: 역할 선택 팝업 (스킵 가능)
- 역할 복수 선택 가능: 크리에이터/사장, 편집자/스태프, 배우/출연자
- 내 정보에서 언제든 변경 가능
- 닉네임으로 활동 (실명 불필요)

## 역할별 홈화면
- 크리에이터: 편집자 프로필 카드 피드 + 공고 올리기 CTA
- 편집자: 구인 공고 카드 피드 + 포트폴리오 등록 CTA

## 프로젝트 방향 변경 히스토리
- 원래 목적: 영상 제작팀 내부 업무 시스템 (에디트리)
- 변경 목적: 외부 서비스 출시용 올인원 플랫폼 (영상인)

### 기존 기능 재활용 방식
- 정산/달력/직원관리/광고관리 → 팀 플랜 기능으로 전환
- AI 툴 전체 → 크리에이터 플랜 기능으로 전환
- 관리자 대시보드 → 팀/기업 플랜 전용 유지
- 기존 PIN 기반 인증 → 소셜 로그인으로 변경 필요

## 개발 규칙
- UI는 한국어 사용
- 모바일 우선 반응형
- 기존 컴포넌트 스타일 유지 (Tailwind CSS 4)
- 다크모드 지원 필수
- 기존 Supabase 클라이언트 패턴 그대로 사용
- 비로그인 유저도 구인구직 열람 가능
- 로그인 필요 기능 접근 시 그때 로그인 유도
