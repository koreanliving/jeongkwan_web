import { NextRequest, NextResponse } from "next/server";
import { getParentSession } from "@/utils/server/parentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export async function GET(request: NextRequest) {
	const session = await getParentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	const { data: studentRow, error: studentError } = await supabaseAdmin
		.from("profiles")
		.select("id, username, name, academy, phone, signup_grade, target_university, target_department, is_approved")
		.eq("id", session.linkedStudentId)
		.maybeSingle();

	if (studentError || !studentRow) {
		return NextResponse.json({ message: "연결된 학생 정보를 찾을 수 없습니다. 관리자에게 문의해 주세요." }, { status: 404 });
	}

	return NextResponse.json({
		parent: {
			id: session.id,
			username: session.username,
			name: session.name,
		},
		student: {
			id: studentRow.id as string,
			username: studentRow.username as string,
			name: studentRow.name as string,
			academy: (studentRow.academy as string) || "-",
			phone: (studentRow.phone as string) || "-",
			grade: (studentRow.signup_grade as string | null) ?? null,
			targetUniversity: String(studentRow.target_university ?? "").trim(),
			targetDepartment: String(studentRow.target_department ?? "").trim(),
			isApproved: Boolean(studentRow.is_approved),
		},
	});
}
