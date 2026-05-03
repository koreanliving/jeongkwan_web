import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export type MaterialReadStatItem = {
	materialId: number;
	viewedStudentCount: number;
	unreadStudentCount: number;
	readRatePercent: number;
	lastViewedAt: string | null;
};

export type MaterialReadStatsResponse = {
	approvedStudentCount: number;
	items: MaterialReadStatItem[];
};

const MATERIAL_LIST_LIMIT = 100;
const VIEW_PAGE = 1000;

type ViewRow = { student_id: string; material_id: number; viewed_at: string };

async function fetchAllApprovedStudentIds(): Promise<{ ids: Set<string>; error: string | null }> {
	const ids = new Set<string>();
	let from = 0;
	for (;;) {
		const { data, error } = await supabaseAdmin
			.from("profiles")
			.select("id")
			.eq("is_approved", true)
			.order("id", { ascending: true })
			.range(from, from + VIEW_PAGE - 1);
		if (error) {
			return { ids: new Set(), error: error.message };
		}
		const rows = (data ?? []) as { id: string }[];
		for (const r of rows) {
			if (r.id) ids.add(r.id);
		}
		if (rows.length < VIEW_PAGE) break;
		from += VIEW_PAGE;
	}
	return { ids, error: null };
}

async function fetchAllMaterialViews(): Promise<{ rows: ViewRow[]; error: string | null }> {
	const rows: ViewRow[] = [];
	let from = 0;
	for (;;) {
		const { data, error } = await supabaseAdmin
			.from("student_material_views")
			.select("student_id, material_id, viewed_at")
			.order("material_id", { ascending: true })
			.range(from, from + VIEW_PAGE - 1);
		if (error) {
			return { rows: [], error: error.message };
		}
		const batch = (data ?? []) as ViewRow[];
		rows.push(...batch);
		if (batch.length < VIEW_PAGE) break;
		from += VIEW_PAGE;
	}
	return { rows, error: null };
}

export async function GET(_request: NextRequest) {
	if (!(await isAdminRequest(_request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const [approvedRes, viewsRes, materialsRes] = await Promise.all([
		fetchAllApprovedStudentIds(),
		fetchAllMaterialViews(),
		supabaseAdmin
			.from("materials")
			.select("id")
			.order("created_at", { ascending: false })
			.limit(MATERIAL_LIST_LIMIT),
	]);

	if (approvedRes.error) {
		return NextResponse.json(
			{ message: "승인 학생 목록을 불러오지 못했습니다.", detail: approvedRes.error },
			{ status: 500 },
		);
	}
	if (viewsRes.error) {
		return NextResponse.json(
			{ message: "열람 기록을 불러오지 못했습니다.", detail: viewsRes.error },
			{ status: 500 },
		);
	}
	if (materialsRes.error) {
		return NextResponse.json(
			{ message: "자료 목록을 불러오지 못했습니다.", detail: materialsRes.error.message },
			{ status: 500 },
		);
	}

	const approvedSet = approvedRes.ids;
	const approvedStudentCount = approvedSet.size;

	const byMaterial = new Map<number, { count: number; last: string | null }>();
	for (const row of viewsRes.rows) {
		if (!approvedSet.has(row.student_id)) continue;
		const mid = Number(row.material_id);
		if (!Number.isFinite(mid)) continue;
		const cur = byMaterial.get(mid) ?? { count: 0, last: null };
		cur.count += 1;
		const va = row.viewed_at;
		if (va && (!cur.last || va > cur.last)) {
			cur.last = va;
		}
		byMaterial.set(mid, cur);
	}

	const matIds = (materialsRes.data ?? []) as { id: number }[];
	const items: MaterialReadStatItem[] = matIds.map(({ id: mid }) => {
		const agg = byMaterial.get(mid);
		const viewedStudentCount = agg?.count ?? 0;
		const unreadStudentCount = Math.max(0, approvedStudentCount - viewedStudentCount);
		const readRatePercent =
			approvedStudentCount > 0 ? Math.min(100, Math.round((viewedStudentCount / approvedStudentCount) * 100)) : 0;
		return {
			materialId: mid,
			viewedStudentCount,
			unreadStudentCount,
			readRatePercent,
			lastViewedAt: agg?.last ?? null,
		};
	});

	const body: MaterialReadStatsResponse = { approvedStudentCount, items };
	return NextResponse.json(body);
}
