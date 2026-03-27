-- exam_records / memos / student_requests 의 student_id 를 bigint → uuid(profiles.id) 로 맞춥니다.
-- 앱 오류: invalid input syntax for type bigint: "<uuid>"
--
-- 전제: public.profiles 테이블이 이미 있어야 합니다.
-- 주의: 아래 테이블들을 TRUNCATE 합니다. 기존 성적·메모·학생요청 행을 보존해야 하면 실행 전 백업하세요.
--
-- Supabase → SQL Editor 에서 한 번 실행합니다.

-- exam_records
DO $$
BEGIN
	IF to_regclass('public.exam_records') IS NULL THEN
		RAISE NOTICE 'exam_records: 테이블 없음, 건너뜀';
	ELSIF EXISTS (
		SELECT 1
		FROM information_schema.columns c
		WHERE c.table_schema = 'public'
			AND c.table_name = 'exam_records'
			AND c.column_name = 'student_id'
			AND c.data_type IN ('bigint', 'integer', 'smallint')
	) THEN
		ALTER TABLE public.exam_records DROP CONSTRAINT IF EXISTS exam_records_student_id_fkey;
		TRUNCATE TABLE public.exam_records RESTART IDENTITY;
		ALTER TABLE public.exam_records DROP COLUMN student_id;
		ALTER TABLE public.exam_records
			ADD COLUMN student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE;
		CREATE INDEX IF NOT EXISTS idx_exam_records_student_id ON public.exam_records (student_id);
		RAISE NOTICE 'exam_records.student_id → uuid 완료';
	ELSE
		RAISE NOTICE 'exam_records.student_id: 이미 정수형이 아님, 건너뜀';
	END IF;
END $$;

-- memos
DO $$
BEGIN
	IF to_regclass('public.memos') IS NULL THEN
		RAISE NOTICE 'memos: 테이블 없음, 건너뜀';
	ELSIF EXISTS (
		SELECT 1
		FROM information_schema.columns c
		WHERE c.table_schema = 'public'
			AND c.table_name = 'memos'
			AND c.column_name = 'student_id'
			AND c.data_type IN ('bigint', 'integer', 'smallint')
	) THEN
		ALTER TABLE public.memos DROP CONSTRAINT IF EXISTS memos_student_id_fkey;
		TRUNCATE TABLE public.memos RESTART IDENTITY;
		ALTER TABLE public.memos DROP COLUMN student_id;
		ALTER TABLE public.memos
			ADD COLUMN student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE;
		CREATE INDEX IF NOT EXISTS idx_memos_student_id ON public.memos (student_id);
		RAISE NOTICE 'memos.student_id → uuid 완료';
	ELSE
		RAISE NOTICE 'memos.student_id: 이미 정수형이 아님, 건너뜀';
	END IF;
END $$;

-- student_requests (학생 요청 등록도 동일한 uuid 를 씁니다)
DO $$
BEGIN
	IF to_regclass('public.student_requests') IS NULL THEN
		RAISE NOTICE 'student_requests: 테이블 없음, 건너뜀';
	ELSIF EXISTS (
		SELECT 1
		FROM information_schema.columns c
		WHERE c.table_schema = 'public'
			AND c.table_name = 'student_requests'
			AND c.column_name = 'student_id'
			AND c.data_type IN ('bigint', 'integer', 'smallint')
	) THEN
		ALTER TABLE public.student_requests DROP CONSTRAINT IF EXISTS student_requests_student_id_fkey;
		TRUNCATE TABLE public.student_requests RESTART IDENTITY;
		ALTER TABLE public.student_requests DROP COLUMN student_id;
		ALTER TABLE public.student_requests
			ADD COLUMN student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE;
		CREATE INDEX IF NOT EXISTS idx_student_requests_student ON public.student_requests (student_id);
		RAISE NOTICE 'student_requests.student_id → uuid 완료';
	ELSE
		RAISE NOTICE 'student_requests.student_id: 이미 정수형이 아님, 건너뜀';
	END IF;
END $$;
