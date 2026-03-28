-- 학습 자료 열람 기록 (학생별로 상세 페이지를 연 자료만 기록)
-- Supabase SQL Editor에서 실행한 뒤 사용하세요.

create table if not exists public.student_material_views (
  student_id uuid not null references public.profiles (id) on delete cascade,
  material_id integer not null references public.materials (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (student_id, material_id)
);

create index if not exists idx_student_material_views_student on public.student_material_views (student_id);
create index if not exists idx_student_material_views_material on public.student_material_views (material_id);

comment on table public.student_material_views is '학생이 자료 상세 페이지를 연 시각(최초/최종 upsert)';
