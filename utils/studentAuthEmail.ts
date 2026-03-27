/** 학생 로그인용 가짜 이메일 도메인 (NEXT_PUBLIC_ 로 클라이언트와 동일 값 유지) */
export function getStudentAuthEmailDomain(): string {
	return process.env.NEXT_PUBLIC_STUDENT_AUTH_EMAIL_DOMAIN?.trim() || "myapp.com";
}

/** username → Supabase Auth 이메일 */
export function studentEmailFromUsername(username: string): string {
	const u = username.trim().toLowerCase();
	const domain = getStudentAuthEmailDomain();
	return `${u}@${domain}`;
}
