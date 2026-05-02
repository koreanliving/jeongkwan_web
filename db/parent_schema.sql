-- 학부모 기능용 테이블 (Supabase SQL Editor에서 순서대로 실행)
-- 전제: public.profiles 가 이미 존재하고 student_id 는 profiles.id(uuid) 를 씁니다.
-- 앱은 Next.js API에서 SUPABASE_SERVICE_ROLE_KEY 로 접근합니다.

-- ---------------------------------------------------------------------------
-- 1) 학부모 가입 신청 (관리자 승인 전, 비밀번호는 bcrypt 해시로 보관)
-- ---------------------------------------------------------------------------
create table if not exists public.parent_signup_requests (
  id bigserial primary key,
  username text not null,
  password text not null,
  parent_name text not null,
  phone text not null,
  student_name text not null,
  academy text not null,
  status text not null default '대기'
    check (status in ('대기', '승인', '거절')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parent_signup_requests_username_format check (
    username ~ '^[a-zA-Z0-9_]{4,20}$'
  )
);

create unique index if not exists idx_parent_signup_requests_username_pending
  on public.parent_signup_requests (lower(username))
  where status = '대기';

create index if not exists idx_parent_signup_requests_status
  on public.parent_signup_requests (status);

create index if not exists idx_parent_signup_requests_created_at
  on public.parent_signup_requests (created_at desc);

comment on table public.parent_signup_requests is '학부모 회원가입 신청 (승인 시 parent_profiles 생성)';

-- ---------------------------------------------------------------------------
-- 2) 학부모 계정 (Supabase Auth 미사용, API에서 bcrypt 로 비밀번호 검증)
-- ---------------------------------------------------------------------------
create table if not exists public.parent_profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  name text not null,
  phone text not null default '-',
  linked_student_id uuid not null references public.profiles (id) on delete restrict,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_parent_profiles_linked_student
  on public.parent_profiles (linked_student_id);

create index if not exists idx_parent_profiles_is_approved
  on public.parent_profiles (is_approved);

comment on table public.parent_profiles is '승인된 학부모 계정; linked_student_id 로 자녀 성적 조회';
comment on column public.parent_profiles.password_hash is 'bcrypt 등 단방향 해시';

-- ---------------------------------------------------------------------------
-- 3) 수업반
-- ---------------------------------------------------------------------------
create table if not exists public.class_groups (
  id bigserial primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_class_groups_name
  on public.class_groups (name);

comment on table public.class_groups is '학생을 묶는 수업반';

-- ---------------------------------------------------------------------------
-- 4) 수업반 ↔ 학생 (N:N, 한 학생이 여러 반에 속할 수 있음)
-- ---------------------------------------------------------------------------
create table if not exists public.class_group_students (
  group_id bigint not null references public.class_groups (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, student_id)
);

create index if not exists idx_class_group_students_student
  on public.class_group_students (student_id);

-- ---------------------------------------------------------------------------
-- 5) 수업반 주간(또는 회차) 리포트 — 학부모는 자녀가 속한 반의 리포트만 조회
-- ---------------------------------------------------------------------------
create table if not exists public.class_reports (
  id bigserial primary key,
  group_id bigint not null references public.class_groups (id) on delete cascade,
  week_label text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_class_reports_group_created
  on public.class_reports (group_id, created_at desc);

comment on table public.class_reports is '반별 수업 전반 내용·특징 등 (week_label 예: 2026-04-W4, 4월 4주차)';
comment on column public.class_reports.week_label is '표시·정렬용 주차 라벨 (자유 형식)';

-- ---------------------------------------------------------------------------
-- 6) 학부모 1:1 요청 (질문·상담 등 — student_requests 와 유사)
-- ---------------------------------------------------------------------------
create table if not exists public.parent_requests (
  id bigserial primary key,
  parent_id uuid not null references public.parent_profiles (id) on delete cascade,
  request_type text not null check (request_type in ('보강영상', '질문', '상담')),
  title text not null,
  content text not null,
  status text not null default '접수' check (status in ('접수', '처리중', '완료')),
  admin_reply text,
  support_video_url text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_parent_requests_parent
  on public.parent_requests (parent_id);

create index if not exists idx_parent_requests_created_at
  on public.parent_requests (created_at desc);

create index if not exists idx_parent_requests_is_deleted
  on public.parent_requests (is_deleted);

comment on table public.parent_requests is '학부모용 질문/상담 요청';

-- ---------------------------------------------------------------------------
-- RLS (직접 Supabase 클라이언트 접근 차단, 서비스 롤은 정책 무시)
-- ---------------------------------------------------------------------------
alter table public.parent_signup_requests enable row level security;
alter table public.parent_profiles enable row level security;
alter table public.class_groups enable row level security;
alter table public.class_group_students enable row level security;
alter table public.class_reports enable row level security;
alter table public.parent_requests enable row level security;
