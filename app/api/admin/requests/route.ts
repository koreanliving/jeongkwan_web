import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

type RequestStatus = "접수" | "처리중" | "완료";

function isValidStatus(value: string): value is RequestStatus {
	return value === "접수" || value === "처리중" || value === "완료";
}

export async function GET(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("student_requests")
		.select("id, request_type, title, content, status, admin_reply, support_video_url, created_at, updated_at, student_id")
		.order("created_at", { ascending: false })
		.limit(300);

	if (error || !data) {
		return NextResponse.json({ message: "요청 목록을 불러오지 못했습니다." }, { status: 500 });
	}

	const studentIds = Array.from(new Set(data.map((item) => item.student_id as number)));
	const { data: studentsData } = await supabaseAdmin
		.from("students")
		.select("id, student_id, name")
		.in("id", studentIds);

	const studentMap = new Map<number, { student_id: string; name: string }>();
	(studentsData ?? []).forEach((student) => {
		studentMap.set(student.id as number, {
			student_id: student.student_id as string,
			name: student.name as string,
		});
	});

	const requests = data.map((item) => {
		const student = studentMap.get(item.student_id as number);
		return {
			...item,
			student_code: student?.student_id ?? "",
			student_name: student?.name ?? "",
		};
	});

	return NextResponse.json({ requests });
}

export async function PATCH(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			id?: number;
			status?: string;
			adminReply?: string;
			supportVideoUrl?: string;
		};

		if (!body.id || !body.status || !isValidStatus(body.status)) {
			return NextResponse.json({ message: "수정 파라미터가 올바르지 않습니다." }, { status: 400 });
		}

		const updatePayload = {
			status: body.status,
			admin_reply: (body.adminReply ?? "").trim() || null,
			support_video_url: (body.supportVideoUrl ?? "").trim() || null,
			updated_at: new Date().toISOString(),
		};

		const { error } = await supabaseAdmin.from("student_requests").update(updatePayload).eq("id", body.id);
		if (error) {
			return NextResponse.json({ message: "요청 답변 저장에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
