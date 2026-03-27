import { NextRequest, NextResponse } from "next/server";
import { studentEmailFromUsername } from "@/utils/studentAuthEmail";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { createSupabaseAuthWithCookieCapture } from "@/utils/server/supabaseAuthCookies";

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as { studentId?: string; password?: string };
		const username = (body.studentId ?? "").trim();
		const password = (body.password ?? "").trim();

		if (!username || !password) {
			return NextResponse.json({ message: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
		}

		const { supabase, applyCookies } = createSupabaseAuthWithCookieCapture(request);

		const { data, error } = await supabase.auth.signInWithPassword({
			email: studentEmailFromUsername(username),
			password,
		});

		if (error || !data.user) {
			const res = NextResponse.json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
			applyCookies(res);
			return res;
		}

		const { data: profile, error: profileError } = await supabaseAdmin
			.from("profiles")
			.select("is_approved")
			.eq("id", data.user.id)
			.maybeSingle();

		if (profileError || !profile) {
			await supabase.auth.signOut();
			const res = NextResponse.json({ message: "프로필 정보를 찾을 수 없습니다. 관리자에게 문의해 주세요." }, { status: 403 });
			applyCookies(res);
			return res;
		}

		if (!profile.is_approved) {
			await supabase.auth.signOut();
			const res = NextResponse.json(
				{ message: "가입 승인 대기 중입니다. 승인 후 로그인할 수 있습니다." },
				{ status: 403 },
			);
			applyCookies(res);
			return res;
		}

		const ok = NextResponse.json({ ok: true });
		applyCookies(ok);
		return ok;
	} catch {
		return NextResponse.json({ message: "요청 처리 중 오류가 발생했습니다." }, { status: 400 });
	}
}
