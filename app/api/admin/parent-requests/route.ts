import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

type RequestStatus = "접수" | "처리중" | "완료";

function isValidStatus(value: string): value is RequestStatus {
	return value === "접수" || value === "처리중" || value === "완료";
}

export async function GET(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("parent_requests")
		.select(
			"id, parent_id, request_type, title, content, status, admin_reply, support_video_url, is_deleted, created_at, updated_at",
		)
		.order("created_at", { ascending: false })
		.limit(300);

	if (error || !data) {
		return NextResponse.json({ message: "학부모 문의 목록을 불러오지 못했습니다." }, { status: 500 });
	}

	const parentIds = Array.from(new Set(data.map((item) => String(item.parent_id))));
	const { data: profilesData } = await supabaseAdmin
		.from("parent_profiles")
		.select("id, username, name")
		.in("id", parentIds);

	const profileMap = new Map<string, { username: string; name: string }>();
	(profilesData ?? []).forEach((row) => {
		profileMap.set(String(row.id), {
			username: row.username as string,
			name: row.name as string,
		});
	});

	const requests = data.map((item) => {
		const pid = String(item.parent_id);
		const profile = profileMap.get(pid);
		return {
			...item,
			parent_username: profile?.username ?? "",
			parent_name: profile?.name ?? "",
		};
	});

	return NextResponse.json({ requests });
}

export async function PATCH(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
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

		const { error } = await supabaseAdmin.from("parent_requests").update(updatePayload).eq("id", body.id);
		if (error) {
			return NextResponse.json({ message: "문의 답변 저장에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { id?: number };
		if (!body.id) {
			return NextResponse.json({ message: "삭제할 문의 ID가 필요합니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("parent_requests").delete().eq("id", body.id);
		if (error) {
			return NextResponse.json({ message: "문의 삭제에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
