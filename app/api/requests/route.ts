import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { hasUnreadAdminReply } from "@/utils/requestReplyUnread";

type RequestType = "보강영상" | "질문" | "상담";

function isValidType(value: string): value is RequestType {
	return value === "보강영상" || value === "질문" || value === "상담";
}

async function getStudentRequestsWithCompat(studentUserId: string) {
	const withReplyColumns = await supabaseAdmin
		.from("student_requests")
		.select(
			"id, request_type, title, content, status, admin_reply, support_video_url, is_deleted, created_at, updated_at, admin_last_response_at, requester_read_at",
		)
		.eq("student_id", studentUserId)
		.eq("is_deleted", false)
		.order("created_at", { ascending: false });

	if (!withReplyColumns.error) {
		return { data: withReplyColumns.data ?? [], error: null as null };
	}

	const maybeColumnError = withReplyColumns.error as { code?: string };
	if (maybeColumnError.code !== "42703") {
		return { data: [] as unknown[], error: withReplyColumns.error };
	}

	const legacyColumns = await supabaseAdmin
		.from("student_requests")
		.select("id, request_type, title, content, status, admin_reply, support_video_url, is_deleted, created_at, updated_at")
		.eq("student_id", studentUserId)
		.eq("is_deleted", false)
		.order("created_at", { ascending: false });

	if (legacyColumns.error) {
		return { data: [] as unknown[], error: legacyColumns.error };
	}

	const compatRows = (legacyColumns.data ?? []).map((row) => ({
		...row,
		admin_last_response_at: null,
		requester_read_at: null,
	}));

	return { data: compatRows, error: null as null };
}

export async function GET(request: NextRequest) {
	const session = await getStudentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await getStudentRequestsWithCompat(session.userId);

	if (error) {
		return NextResponse.json({ message: "요청 목록을 불러오지 못했습니다." }, { status: 500 });
	}

	const { data: profileRow } = await supabaseAdmin
		.from("profiles")
		.select("academy, signup_grade, target_university, target_department")
		.eq("id", session.userId)
		.maybeSingle();

	const { data: signupGradeRow } = await supabaseAdmin
		.from("signup_requests")
		.select("grade")
		.eq("student_id", session.username)
		.eq("status", "승인")
		.order("updated_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	const academy = (profileRow?.academy as string | undefined)?.trim() || "-";
	const gradeFromProfile = (profileRow?.signup_grade as string | undefined)?.trim() || null;
	const gradeFromSignupTable = (signupGradeRow?.grade as string | undefined)?.trim() || null;
	const grade = gradeFromProfile || gradeFromSignupTable || null;
	const targetUniversity = ((profileRow?.target_university as string | undefined) ?? "").trim();
	const targetDepartment = ((profileRow?.target_department as string | undefined) ?? "").trim();

	return NextResponse.json({
		student: {
			id: session.username,
			name: session.name,
			academy,
			grade,
			targetUniversity,
			targetDepartment,
		},
		userId: session.userId,
		requests: (data ?? []).map((row) => {
			const r = row as {
				id: number;
				request_type: string;
				title: string;
				content: string;
				status: string;
				admin_reply: string | null;
				support_video_url: string | null;
				is_deleted: boolean;
				created_at: string;
				updated_at: string;
				admin_last_response_at: string | null;
				requester_read_at: string | null;
			};
			const { admin_last_response_at, requester_read_at, ...rest } = r;
			return {
				...rest,
				has_unread_reply: hasUnreadAdminReply({ admin_last_response_at, requester_read_at }),
			};
		}),
	});
}

export async function POST(request: NextRequest) {
	const session = await getStudentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			requestType?: string;
			title?: string;
			content?: string;
		};

		const requestType = (body.requestType ?? "").trim();
		const title = (body.title ?? "").trim();
		const content = (body.content ?? "").trim();

		if (!isValidType(requestType)) {
			return NextResponse.json({ message: "요청 유형을 확인해 주세요." }, { status: 400 });
		}
		if (!title || !content) {
			return NextResponse.json({ message: "제목과 내용을 모두 입력해 주세요." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("student_requests").insert({
			student_id: session.userId,
			request_type: requestType,
			title,
			content,
		});

		if (error) {
			return NextResponse.json({ message: "요청 등록에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function PATCH(request: NextRequest) {
	const session = await getStudentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { markReadIds?: unknown };
		const raw = body.markReadIds;
		const ids = Array.isArray(raw)
			? raw.map((x) => (typeof x === "number" ? x : Number(x))).filter((n) => Number.isInteger(n) && n > 0)
			: [];
		if (ids.length === 0) {
			return NextResponse.json({ message: "markReadIds 배열이 필요합니다." }, { status: 400 });
		}
		if (ids.length > 80) {
			return NextResponse.json({ message: "한 번에 확인 처리할 수 있는 건수를 초과했습니다." }, { status: 400 });
		}

		const now = new Date().toISOString();
		const { error } = await supabaseAdmin
			.from("student_requests")
			.update({ requester_read_at: now })
			.eq("student_id", session.userId)
			.eq("is_deleted", false)
			.in("id", ids);

		if (error) {
			return NextResponse.json({ message: "읽음 처리에 실패했습니다.", detail: error.message }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	const session = await getStudentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { id?: number };
		if (!body.id) {
			return NextResponse.json({ message: "삭제할 요청 ID가 필요합니다." }, { status: 400 });
		}

		const { data: requestData, error: fetchError } = await supabaseAdmin
			.from("student_requests")
			.select("id, student_id")
			.eq("id", body.id)
			.maybeSingle();

		if (fetchError || !requestData || requestData.student_id !== session.userId) {
			return NextResponse.json({ message: "요청을 찾을 수 없습니다." }, { status: 404 });
		}

		const { error } = await supabaseAdmin
			.from("student_requests")
			.update({ is_deleted: true, updated_at: new Date().toISOString() })
			.eq("id", body.id);

		if (error) {
			return NextResponse.json({ message: "요청 삭제에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
