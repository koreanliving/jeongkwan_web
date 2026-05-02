import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export async function PATCH(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { showPostDates?: unknown };
		if (typeof body.showPostDates !== "boolean") {
			return NextResponse.json({ message: "날짜 표시 설정 값이 올바르지 않습니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin
			.from("home_settings")
			.update({ show_post_dates: body.showPostDates })
			.eq("id", 1);

		if (error) {
			return NextResponse.json({ message: error.message || "표시 설정 저장에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
