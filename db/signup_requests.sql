create table if not exists public.signup_requests (
  id bigserial primary key,
  student_id text,
  student_name text not null,
  academy text not null check (academy in ('서정학원', '다올105', '라파에듀', '입시왕')),
  phone text not null,
  grade text not null,
  recent_test text,
  recent_grade text,
  selected_subject text,
  status text not null default '대기' check (status in ('대기', '승인', '거절')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_signup_requests_status on public.signup_requests(status);
create index if not exists idx_signup_requests_created_at on public.signup_requests(created_at desc);

alter table public.signup_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='signup_requests' and policyname='Allow anon all signup_requests'
  ) then
    create policy "Allow anon all signup_requests"
    on public.signup_requests
    for all
    using (true)
    with check (true);
  end if;
end $$;
