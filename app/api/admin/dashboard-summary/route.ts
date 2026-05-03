import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export type AdminDashboardSummary = {
	pendingStudentSignups: number;
	pendingParentSignups: number;
	openStudentRequests: number;
	openParentRequests: number;
	unapprovedStudents: number;
	unapprovedParentAccounts: number;
	materialsCount: number;
	videosCount: number;
	materialViewsLast7Days: number;
	examRecordsCreatedLast7Days: number;
	latestMaterialCreatedAt: string | null;
	latestVideoCreatedAt: string | null;
};

const OPEN_REQUEST_STATUSES = ["접수", "처리중"] as const;

function weekAgoIso(): string {
	const d = new Date();
	d.setDate(d.getDate() - 7);
	return d.toISOString();
}

export async function GET(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const since = weekAgoIso();

	try {
		const [
			pendingStudentSignupsRes,
			pendingParentSignupsRes,
			openStudentRequestsRes,
			openParentRequestsRes,
			unapprovedStudentsRes,
			unapprovedParentAccountsRes,
			materialsCountRes,
			videosCountRes,
			materialViewsLast7Res,
			examRecordsLast7Res,
			latestMaterialRes,
			latestVideoRes,
		] = await Promise.all([
			supabaseAdmin.from("signup_requests").select("*", { count: "exact", head: true }).eq("status", "대기"),
			supabaseAdmin.from("parent_signup_requests").select("*", { count: "exact", head: true }).eq("status", "대기"),
			supabaseAdmin
				.from("student_requests")
				.select("*", { count: "exact", head: true })
				.eq("is_deleted", false)
				.in("status", [...OPEN_REQUEST_STATUSES]),
			supabaseAdmin
				.from("parent_requests")
				.select("*", { count: "exact", head: true })
				.eq("is_deleted", false)
				.in("status", [...OPEN_REQUEST_STATUSES]),
			supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
			supabaseAdmin.from("parent_profiles").select("*", { count: "exact", head: true }).eq("is_approved", false),
			supabaseAdmin.from("materials").select("*", { count: "exact", head: true }),
			supabaseAdmin.from("videos").select("*", { count: "exact", head: true }),
			supabaseAdmin.from("student_material_views").select("*", { count: "exact", head: true }).gte("viewed_at", since),
			supabaseAdmin.from("exam_records").select("*", { count: "exact", head: true }).gte("created_at", since),
			supabaseAdmin.from("materials").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
			supabaseAdmin.from("videos").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
		]);

		const firstErr =
			pendingStudentSignupsRes.error ??
			pendingParentSignupsRes.error ??
			openStudentRequestsRes.error ??
			openParentRequestsRes.error ??
			unapprovedStudentsRes.error ??
			unapprovedParentAccountsRes.error ??
			materialsCountRes.error ??
			videosCountRes.error ??
			materialViewsLast7Res.error ??
			examRecordsLast7Res.error ??
			latestMaterialRes.error ??
			latestVideoRes.error;

		if (firstErr) {
			return NextResponse.json({ message: "요약 데이터를 불러오지 못했습니다.", detail: firstErr.message }, { status: 500 });
		}

		const payload: AdminDashboardSummary = {
			pendingStudentSignups: pendingStudentSignupsRes.count ?? 0,
			pendingParentSignups: pendingParentSignupsRes.count ?? 0,
			openStudentRequests: openStudentRequestsRes.count ?? 0,
			openParentRequests: openParentRequestsRes.count ?? 0,
			unapprovedStudents: unapprovedStudentsRes.count ?? 0,
			unapprovedParentAccounts: unapprovedParentAccountsRes.count ?? 0,
			materialsCount: materialsCountRes.count ?? 0,
			videosCount: videosCountRes.count ?? 0,
			materialViewsLast7Days: materialViewsLast7Res.count ?? 0,
			examRecordsCreatedLast7Days: examRecordsLast7Res.count ?? 0,
			latestMaterialCreatedAt: (latestMaterialRes.data as { created_at?: string } | null)?.created_at ?? null,
			latestVideoCreatedAt: (latestVideoRes.data as { created_at?: string } | null)?.created_at ?? null,
		};

		return NextResponse.json({ summary: payload });
	} catch (e) {
		const detail = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ message: "요약 데이터를 불러오지 못했습니다.", detail }, { status: 500 });
	}
}
