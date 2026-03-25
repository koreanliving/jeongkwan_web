import { NextRequest, NextResponse } from "next/server";

const STUDENT_AUTH_COOKIE_NAME = "student_auth";
const ADMIN_AUTH_COOKIE_NAME = "admin_auth";

export function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const isStudentAuthenticated = request.cookies.get(STUDENT_AUTH_COOKIE_NAME)?.value === "true";
	const isAdminAuthenticated = request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value === "true";

	if (pathname.startsWith("/admin")) {
		if (!isAdminAuthenticated) {
			const adminLoginUrl = new URL("/admin-login", request.url);
			return NextResponse.redirect(adminLoginUrl);
		}

		return NextResponse.next();
	}

	if (!isStudentAuthenticated) {
		const loginUrl = new URL("/login", request.url);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/video/:path*", "/material/:path*", "/admin/:path*"],
};
