import { NextRequest, NextResponse } from "next/server";
import { formatExamDisplayName } from "@/utils/examKinds";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { isValidUuid } from "@/utils/uuidValidation";

export type StudentActivityKind = "material_view" | "exam" | "request" | "memo";

export type StudentActivityItem = {
	kind: StudentActivityKind;
	at: string;
	label: string;
	meta: string | null;
};

const LIMIT_EACH = 40;
const MERGED_LIMIT = 25;

function truncate(s: string, max: number): string {
	const t = s.replace(/\s+/g, " ").trim();
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1)}…`;
}

export async function GET(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const studentId = (request.nextUrl.searchParams.get("studentId") ?? "").trim();
	if (!isValidUuid(studentId)) {
		return NextResponse.json({ message: "학생 ID가 올바르지 않습니다." }, { status: 400 });
	}

	const [viewsRes, examsRes, requestsRes, memosRes] = await Promise.all([
		supabaseAdmin
			.from("student_material_views")
			.select("material_id, viewed_at")
			.eq("student_id", studentId)
			.order("viewed_at", { ascending: false })
			.limit(LIMIT_EACH),
		supabaseAdmin
			.from("exam_records")
			.select("id, exam_kind, exam_detail, exam_name, exam_date, score, grade, created_at")
			.eq("student_id", studentId)
			.order("created_at", { ascending: false })
			.limit(LIMIT_EACH),
		supabaseAdmin
			.from("student_requests")
			.select("id, request_type, title, status, created_at, updated_at")
			.eq("student_id", studentId)
			.eq("is_deleted", false)
			.order("updated_at", { ascending: false })
			.limit(LIMIT_EACH),
		supabaseAdmin
			.from("memos")
			.select("id, content, created_at")
			.eq("student_id", studentId)
			.order("created_at", { ascending: false })
			.limit(LIMIT_EACH),
	]);

	const firstErr = viewsRes.error ?? examsRes.error ?? requestsRes.error ?? memosRes.error;
	if (firstErr) {
		return NextResponse.json({ message: "활동 기록을 불러오지 못했습니다.", detail: firstErr.message }, { status: 500 });
	}

	const viewRows = (viewsRes.data ?? []) as { material_id: number; viewed_at: string }[];
	const materialIds = [...new Set(viewRows.map((r) => Number(r.material_id)).filter((id) => Number.isInteger(id) && id > 0))];
	const titleById = new Map<number, string>();
	if (materialIds.length > 0) {
		const { data: matRows, error: matErr } = await supabaseAdmin.from("materials").select("id, title").in("id", materialIds);
		if (matErr) {
			return NextResponse.json({ message: "자료 제목을 불러오지 못했습니다.", detail: matErr.message }, { status: 500 });
		}
		for (const row of (matRows ?? []) as { id: number; title: string }[]) {
			titleById.set(Number(row.id), String(row.title ?? ""));
		}
	}

	const items: StudentActivityItem[] = [];

	for (const v of viewRows) {
		const mid = Number(v.material_id);
		const title = titleById.get(mid)?.trim() || `자료 #${mid}`;
		items.push({
			kind: "material_view",
			at: v.viewed_at,
			label: `자료 열람 · ${title}`,
			meta: null,
		});
	}

	for (const row of (examsRes.data ?? []) as {
		exam_kind: string;
		exam_detail: string | null;
		exam_name: string | null;
		exam_date: string | null;
		score: number;
		grade: number;
		created_at: string;
	}[]) {
		const kind = String(row.exam_kind ?? "").trim();
		const detail = row.exam_detail != null && String(row.exam_detail).trim() ? String(row.exam_detail).trim() : null;
		const display =
			String(row.exam_name ?? "").trim() || formatExamDisplayName(kind, detail);
		items.push({
			kind: "exam",
			at: row.created_at,
			label: `성적 · ${display} (${row.score}점 · ${row.grade}등급)`,
			meta: row.exam_date ? `응시일 ${row.exam_date}` : null,
		});
	}

	for (const row of (requestsRes.data ?? []) as {
		request_type: string;
		title: string;
		status: string;
		created_at: string;
		updated_at: string;
	}[]) {
		items.push({
			kind: "request",
			at: row.updated_at || row.created_at,
			label: `요청 · [${row.request_type}] ${row.title}`,
			meta: `상태 ${row.status}`,
		});
	}

	for (const row of (memosRes.data ?? []) as { content: string; created_at: string }[]) {
		items.push({
			kind: "memo",
			at: row.created_at,
			label: "관리자 메모",
			meta: truncate(String(row.content ?? ""), 120) || null,
		});
	}

	items.sort((a, b) => {
		const ta = Date.parse(a.at);
		const tb = Date.parse(b.at);
		if (tb !== ta) return tb - ta;
		return 0;
	});

	return NextResponse.json({ items: items.slice(0, MERGED_LIMIT) });
}
