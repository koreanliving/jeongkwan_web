import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

function getUrlAndAnonKey() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) {
		throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.");
	}
	return { url, key };
}

/** Route Handler: 요청 쿠키만으로 세션 읽기 (set 쿠키 무시) */
export function createSupabaseAuthReader(request: NextRequest) {
	const { url, key } = getUrlAndAnonKey();
	return createServerClient(url, key, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll() {
				/* 읽기 전용 */
			},
		},
	});
}

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** 로그인 등: Auth가 설정하는 쿠키를 배열에 모아 응답에 한 번에 적용 */
export function createSupabaseAuthWithCookieCapture(request: NextRequest) {
	const { url, key } = getUrlAndAnonKey();
	const captured: CookieToSet[] = [];
	const supabase = createServerClient(url, key, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				captured.push(...cookiesToSet);
			},
		},
	});

	const applyCookies = (response: NextResponse) => {
		captured.forEach(({ name, value, options }) => {
			response.cookies.set(name, value, options);
		});
	};

	return { supabase, applyCookies };
}
