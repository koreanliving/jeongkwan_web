/**
 * 학부모 계정은 Supabase Auth(이메일 로그인)를 쓰지 않습니다.
 * DB 조회·중복 검사 시 아이디를 동일 규칙으로 맞추기 위한 정규화만 둡니다.
 */
export function normalizeParentUsername(username: string): string {
	return username.trim().toLowerCase();
}
