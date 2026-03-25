create table if not exists public.students (
  id bigserial primary key,
  student_id text not null unique,
  name text not null,
  password text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_sessions (
  id bigserial primary key,
  session_token text not null unique,
  student_id bigint not null references public.students(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.student_requests (
  id bigserial primary key,
  student_id bigint not null references public.students(id) on delete cascade,
  request_type text not null check (request_type in ('보강영상', '질문', '상담')),
  title text not null,
  content text not null,
  status text not null default '접수' check (status in ('접수', '처리중', '완료')),
  admin_reply text,
  support_video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_student_id on public.students(student_id);
create index if not exists idx_student_sessions_token on public.student_sessions(session_token);
create index if not exists idx_student_requests_student on public.student_requests(student_id);
create index if not exists idx_student_requests_created_at on public.student_requests(created_at desc);

alter table public.students enable row level security;
alter table public.student_sessions enable row level security;
alter table public.student_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='students' and policyname='Allow anon all students'
  ) then
    create policy "Allow anon all students"
    on public.students
    for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='student_sessions' and policyname='Allow anon all student_sessions'
  ) then
    create policy "Allow anon all student_sessions"
    on public.student_sessions
    for all
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='student_requests' and policyname='Allow anon all student_requests'
  ) then
    create policy "Allow anon all student_requests"
    on public.student_requests
    for all
    using (true)
    with check (true);
  end if;
end $$;
