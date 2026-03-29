-- 1. 직원 테이블
create table workers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null check (role in ('촬영PD', '편집자')),
  contract_type text not null check (contract_type in ('프리랜서', '사업자')),
  created_at timestamptz default now()
);

-- 2. 정산서 테이블
create table settlements (
  id uuid default gen_random_uuid() primary key,
  worker_id uuid references workers(id) not null,
  worker_name text not null,
  role text not null,
  contract_type text not null,
  settlement_month date not null,
  total_amount integer not null default 0,
  total_expense integer not null default 0,
  tax integer not null default 0,
  final_amount integer not null default 0,
  status text not null default '제출됨',
  created_at timestamptz default now()
);

-- 3. 정산서 항목 테이블 (촬영PD + 편집자 공용)
create table settlement_items (
  id uuid default gen_random_uuid() primary key,
  settlement_id uuid references settlements(id) not null,
  performer text not null,
  -- 촬영PD 전용
  "youtubeChannel" text,
  "filmingDate" text,
  expense integer default 0,
  "receiptUrls" jsonb default '[]',
  -- 편집자 전용
  "videoLink" text,
  "videoDuration" integer,
  -- 공용
  amount integer not null default 0,
  created_at timestamptz default now()
);

-- 4. RLS(Row Level Security) 비활성화 (내부용이므로)
alter table workers enable row level security;
alter table settlements enable row level security;
alter table settlement_items enable row level security;

-- 모든 테이블에 anon 읽기/쓰기 허용
create policy "Allow all on workers" on workers for all using (true) with check (true);
create policy "Allow all on settlements" on settlements for all using (true) with check (true);
create policy "Allow all on settlement_items" on settlement_items for all using (true) with check (true);
