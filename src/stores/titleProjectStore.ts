import { create } from "zustand";

export interface VideoResult {
  video_id: string;
  title: string;
  channel_name: string;
  view_count: number;
  view_display: string;
  thumbnail: string;
  published_at: string;
  duration_sec: number;
  duration_display: string;
  type: string;
}

export interface TitleSuggestion {
  title: string;
  thumbnail_text: string;
  score: number;
  reasoning: string;
  patterns_used: string[];
  style_reference: string;
  references: string[];
}

export interface ChannelRef {
  channel_id: string;
  name: string;
  thumbnail?: string;
}

export interface Analysis {
  summary: string;
  guest: string;
  guest_name: string;
  keywords: string[];
  search_queries: string[];
  key_points: string[];
  notable_quotes: string[];
}

interface ProjectState {
  projectId: string | null;
  projectName: string;
  transcript: string | null;
  analysis: Analysis | null;
  similarVideos: VideoResult[];
  searchKeywords: string;
  selectedRefVideoIds: Set<string>;
  titles: TitleSuggestion[];
  videoType: string | null;
  videoThumbnail: string | null;
  videoFrames: string[];
  selectedFrame: number;
  refChannels: ChannelRef[];
  titleStyle: string;
  extraRequest: string;
  evalResult: string | null;
  inputType: string | null;
  inputName: string | null;

  setProjectId: (id: string) => void;
  setProjectName: (name: string) => void;
  setTranscript: (t: string, type: string) => void;
  setAnalysis: (a: Analysis) => void;
  setSimilarVideos: (v: VideoResult[]) => void;
  setSearchKeywords: (k: string) => void;
  toggleRefVideo: (id: string) => void;
  setTitles: (t: TitleSuggestion[]) => void;
  setVideoFrames: (f: string[]) => void;
  setSelectedFrame: (i: number) => void;
  addRefChannel: (c: ChannelRef) => void;
  removeRefChannel: (id: string) => void;
  setTitleStyle: (s: string) => void;
  setExtraRequest: (r: string) => void;
  setEvalResult: (r: string) => void;
  loadProject: (data: Record<string, unknown>) => void;
  reset: () => void;
}

const initialState = {
  projectId: null as string | null,
  projectName: "새 프로젝트",
  transcript: null as string | null,
  analysis: null as Analysis | null,
  similarVideos: [] as VideoResult[],
  searchKeywords: "",
  selectedRefVideoIds: new Set<string>(),
  titles: [] as TitleSuggestion[],
  videoType: null as string | null,
  videoThumbnail: null as string | null,
  videoFrames: [] as string[],
  selectedFrame: 0,
  refChannels: [] as ChannelRef[],
  titleStyle: "자동 (AI가 최적 스타일 선택)",
  extraRequest: "",
  evalResult: null as string | null,
  inputType: null as string | null,
  inputName: null as string | null,
};

export const useProjectStore = create<ProjectState>((set) => ({
  ...initialState,

  setProjectId: (id) => set({ projectId: id }),
  setProjectName: (name) => set({ projectName: name }),
  setTranscript: (t, type) => set({ transcript: t, videoType: type }),
  setAnalysis: (a) => set({ analysis: a }),
  setSimilarVideos: (v) => set({ similarVideos: v }),
  setSearchKeywords: (k) => set({ searchKeywords: k }),
  toggleRefVideo: (id) =>
    set((state) => {
      const next = new Set(state.selectedRefVideoIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedRefVideoIds: next };
    }),
  setTitles: (t) => set({ titles: t }),
  setVideoFrames: (f) => set({ videoFrames: f, selectedFrame: 0 }),
  setSelectedFrame: (i) => set({ selectedFrame: i }),
  addRefChannel: (c) =>
    set((state) => ({
      refChannels: [...state.refChannels.filter((rc) => rc.channel_id !== c.channel_id), c],
    })),
  removeRefChannel: (id) =>
    set((state) => ({
      refChannels: state.refChannels.filter((rc) => rc.channel_id !== id),
    })),
  setTitleStyle: (s) => set({ titleStyle: s }),
  setExtraRequest: (r) => set({ extraRequest: r }),
  setEvalResult: (r) => set({ evalResult: r }),
  loadProject: (data) =>
    set({
      projectId: (data.project_id as string) || null,
      projectName: (data.name as string) || "제목 없음",
      transcript: (data.transcript as string) || null,
      analysis: (data.analysis as Analysis) || null,
      similarVideos: (data.similar_videos as VideoResult[]) || [],
      searchKeywords: (data.search_keywords as string) || "",
      selectedRefVideoIds: new Set<string>(),
      titles: (data.titles as TitleSuggestion[]) || [],
      videoType: (data.video_type as string) || null,
      videoThumbnail: (data.video_thumbnail as string) || null,
      videoFrames: [],
      selectedFrame: 0,
      refChannels: (data.ref_channels as ChannelRef[]) || [],
      titleStyle: "자동 (AI가 최적 스타일 선택)",
      extraRequest: "",
      evalResult: null,
      inputType: (data.input_type as string) || null,
      inputName: (data.input_name as string) || null,
    }),
  reset: () => set(initialState),
}));
