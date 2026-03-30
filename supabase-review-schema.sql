-- 영상 리뷰 시스템 테이블

-- 프로젝트 (출연자 단위)
CREATE TABLE review_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 영상 버전
CREATE TABLE review_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES review_projects(id) ON DELETE CASCADE NOT NULL,
  version INT NOT NULL DEFAULT 1,
  title TEXT,
  description TEXT,
  file_key TEXT NOT NULL,
  file_size BIGINT,
  duration REAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 타임코드 코멘트
CREATE TABLE review_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES review_videos(id) ON DELETE CASCADE NOT NULL,
  author_name TEXT NOT NULL DEFAULT '익명',
  timecode REAL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_review_videos_project ON review_videos(project_id);
CREATE INDEX idx_review_comments_video ON review_comments(video_id);

-- RLS
ALTER TABLE review_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_projects_all" ON review_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "review_videos_all" ON review_videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "review_comments_all" ON review_comments FOR ALL USING (true) WITH CHECK (true);
