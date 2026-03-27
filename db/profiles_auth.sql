-- Supabase Auth + public.profiles
-- 기존 students(bigint) 연동 데이터가 있으면 백업 후, 아래 TRUNCATE 전에 마이그레이션하세요.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  name text not null,
  academy text not null default '-',
  phone text not null default '-',
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_username on public.profiles (username);
create index if not exists idx_profiles_is_approved on public.profiles (is_approved);

-- child 테이블을 profiles(id) uuid 로 연결 (기존 student_id 가 bigint 인 경우)
alter table if exists public.exam_records drop constraint if exists exam_records_student_id_fkey;
alter table if exists public.memos drop constraint if exists memos_student_id_fkey;
alter table if exists public.student_requests drop constraint if exists student_requests_student_id_fkey;

truncate table public.exam_records restart identity;
truncate table public.memos restart identity;
truncate table public.student_requests restart identity;

alter table if exists public.exam_records drop column if exists student_id;
alter table if exists public.exam_records
  add column student_id uuid not null references public.profiles (id) on delete cascade;

alter table if exists public.memos drop column if exists student_id;
alter table if exists public.memos
  add column student_id uuid not null references public.profiles (id) on delete cascade;

alter table if exists public.student_requests drop column if exists student_id;
alter table if exists public.student_requests
  add column student_id uuid not null references public.profiles (id) on delete cascade;

create index if not exists idx_exam_records_student_id on public.exam_records (student_id);
create index if not exists idx_memos_student_id on public.memos (student_id);
create index if not exists idx_student_requests_student on public.student_requests (student_id);
