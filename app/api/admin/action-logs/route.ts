import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export type AdminActionLogRow = {
	id: number;
	action: string;
	detail: Record<string, unknown> | null;
	ip: string | null;
	user_agent: string | null;
	created_at: string;
};

export async function GET(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? "80");
	const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 80, 1), 200);

	const { data, error } = await supabaseAdmin
		.from("admin_action_logs")
		.select("id, action, detail, ip, user_agent, created_at")
		.order("created_at", { ascending: false })
		.limit(limit);

	if (error) {
		return NextResponse.json(
			{ message: "작업 로그를 불러오지 못했습니다.", detail: error.message },
			{ status: 500 },
		);
	}

	return NextResponse.json({ items: (data ?? []) as AdminActionLogRow[] });
}
