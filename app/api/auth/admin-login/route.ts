import { NextResponse } from "next/server";
import {
	ADMIN_AUTH_COOKIE_NAME,
	ADMIN_UI_COOKIE_NAME,
	adminCookieOptions,
	adminUiCookieOptions,
	createAdminSessionCookieValue,
	getConfiguredAdminPassword,
} from "@/utils/server/adminSession";

const STUDENT_COOKIE_NAME = "student_auth";

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as { password?: string };
		const password = body.password ?? "";
		const adminPassword = getConfiguredAdminPassword();

		if (!adminPassword) {
			return NextResponse.json(
				{ message: "관리자 비밀번호가 서버에 설정되지 않았습니다." },
				{ status: 503 },
			);
		}

		if (password !== adminPassword) {
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

		response.cookies.set(
			ADMIN_AUTH_COOKIE_NAME,
			await createAdminSessionCookieValue(),
			adminCookieOptions,
		);
		response.cookies.set(ADMIN_UI_COOKIE_NAME, "true", adminUiCookieOptions);

		return response;
	} catch {
		return NextResponse.json({ message: "요청 처리 중 오류가 발생했습니다." }, { status: 400 });
	}
}
