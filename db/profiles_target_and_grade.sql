-- 목표대학·희망학과 및 가입 시 학년(프로필 보관)
alter table public.profiles add column if not exists signup_grade text;
alter table public.profiles add column if not exists target_university text;
alter table public.profiles add column if not exists target_department text;

comment on column public.profiles.signup_grade is '가입 승인 시 signup_requests.grade 스냅샷';
comment on column public.profiles.target_university is '학생이 마이페이지에서 입력하는 목표 대학';
comment on column public.profiles.target_department is '학생이 마이페이지에서 입력하는 희망 학과';

-- 기존 승인 회원: 가입 신청의 학년을 프로필에 채우기 (선택)
-- update public.profiles p
-- set signup_grade = s.grade
-- from public.signup_requests s
-- where s.student_id = p.username and s.status = '승인' and (p.signup_grade is null or p.signup_grade = '');
