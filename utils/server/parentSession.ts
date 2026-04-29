import type { NextRequest, NextResponse } from "next/server";
import { isValidUuid } from "@/utils/uuidValidation";
import {
	PARENT_AUTH_COOKIE_NAME,
	PARENT_ID_COOKIE_NAME,
	parentGateCookieOptions,
} from "./parentAuthConstants";
import { supabaseAdmin } from "./supabaseAdmin";

export { PARENT_AUTH_COOKIE_NAME, PARENT_ID_COOKIE_NAME, parentGateCookieOptions };

export type ParentSession = {
	/** `parent_profiles.id` */
	id: string;
	username: string;
	name: string;
	/** 자녀 `profiles.id` */
	linkedStudentId: string;
};

/**
 * 승인된 학부모만 세션으로 인정합니다.
 * 쿠키 `parent_id`에 저장된 UUID와 `parent_profiles` 행이 일치해야 합니다.
 */
export async function getParentSession(request: NextRequest): Promise<ParentSession | null> {
	const raw = request.cookies.get(PARENT_ID_COOKIE_NAME)?.value ?? "";
	const id = raw.trim();
	if (!isValidUuid(id)) {
		return null;
	}

	const { data: row, error } = await supabaseAdmin
		.from("parent_profiles")
		.select("id, username, name, linked_student_id, is_approved")
		.eq("id", id)
		.maybeSingle();

	if (error || !row || !row.is_approved) {
		return null;
	}

	return {
		id: row.id as string,
		username: row.username as string,
		name: row.name as string,
		linkedStudentId: row.linked_student_id as string,
	};
}

/** 로그아웃·승인 취소 시 쿠키 제거 */
export function clearParentAuthCookies(response: NextResponse): void {
	response.cookies.set(PARENT_AUTH_COOKIE_NAME, "", { ...parentGateCookieOptions, maxAge: 0 });
	response.cookies.set(PARENT_ID_COOKIE_NAME, "", { ...parentGateCookieOptions, maxAge: 0 });
}
