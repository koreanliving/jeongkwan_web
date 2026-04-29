import { NextRequest, NextResponse } from "next/server";
import { getParentSession } from "@/utils/server/parentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

type RequestType = "보강영상" | "질문" | "상담";

function isValidType(value: string): value is RequestType {
	return value === "보강영상" || value === "질문" || value === "상담";
}

export async function GET(request: NextRequest) {
	const session = await getParentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("parent_requests")
		.select("id, request_type, title, content, status, admin_reply, support_video_url, is_deleted, created_at, updated_at")
		.eq("parent_id", session.id)
		.eq("is_deleted", false)
		.order("created_at", { ascending: false });

	if (error) {
		return NextResponse.json({ message: "요청 목록을 불러오지 못했습니다." }, { status: 500 });
	}

	return NextResponse.json({
		parent: {
			id: session.id,
			username: session.username,
			name: session.name,
		},
		requests: data ?? [],
	});
}

export async function POST(request: NextRequest) {
	const session = await getParentSession(request);
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

		const { error } = await supabaseAdmin.from("parent_requests").insert({
			parent_id: session.id,
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

export async function DELETE(request: NextRequest) {
	const session = await getParentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { id?: number };
		if (!body.id) {
			return NextResponse.json({ message: "삭제할 요청 ID가 필요합니다." }, { status: 400 });
		}

		const { data: row, error: fetchError } = await supabaseAdmin
			.from("parent_requests")
			.select("id, parent_id")
			.eq("id", body.id)
			.maybeSingle();

		if (fetchError || !row || (row as { parent_id: string }).parent_id !== session.id) {
			return NextResponse.json({ message: "요청을 찾을 수 없습니다." }, { status: 404 });
		}

		const { error } = await supabaseAdmin
			.from("parent_requests")
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
