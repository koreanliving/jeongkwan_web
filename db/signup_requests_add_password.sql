-- 레거시 보강: 기존 평문 비밀번호 기반 승인 흐름 호환용 컬럼입니다.
-- 신규 가입 신청은 더 이상 이 컬럼에 비밀번호를 저장하지 않습니다.
ALTER TABLE public.signup_requests ADD COLUMN IF NOT EXISTS student_id text;
ALTER TABLE public.signup_requests ADD COLUMN IF NOT EXISTS password text;
