import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

const STUDENT_AUTH_COOKIE_NAME = "student_auth";

const studentGateCookieOptions = {
	path: "/" as const,
	maxAge: 60 * 60 * 24 * 7,
	sameSite: "lax" as const,
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
};

function getSupabaseEnv() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) {
		throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.");
	}
	return { url, key };
}

/** Supabase 세션 쿠키와 student_auth 게이트 쿠키를 함께 제거합니다. */
export async function POST(request: NextRequest) {
	const res = NextResponse.json({ ok: true });
	const { url, key } = getSupabaseEnv();

	const supabase = createServerClient(url, key, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
				cookiesToSet.forEach(({ name, value, options }) => {
					res.cookies.set(name, value, options);
				});
			},
		},
	});

	await supabase.auth.signOut();
	res.cookies.set(STUDENT_AUTH_COOKIE_NAME, "", { ...studentGateCookieOptions, maxAge: 0 });
	return res;
}
