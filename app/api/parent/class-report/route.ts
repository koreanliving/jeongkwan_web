import { NextRequest, NextResponse } from "next/server";
import { getParentSession } from "@/utils/server/parentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export type ParentClassReportRow = {
	id: number;
	group_id: number;
	group_name: string;
	week_label: string;
	content: string;
	created_at: string;
	updated_at: string;
};

/**
 * 자녀가 속한 수업반의 주간 리포트 목록 (최신순)
 */
export async function GET(request: NextRequest) {
	const session = await getParentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	const { data: links, error: linkError } = await supabaseAdmin
		.from("class_group_students")
		.select("group_id")
		.eq("student_id", session.linkedStudentId);

	if (linkError) {
		return NextResponse.json({ message: "수업반 정보를 불러오지 못했습니다." }, { status: 500 });
	}

	const groupIds = [...new Set((links ?? []).map((r) => Number((r as { group_id: number }).group_id)))].filter(
		(id) => Number.isInteger(id) && id > 0,
	);

	if (groupIds.length === 0) {
		return NextResponse.json({ reports: [] as ParentClassReportRow[] });
	}

	const { data: reports, error: reportError } = await supabaseAdmin
		.from("class_reports")
		.select("id, group_id, week_label, content, created_at, updated_at")
		.in("group_id", groupIds)
		.order("created_at", { ascending: false });

	if (reportError) {
		return NextResponse.json({ message: "리포트를 불러오지 못했습니다." }, { status: 500 });
	}

	const { data: groups, error: groupError } = await supabaseAdmin
		.from("class_groups")
		.select("id, name")
		.in("id", groupIds);

	if (groupError) {
		return NextResponse.json({ message: "수업반 이름을 불러오지 못했습니다." }, { status: 500 });
	}

	const nameById = new Map<number, string>(
		(groups ?? []).map((g) => [Number((g as { id: number }).id), String((g as { name: string }).name)]),
	);

	const rows: ParentClassReportRow[] = (reports ?? []).map((r) => {
		const raw = r as {
			id: number;
			group_id: number;
			week_label: string;
			content: string;
			created_at: string;
			updated_at: string;
		};
		return {
			id: raw.id,
			group_id: raw.group_id,
			group_name: nameById.get(raw.group_id) ?? `반 #${raw.group_id}`,
			week_label: raw.week_label,
			content: raw.content,
			created_at: raw.created_at,
			updated_at: raw.updated_at,
		};
	});

	return NextResponse.json({ reports: rows });
}
