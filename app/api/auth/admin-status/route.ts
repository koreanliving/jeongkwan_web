import { NextRequest, NextResponse } from "next/server";
import { ADMIN_UI_COOKIE_NAME, clearAdminAuthCookies, isAdminRequest } from "@/utils/server/adminSession";

export async function GET(request: NextRequest) {
	const isAdmin = await isAdminRequest(request);
	const response = NextResponse.json({ isAdmin });

	if (!isAdmin && request.cookies.get(ADMIN_UI_COOKIE_NAME)?.value) {
		clearAdminAuthCookies(response);
	}

	return response;
}
