/** 관리자 응답 이후 학생/학부모가 아직 확인하지 않은 경우 */
export function hasUnreadAdminReply(row: {
	admin_last_response_at: string | null;
	requester_read_at: string | null;
}): boolean {
	if (!row.admin_last_response_at) return false;
	if (!row.requester_read_at) return true;
	return Date.parse(row.requester_read_at) < Date.parse(row.admin_last_response_at);
}
