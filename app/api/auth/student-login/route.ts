import { NextResponse } from "next/server";

const STUDENT_COOKIE_NAME = "student_auth";
const STUDENT_PASSWORD = process.env.STUDENT_PASSWORD ?? "0000";

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { password?: string };
		const password = body.password ?? "";

		if (password !== STUDENT_PASSWORD) {
			return NextResponse.json({ message: "비밀번호가 올바르지 않습니다." }, { status: 401 });
		}

		const response = NextResponse.json({ ok: true });
		response.cookies.set(STUDENT_COOKIE_NAME, "true", {
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
