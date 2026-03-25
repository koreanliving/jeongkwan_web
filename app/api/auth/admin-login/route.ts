import { NextResponse } from "next/server";

const STUDENT_COOKIE_NAME = "student_auth";
const ADMIN_COOKIE_NAME = "admin_auth";
const ADMIN_UI_COOKIE_NAME = "admin_ui";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "change-admin-password";

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { password?: string };
		const password = body.password ?? "";

		if (password !== ADMIN_PASSWORD) {
			return NextResponse.json({ message: "관리자 코드가 올바르지 않습니다." }, { status: 401 });
		}

		const response = NextResponse.json({ ok: true });

		response.cookies.set(STUDENT_COOKIE_NAME, "true", {
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
			sameSite: "lax",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
		});

		response.cookies.set(ADMIN_COOKIE_NAME, "true", {
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
			sameSite: "lax",
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
		});

		response.cookies.set(ADMIN_UI_COOKIE_NAME, "true", {
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
			sameSite: "lax",
			httpOnly: false,
			secure: process.env.NODE_ENV === "production",
		});

		return response;
	} catch {
		return NextResponse.json({ message: "요청 처리 중 오류가 발생했습니다." }, { status: 400 });
	}
}
