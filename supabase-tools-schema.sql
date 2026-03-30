-- 카드뉴스 프로젝트
CREATE TABLE card_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) NOT NULL,
  name TEXT NOT NULL DEFAULT '새 프로젝트',
  thumbnail_title TEXT DEFAULT '',
  cards JSONB DEFAULT '[]',
  thumb_data TEXT,
  card_count INT DEFAULT 10,
  video_key TEXT,
  video_name TEXT,
  frames JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_card_projects_worker ON card_projects(worker_id);

-- 유튜브 제목 프로젝트
CREATE TABLE title_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) NOT NULL,
  name TEXT NOT NULL DEFAULT '새 프로젝트',
  transcript TEXT,
  analysis JSONB,
  similar_videos JSONB DEFAULT '[]',
  titles JSONB DEFAULT '[]',
  video_type TEXT,
  video_thumbnail TEXT,
  video_frames JSONB DEFAULT '[]',
  search_keywords TEXT DEFAULT '',
  ref_channels JSONB DEFAULT '[]',
  input_type TEXT,
  input_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_title_projects_worker ON title_projects(worker_id);
