-- workers 테이블에 새 컬럼 추가
alter table workers add column if not exists phone text unique;
alter table workers add column if not exists pin text; -- bcrypt 해시
alter table workers add column if not exists bank_name text;
alter table workers add column if not exists bank_account text;
alter table workers add column if not exists account_holder text;
alter table workers add column if not exists business_registration_url text; -- 사업자등록증 이미지
alter table workers add column if not exists approved boolean default false; -- 관리자 승인 여부
