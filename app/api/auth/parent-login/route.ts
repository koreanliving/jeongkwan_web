import { NextRequest, NextResponse } from "next/server";
import { normalizeParentUsername } from "@/utils/parentAuthEmail";
import {
	PARENT_AUTH_COOKIE_NAME,
	PARENT_ID_COOKIE_NAME,
	parentGateCookieOptions,
} from "@/utils/server/parentAuthConstants";
import { verifyParentPassword } from "@/utils/server/parentPassword";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as { username?: string; password?: string };
		const username = normalizeParentUsername(body.username ?? "");
		const password = (body.password ?? "").trim();

		if (!username || !password) {
			return NextResponse.json({ message: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
		}

		const { data: row, error } = await supabaseAdmin
			.from("parent_profiles")
			.select("id, password_hash, is_approved")
			.eq("username", username)
			.maybeSingle();

		if (error) {
			console.error("[api/auth/parent-login]", error.message);
			return NextResponse.json(
				{ message: "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
				{ status: 500 },
			);
		}

		const invalidCreds = NextResponse.json(
			{ message: "아이디 또는 비밀번호가 올바르지 않습니다." },
			{ status: 401 },
		);

		if (!row) {
			return invalidCreds;
		}

		if (!row.is_approved) {
			return NextResponse.json(
				{ message: "가입 승인 대기 중입니다. 승인 후 로그인할 수 있습니다." },
				{ status: 403 },
			);
		}

		const hash = String(row.password_hash ?? "");
		const ok = await verifyParentPassword(password, hash);
		if (!ok) {
			return invalidCreds;
		}

		const res = NextResponse.json({ ok: true });
		res.cookies.set(PARENT_AUTH_COOKIE_NAME, "true", parentGateCookieOptions);
		res.cookies.set(PARENT_ID_COOKIE_NAME, row.id as string, parentGateCookieOptions);
		return res;
	} catch (e) {
		const msg = e instanceof Error ? e.message : "";
		if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
			return NextResponse.json(
				{
					message:
						"서버에 Supabase 설정이 없습니다. 배포 환경 변수에 SUPABASE_SERVICE_ROLE_KEY와 NEXT_PUBLIC_SUPABASE_URL을 등록했는지 확인해 주세요.",
				},
				{ status: 503 },
			);
		}
		console.error("[api/auth/parent-login]", e);
		return NextResponse.json({ message: "요청 처리 중 오류가 발생했습니다." }, { status: 400 });
	}
}
