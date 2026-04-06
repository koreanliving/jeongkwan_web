import { NextRequest, NextResponse } from "next/server";

const STUDENT_AUTH_COOKIE_NAME = "student_auth";
const ADMIN_AUTH_COOKIE_NAME = "admin_auth";

export function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const studentCookie = request.cookies.get(STUDENT_AUTH_COOKIE_NAME)?.value;
	const isStudentAuthenticated = Boolean(studentCookie && studentCookie.length > 0);
	const isAdminAuthenticated = request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value === "true";

	if (pathname.startsWith("/admin")) {
		if (!isAdminAuthenticated) {
			const adminLoginUrl = new URL("/admin-login", request.url);
			return NextResponse.redirect(adminLoginUrl);
		}

		return NextResponse.next();
	}

	// 학생 앱(홈·영상·자료·요청 등): 학생 게이트 쿠키 또는 관리자 로그인 중 하나면 통과.
	// 관리자만 admin_auth가 있는 경우(자료실 미리보기 등) student_auth 없이 /material 등에서 로그인 화면으로 보내지 않도록 합니다.
	if (!isStudentAuthenticated && !isAdminAuthenticated) {
		const loginUrl = new URL("/login", request.url);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/video/:path*", "/material/:path*", "/request/:path*", "/admin/:path*"],
};
