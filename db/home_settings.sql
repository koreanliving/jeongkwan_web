create table if not exists public.home_settings (
  id bigint primary key,
  welcome_title text not null,
  welcome_subtitle text not null,
  updated_at timestamptz not null default now()
);

insert into public.home_settings (id, welcome_title, welcome_subtitle)
values (1, '강의실에 오신 것을 환영합니다!', '오늘도 즐거운 배움이 가득한 하루를 시작해 보세요.')
on conflict (id) do nothing;

alter table public.home_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'home_settings'
      and policyname = 'Allow read home_settings'
  ) then
    create policy "Allow read home_settings"
    on public.home_settings
    for select
    using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'home_settings'
      and policyname = 'Allow anon update home_settings'
  ) then
    create policy "Allow anon update home_settings"
    on public.home_settings
    for all
    using (true)
    with check (true);
  end if;
end $$;
