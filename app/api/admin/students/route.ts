import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export async function GET(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("students")
		.select("id, student_id, name, is_active, created_at")
		.order("created_at", { ascending: false });

	if (error) {
		return NextResponse.json({ message: "학생 목록을 불러오지 못했습니다." }, { status: 500 });
	}

	return NextResponse.json({ students: data ?? [] });
}

export async function POST(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			studentId?: string;
			name?: string;
			password?: string;
		};

		const studentId = (body.studentId ?? "").trim();
		const name = (body.name ?? "").trim();
		const password = (body.password ?? "").trim();

		if (!studentId || !name || !password) {
			return NextResponse.json({ message: "아이디, 이름, 비밀번호를 모두 입력해 주세요." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("students").insert({
			student_id: studentId,
			name,
			password,
			is_active: true,
		});

		if (error) {
			return NextResponse.json({ message: "학생 추가에 실패했습니다. 중복 아이디인지 확인해 주세요." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function PATCH(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			id?: number;
			isActive?: boolean;
		};

		if (!body.id || typeof body.isActive !== "boolean") {
			return NextResponse.json({ message: "수정 파라미터가 올바르지 않습니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin
			.from("students")
			.update({ is_active: body.isActive })
			.eq("id", body.id);

		if (error) {
			return NextResponse.json({ message: "학생 상태 수정에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
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
		if (!body.id) {
			return NextResponse.json({ message: "삭제할 학생 ID가 필요합니다." }, { status: 400 });
		}

		await supabaseAdmin.from("student_sessions").delete().eq("student_id", body.id);
		const { error } = await supabaseAdmin.from("students").delete().eq("id", body.id);

		if (error) {
			return NextResponse.json({ message: "학생 삭제에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
