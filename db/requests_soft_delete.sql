alter table if exists public.student_requests
add column if not exists is_deleted boolean not null default false;

create index if not exists idx_student_requests_is_deleted on public.student_requests(is_deleted);
