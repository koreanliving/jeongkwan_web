import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "student_auth";

export function middleware(request: NextRequest) {
	const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
	const isAuthenticated = authCookie === "true";

	if (!isAuthenticated) {
		const loginUrl = new URL("/login", request.url);
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/", "/video", "/material", "/admin"],
};
