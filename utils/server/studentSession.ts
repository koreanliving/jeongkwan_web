import { NextRequest } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";

const STUDENT_AUTH_COOKIE_NAME = "student_auth";

export type StudentSession = {
	sessionId: number;
	studentDbId: number;
	studentId: string;
	studentName: string;
};

export async function getStudentSession(request: NextRequest): Promise<StudentSession | null> {
	const sessionToken = request.cookies.get(STUDENT_AUTH_COOKIE_NAME)?.value;
	if (!sessionToken || sessionToken === "true") {
		return null;
	}

	const { data: sessionRow, error: sessionError } = await supabaseAdmin
		.from("student_sessions")
		.select("id, student_id, expires_at")
		.eq("session_token", sessionToken)
		.maybeSingle();

	if (sessionError || !sessionRow) {
		return null;
	}

	const expiresAt = new Date(sessionRow.expires_at);
	if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
		await supabaseAdmin.from("student_sessions").delete().eq("id", sessionRow.id);
		return null;
	}

	const { data: studentRow, error: studentError } = await supabaseAdmin
		.from("students")
		.select("id, student_id, name, is_active")
		.eq("id", sessionRow.student_id)
		.maybeSingle();

	if (studentError || !studentRow || !studentRow.is_active) {
		return null;
	}

	return {
		sessionId: sessionRow.id as number,
		studentDbId: studentRow.id as number,
		studentId: studentRow.student_id as string,
		studentName: studentRow.name as string,
	};
}

export function isAdminRequest(request: NextRequest): boolean {
	return request.cookies.get("admin_auth")?.value === "true";
}
