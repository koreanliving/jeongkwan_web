-- exam_records: 시험 종류·응시일·사설 상세명
-- Supabase SQL Editor 에서 실행하세요. (기존 행은 응시일 없음 → created_at 날짜로 채움)

alter table public.exam_records add column if not exists exam_kind text;
alter table public.exam_records add column if not exists exam_detail text;
alter table public.exam_records add column if not exists exam_date date;

-- 기존 데이터: 종류 미정 → 사설/기타, 상세명은 기존 exam_name, 응시일은 등록일(날짜)
update public.exam_records
set
	exam_kind = coalesce(nullif(trim(exam_kind), ''), '사설/기타'),
	exam_detail = case
		when nullif(trim(coalesce(exam_detail, '')), '') is not null then trim(exam_detail)
		when nullif(trim(coalesce(exam_name, '')), '') is not null then trim(exam_name)
		else null
	end,
	exam_date = coalesce(exam_date, (created_at at time zone 'UTC')::date)
where exam_kind is null
	or exam_date is null
	or trim(coalesce(exam_kind, '')) = '';

-- 사설/기타인데 상세가 비어 있으면 exam_name 또는 플레이스홀더
update public.exam_records
set exam_detail = coalesce(nullif(trim(exam_detail), ''), nullif(trim(exam_name), ''), '사설/기타')
where trim(coalesce(exam_kind, '')) = '사설/기타'
	and nullif(trim(coalesce(exam_detail, '')), '') is null;

alter table public.exam_records alter column exam_kind set not null;
alter table public.exam_records alter column exam_date set not null;

create index if not exists idx_exam_records_student_exam_date on public.exam_records (student_id, exam_date desc);
