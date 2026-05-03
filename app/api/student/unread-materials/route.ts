import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

const MAX_RETURN = 6;
const SCAN_LIMIT = 120;

export async function GET(request: NextRequest) {
	const session = await getStudentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	const [materialsResult, viewsResult] = await Promise.all([
		supabaseAdmin
			.from("materials")
			.select("id, title, category, created_at")
			.order("created_at", { ascending: false })
			.limit(SCAN_LIMIT),
		supabaseAdmin.from("student_material_views").select("material_id").eq("student_id", session.userId),
	]);

	if (materialsResult.error) {
		return NextResponse.json({ message: "자료 목록을 불러오지 못했습니다." }, { status: 500 });
	}

	if (viewsResult.error) {
		return NextResponse.json({ message: "열람 기록을 불러오지 못했습니다." }, { status: 500 });
	}

	const viewed = new Set((viewsResult.data ?? []).map((r) => Number((r as { material_id: number }).material_id)));
	const rows = (materialsResult.data ?? []) as {
		id: number;
		title: string;
		category: string;
		created_at: string;
	}[];

	const items = rows.filter((m) => !viewed.has(m.id)).slice(0, MAX_RETURN);

	return NextResponse.json({ items });
}
