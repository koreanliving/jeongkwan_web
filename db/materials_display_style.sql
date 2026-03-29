-- 학습 자료 표시 스타일
-- 'standard' : 기존 방식 (텍스트/PDF)
-- 'reading'  : 읽기 연습 (원문↔해설 툴팁)
alter table public.materials
  add column if not exists display_style text not null default 'standard';

comment on column public.materials.display_style is
  '''standard'' = 기본 스타일, ''reading'' = 읽기 연습(원문/해설 파싱)';
