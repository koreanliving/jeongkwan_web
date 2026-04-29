import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export async function GET(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const groupIdRaw = request.nextUrl.searchParams.get("groupId");
	const groupId = groupIdRaw ? Number(groupIdRaw) : NaN;
	if (!Number.isInteger(groupId) || groupId < 1) {
		return NextResponse.json({ message: "유효한 groupId 쿼리가 필요합니다." }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("class_reports")
		.select("id, group_id, week_label, content, created_at, updated_at")
		.eq("group_id", groupId)
		.order("created_at", { ascending: false });

	if (error) {
		return NextResponse.json({ message: "리포트 목록을 불러오지 못했습니다.", detail: error.message }, { status: 500 });
	}

	return NextResponse.json({ reports: data ?? [] });
}

export async function POST(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { groupId?: number; weekLabel?: string; content?: string };
		const groupId = typeof body.groupId === "number" ? body.groupId : Number(body.groupId);
		const weekLabel = (body.weekLabel ?? "").trim();
		const content = (body.content ?? "").trim();

		if (!Number.isInteger(groupId) || groupId < 1) {
			return NextResponse.json({ message: "유효한 수업반 ID가 필요합니다." }, { status: 400 });
		}
		if (!weekLabel) {
			return NextResponse.json({ message: "주차(제목) 라벨을 입력해 주세요." }, { status: 400 });
		}
		if (!content) {
			return NextResponse.json({ message: "수업 내용을 입력해 주세요." }, { status: 400 });
		}

		const { data, error } = await supabaseAdmin
			.from("class_reports")
			.insert({ group_id: groupId, week_label: weekLabel, content })
			.select("id, group_id, week_label, content, created_at, updated_at")
			.single();

		if (error || !data) {
			return NextResponse.json({ message: "리포트 등록에 실패했습니다.", detail: error?.message }, { status: 500 });
		}

		return NextResponse.json({ report: data });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function PATCH(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { id?: number; weekLabel?: string; content?: string };
		const id = typeof body.id === "number" ? body.id : Number(body.id);
		if (!Number.isInteger(id) || id < 1) {
			return NextResponse.json({ message: "유효한 리포트 ID가 필요합니다." }, { status: 400 });
		}

		const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
		if (body.weekLabel !== undefined) {
			const w = String(body.weekLabel).trim();
			if (!w) {
				return NextResponse.json({ message: "주차 라벨은 비울 수 없습니다." }, { status: 400 });
			}
			patch.week_label = w;
		}
		if (body.content !== undefined) {
			const c = String(body.content).trim();
			if (!c) {
				return NextResponse.json({ message: "내용은 비울 수 없습니다." }, { status: 400 });
			}
			patch.content = c;
		}

		if (Object.keys(patch).length <= 1) {
			return NextResponse.json({ message: "수정할 필드를 보내 주세요." }, { status: 400 });
		}

		const { data, error } = await supabaseAdmin
			.from("class_reports")
			.update(patch)
			.eq("id", id)
			.select("id, group_id, week_label, content, created_at, updated_at")
			.single();

		if (error || !data) {
			return NextResponse.json({ message: "리포트 수정에 실패했습니다.", detail: error?.message }, { status: 500 });
		}

		return NextResponse.json({ report: data });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { id?: number };
		const id = typeof body.id === "number" ? body.id : Number(body.id);
		if (!Number.isInteger(id) || id < 1) {
			return NextResponse.json({ message: "삭제할 리포트 ID가 필요합니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("class_reports").delete().eq("id", id);
		if (error) {
			return NextResponse.json({ message: "리포트 삭제에 실패했습니다.", detail: error.message }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
