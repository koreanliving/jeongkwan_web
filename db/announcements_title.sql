alter table if exists public.announcements
add column if not exists title text;

update public.announcements
set title = coalesce(nullif(title, ''), '공지')
where title is null or title = '';
