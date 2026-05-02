import { NextRequest, NextResponse } from "next/server";
import { ADMIN_AUTH_COOKIE_NAME, isAdminSessionCookieValueValid } from "@/utils/server/adminSession";
import { PARENT_AUTH_COOKIE_NAME, PARENT_ID_COOKIE_NAME } from "@/utils/server/parentAuthConstants";
import { isValidUuid } from "@/utils/uuidValidation";

/**
 * `config.matcher`에 있는 경로에만 적용됩니다.
 * 로그인·가입 화면(/login, /parent-login, /auth/signup, /auth/parent-signup 등)은 matcher에 넣지 않아 누구나 접근 가능합니다.
 */

const STUDENT_AUTH_COOKIE_NAME = "student_auth";

function isParentAppPath(pathname: string): boolean {
	return pathname === "/parent" || pathname.startsWith("/parent/");
}

export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const studentCookie = request.cookies.get(STUDENT_AUTH_COOKIE_NAME)?.value;
	const isStudentAuthenticated = Boolean(studentCookie && studentCookie.length > 0);
	const isAdminAuthenticated = await isAdminSessionCookieValueValid(
		request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value,
	);

	// 공개 랜딩(루트는 `/welcome`으로 리다이렉트하는 정적 페이지)
	if (pathname === "/") {
		return NextResponse.next();
	}

	if (pathname.startsWith("/api/admin/")) {
		if (!isAdminAuthenticated) {
			return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
		}
		return NextResponse.next();
	}

	if (pathname.startsWith("/admin")) {
		if (!isAdminAuthenticated) {
			const adminLoginUrl = new URL("/admin-login", request.url);
			return NextResponse.redirect(adminLoginUrl);
		}

		return NextResponse.next();
	}

	// 학부모 전용 페이지: /parent, /parent/... (/parent-login 은 경로가 달라 여기에 걸리지 않음)
	if (isParentAppPath(pathname)) {
		const parentAuth = request.cookies.get(PARENT_AUTH_COOKIE_NAME)?.value === "true";
		const parentId = request.cookies.get(PARENT_ID_COOKIE_NAME)?.value?.trim() ?? "";
		if (!parentAuth || !isValidUuid(parentId)) {
			const parentLoginUrl = new URL("/parent-login", request.url);
			return NextResponse.redirect(parentLoginUrl);
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
	matcher: [
		"/",
		"/student",
		"/student/:path*",
		"/video/:path*",
		"/material/:path*",
		"/request/:path*",
		"/mypage",
		"/mypage/:path*",
		"/parent",
		"/parent/:path*",
		"/admin/:path*",
		"/api/admin/:path*",
	],
};
