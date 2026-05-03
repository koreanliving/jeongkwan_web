import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export async function GET(request: NextRequest) {
	const session = await getStudentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("profiles")
		.select("name, target_university, target_department, academy, signup_grade")
		.eq("id", session.userId)
		.maybeSingle();

	if (error || !data) {
		return NextResponse.json({ message: "프로필을 불러오지 못했습니다." }, { status: 500 });
	}

	return NextResponse.json({
		username: session.username,
		name: ((data.name as string | null) ?? "").trim(),
		targetUniversity: (data.target_university as string | null) ?? "",
		targetDepartment: (data.target_department as string | null) ?? "",
		academy: (data.academy as string) ?? "-",
		signupGrade: (data.signup_grade as string | null) ?? null,
	});
}

export async function PATCH(request: NextRequest) {
	const session = await getStudentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			targetUniversity?: string;
			targetDepartment?: string;
		};

		const target_university = (body.targetUniversity ?? "").trim() || null;
		const target_department = (body.targetDepartment ?? "").trim() || null;

		const { error } = await supabaseAdmin
			.from("profiles")
			.update({
				target_university,
				target_department,
				updated_at: new Date().toISOString(),
			})
			.eq("id", session.userId);

		if (error) {
			return NextResponse.json({ message: "저장에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
