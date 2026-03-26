-- 기존 signup_requests 테이블에 누락 컬럼 보강
ALTER TABLE public.signup_requests ADD COLUMN IF NOT EXISTS student_id text;
ALTER TABLE public.signup_requests ADD COLUMN IF NOT EXISTS password text;
