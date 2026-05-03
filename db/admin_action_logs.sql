-- 관리자 작업 감사 로그 (service role 클라이언트에서만 삽입·조회)
-- Supabase SQL Editor에서 실행한 뒤 사용하세요.

create table if not exists public.admin_action_logs (
  id bigint generated always as identity primary key,
  action text not null,
  detail jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_action_logs_created_at_desc on public.admin_action_logs (created_at desc);

comment on table public.admin_action_logs is '관리자 도구에서 수행한 변경 작업 기록(비밀번호·답변 전문 미저장)';

alter table public.admin_action_logs enable row level security;

-- anon/authenticated 직접 접근 없음. 서비스 역할 키는 RLS를 우회합니다.
