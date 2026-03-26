alter table if exists public.home_settings
add column if not exists show_post_dates boolean not null default true;

update public.home_settings
set show_post_dates = true
where show_post_dates is null;
