-- 비밀번호 컬럼 추가 (nullable, 승인 시 students 테이블로 복사)
ALTER TABLE public.signup_requests ADD COLUMN IF NOT EXISTS password text;
