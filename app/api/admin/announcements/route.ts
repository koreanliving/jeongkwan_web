import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

function normalizeText(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			title?: unknown;
			content?: unknown;
		};
		const title = normalizeText(body.title);
		const content = normalizeText(body.content);

		if (!title || !content) {
			return NextResponse.json({ message: "공지 제목과 내용을 모두 입력해 주세요." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("announcements").insert({ title, content });
		if (error) {
			return NextResponse.json({ message: error.message || "공지 등록에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function PATCH(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			id?: unknown;
			title?: unknown;
			content?: unknown;
		};
		const id = typeof body.id === "number" ? body.id : Number(body.id);
		const title = normalizeText(body.title);
		const content = normalizeText(body.content);

		if (!Number.isInteger(id) || id < 1) {
			return NextResponse.json({ message: "유효한 공지 ID가 필요합니다." }, { status: 400 });
		}
		if (!title || !content) {
			return NextResponse.json({ message: "공지 제목과 내용을 모두 입력해 주세요." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("announcements").update({ title, content }).eq("id", id);
		if (error) {
			return NextResponse.json({ message: error.message || "공지 수정에 실패했습니다." }, { status: 500 });
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
		const body = (await request.json()) as { id?: unknown };
		const id = typeof body.id === "number" ? body.id : Number(body.id);
		if (!Number.isInteger(id) || id < 1) {
			return NextResponse.json({ message: "유효한 공지 ID가 필요합니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("announcements").delete().eq("id", id);
		if (error) {
			return NextResponse.json({ message: error.message || "공지 삭제에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
