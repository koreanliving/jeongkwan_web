import type { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";
import { createSupabaseAuthReader } from "./supabaseAuthCookies";

export type StudentSession = {
	/** `profiles.id` (= `auth.users.id`) */
	userId: string;
	username: string;
	name: string;
};

/**
 * 승인된 학생만 세션으로 인정합니다. (미승인 계정은 JWT가 있어도 null)
 */
export async function getStudentSession(request: NextRequest): Promise<StudentSession | null> {
	const supabase = createSupabaseAuthReader(request);
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return null;
	}

	const { data: profile, error: profileError } = await supabaseAdmin
		.from("profiles")
		.select("username, name, is_approved")
		.eq("id", user.id)
		.maybeSingle();

	if (profileError || !profile || !profile.is_approved) {
		return null;
	}

	return {
		userId: user.id,
		username: profile.username as string,
		name: profile.name as string,
	};
}

export function isAdminRequest(request: NextRequest): boolean {
	return request.cookies.get("admin_auth")?.value === "true";
}
