import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

const STUDENT_COOKIE_NAME = "student_auth";

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { studentId?: string; password?: string };
		const studentId = (body.studentId ?? "").trim();
		const password = (body.password ?? "").trim();

		if (!studentId || !password) {
			return NextResponse.json({ message: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
		}


		const { data: student, error: studentError } = await supabaseAdmin
			.from("students")
			.select("id, password, is_active")
			.eq("student_id", studentId)
			.maybeSingle();

		if (studentError || !student || !student.is_active) {
			// 가입 신청 대기중인지 확인
			const { data: signup, error: signupError } = await supabaseAdmin
				.from("signup_requests")
				.select("status")
				.eq("student_id", studentId)
				.order("created_at", { ascending: false })
				.maybeSingle();
			if (!signupError && signup && signup.status === "대기") {
				return NextResponse.json({ message: "가입 신청이 승인 대기중입니다. 승인 후 로그인 가능합니다." }, { status: 403 });
			}
			return NextResponse.json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
		}
		if (student.password !== password) {
			return NextResponse.json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
		}

		const sessionToken = randomUUID();
		const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

		const { error: sessionError } = await supabaseAdmin.from("student_sessions").insert({
			session_token: sessionToken,
			student_id: student.id,
			expires_at: expiresAt,
		});

		if (sessionError) {
			return NextResponse.json({ message: "로그인 세션 생성에 실패했습니다." }, { status: 500 });
		}

		const response = NextResponse.json({ ok: true });
		response.cookies.set(STUDENT_COOKIE_NAME, sessionToken, {
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
			sameSite: "lax",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
		});

		return response;
	} catch {
		return NextResponse.json({ message: "요청 처리 중 오류가 발생했습니다." }, { status: 400 });
	}
}
