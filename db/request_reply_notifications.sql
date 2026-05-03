-- 문의 답변 알림(학생·학부모 읽음 시각 + 관리자 응답 시각)
-- Supabase SQL Editor에서 실행하세요.

alter table if exists public.student_requests
  add column if not exists admin_last_response_at timestamptz,
  add column if not exists requester_read_at timestamptz;

alter table if exists public.parent_requests
  add column if not exists admin_last_response_at timestamptz,
  add column if not exists requester_read_at timestamptz;

comment on column public.student_requests.admin_last_response_at is '관리자가 답변·상태·보강링크를 저장한 시각(학생 미읽음 판별)';
comment on column public.student_requests.requester_read_at is '학생이 답변을 확인한 시각';
comment on column public.parent_requests.admin_last_response_at is '관리자가 답변 등을 저장한 시각';
comment on column public.parent_requests.requester_read_at is '학부모가 답변을 확인한 시각';

-- 기존 데이터: 이미 답변이 있는 건은 이전에 읽은 것으로 간주(일괄 알림 방지)
update public.student_requests
set
  admin_last_response_at = coalesce(admin_last_response_at, updated_at),
  requester_read_at = coalesce(requester_read_at, updated_at)
where
  is_deleted = false
  and (
    (admin_reply is not null and length(trim(admin_reply)) > 0)
    or (support_video_url is not null and length(trim(support_video_url)) > 0)
    or status = '완료'
  );

update public.parent_requests
set
  admin_last_response_at = coalesce(admin_last_response_at, updated_at),
  requester_read_at = coalesce(requester_read_at, updated_at)
where
  is_deleted = false
  and (
    (admin_reply is not null and length(trim(admin_reply)) > 0)
    or (support_video_url is not null and length(trim(support_video_url)) > 0)
    or status = '완료'
  );
