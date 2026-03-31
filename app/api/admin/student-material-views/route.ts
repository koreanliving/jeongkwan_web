import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { isValidUuid } from "@/utils/uuidValidation";

export type MaterialViewRow = {
	id: number;
	title: string;
	category: string;
	created_at: string;
	viewed: boolean;
	viewed_at: string | null;
};

export async function GET(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const studentId = searchParams.get("studentId") ?? "";

	if (!isValidUuid(studentId)) {
		return NextResponse.json({ message: "학생 ID가 올바르지 않습니다." }, { status: 400 });
	}

	const [materialsResult, viewsResult] = await Promise.all([
		supabaseAdmin
			.from("materials")
			.select("id, title, category, created_at")
			.order("created_at", { ascending: false }),
		supabaseAdmin
			.from("student_material_views")
			.select("material_id, viewed_at")
			.eq("student_id", studentId),
	]);

	if (materialsResult.error) {
		return NextResponse.json({ message: "자료 목록을 불러오지 못했습니다." }, { status: 500 });
	}

	if (viewsResult.error) {
		return NextResponse.json({ message: "열람 기록을 불러오지 못했습니다." }, { status: 500 });
	}

	const viewMap = new Map<number, string>(
		(viewsResult.data ?? []).map((r) => [
			Number((r as { material_id: number; viewed_at: string }).material_id),
			(r as { material_id: number; viewed_at: string }).viewed_at,
		]),
	);

	const items: MaterialViewRow[] = (
		materialsResult.data as { id: number; title: string; category: string; created_at: string }[]
	).map((m) => ({
		id: m.id,
		title: m.title,
		category: m.category,
		created_at: m.created_at,
		viewed: viewMap.has(m.id),
		viewed_at: viewMap.get(m.id) ?? null,
	}));

	return NextResponse.json({ items });
}
