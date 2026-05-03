import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { hasUnreadAdminReply } from "@/utils/requestReplyUnread";

export type StudentHomeSummary = {
	unreadMaterialsInRecentScan: number;
	materialsRecentScanned: number;
	openRequestsCount: number;
	examRecordCount: number;
	lastExamDate: string | null;
	materialViewsLast7Days: number;
	needsTargetUniversity: boolean;
	unreadRequestReplies: number;
};
const UNREAD_SCAN_LIMIT = 120;
const OPEN_REQUEST_STATUSES = ["접수", "처리중"] as const;

function weekAgoIso(): string {
	const d = new Date();
	d.setDate(d.getDate() - 7);
	return d.toISOString();
}

export async function GET(_request: NextRequest) {
	const session = await getStudentSession(_request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	const since = weekAgoIso();

	const [
		materialsResult,
		viewsResult,
		openReqResult,
		unreadReqRowsResult,
		examCountResult,
		lastExamResult,
		views7Result,
		profileResult,
	] = await Promise.all([
		supabaseAdmin.from("materials").select("id").order("created_at", { ascending: false }).limit(UNREAD_SCAN_LIMIT),
		supabaseAdmin.from("student_material_views").select("material_id").eq("student_id", session.userId),
		supabaseAdmin
			.from("student_requests")
			.select("*", { count: "exact", head: true })
			.eq("student_id", session.userId)
			.eq("is_deleted", false)
			.in("status", [...OPEN_REQUEST_STATUSES]),
		supabaseAdmin
			.from("student_requests")
			.select("admin_last_response_at, requester_read_at")
			.eq("student_id", session.userId)
			.eq("is_deleted", false),
		supabaseAdmin.from("exam_records").select("*", { count: "exact", head: true }).eq("student_id", session.userId),
		supabaseAdmin
			.from("exam_records")
			.select("exam_date")
			.eq("student_id", session.userId)
			.order("exam_date", { ascending: false })
			.limit(1)
			.maybeSingle(),
		supabaseAdmin
			.from("student_material_views")
			.select("*", { count: "exact", head: true })
			.eq("student_id", session.userId)
			.gte("viewed_at", since),
		supabaseAdmin.from("profiles").select("target_university").eq("id", session.userId).maybeSingle(),
	]);

	if (materialsResult.error) {
		return NextResponse.json({ message: "자료 정보를 불러오지 못했습니다.", detail: materialsResult.error.message }, { status: 500 });
	}
	if (viewsResult.error) {
		return NextResponse.json({ message: "열람 기록을 불러오지 못했습니다.", detail: viewsResult.error.message }, { status: 500 });
	}
	if (openReqResult.error) {
		return NextResponse.json({ message: "문의 현황을 불러오지 못했습니다.", detail: openReqResult.error.message }, { status: 500 });
	}
	if (unreadReqRowsResult.error) {
		return NextResponse.json({ message: "문의 알림을 불러오지 못했습니다.", detail: unreadReqRowsResult.error.message }, { status: 500 });
	}
	if (examCountResult.error) {
		return NextResponse.json({ message: "성적 정보를 불러오지 못했습니다.", detail: examCountResult.error.message }, { status: 500 });
	}
	if (views7Result.error) {
		return NextResponse.json({ message: "학습 활동을 불러오지 못했습니다.", detail: views7Result.error.message }, { status: 500 });
	}
	if (lastExamResult.error) {
		return NextResponse.json({ message: "성적 기록을 불러오지 못했습니다.", detail: lastExamResult.error.message }, { status: 500 });
	}
	if (profileResult.error) {
		return NextResponse.json({ message: "프로필을 불러오지 못했습니다.", detail: profileResult.error.message }, { status: 500 });
	}

	const viewed = new Set((viewsResult.data ?? []).map((r) => Number((r as { material_id: number }).material_id)));
	const matRows = (materialsResult.data ?? []) as { id: number }[];
	const materialsRecentScanned = matRows.length;
	const unreadMaterialsInRecentScan = matRows.filter((m) => !viewed.has(m.id)).length;

	const lastExamRow = lastExamResult.data as { exam_date: string } | null;
	const lastExamDate = lastExamRow?.exam_date?.trim() || null;
	const tu = String((profileResult.data as { target_university?: string } | null)?.target_university ?? "").trim();

	const unreadRequestReplies = (unreadReqRowsResult.data ?? []).filter((row) =>
		hasUnreadAdminReply(
			row as { admin_last_response_at: string | null; requester_read_at: string | null },
		),
	).length;

	const summary: StudentHomeSummary = {
		unreadMaterialsInRecentScan,
		materialsRecentScanned,
		openRequestsCount: openReqResult.count ?? 0,
		unreadRequestReplies,
		examRecordCount: examCountResult.count ?? 0,
		lastExamDate,
		materialViewsLast7Days: views7Result.count ?? 0,
		needsTargetUniversity: tu.length === 0,
	};

	return NextResponse.json({ summary });
}
