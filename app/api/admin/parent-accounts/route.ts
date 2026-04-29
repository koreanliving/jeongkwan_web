import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/studentSession";
import { hashParentPassword } from "@/utils/server/parentPassword";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { isValidUuid } from "@/utils/uuidValidation";

export async function GET(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("parent_profiles")
		.select("id, username, name, phone, linked_student_id, is_approved, created_at")
		.order("created_at", { ascending: false })
		.limit(500);

	if (error) {
		return NextResponse.json(
			{ message: "학부모 계정 목록을 불러오지 못했습니다.", detail: error.message },
			{ status: 500 },
		);
	}

	const rows = data ?? [];
	const studentIds = [...new Set(rows.map((r) => String(r.linked_student_id)))];
	let profiles: { id: string; username: string; name: string }[] = [];
	if (studentIds.length > 0) {
		const { data: profData, error: profError } = await supabaseAdmin
			.from("profiles")
			.select("id, username, name")
			.in("id", studentIds);
		if (profError) {
			return NextResponse.json(
				{ message: "연결 학생 정보를 불러오지 못했습니다.", detail: profError.message },
				{ status: 500 },
			);
		}
		profiles = (profData ?? []) as { id: string; username: string; name: string }[];
	}

	const smap = new Map(profiles.map((p) => [String(p.id), p]));

	const accounts = rows.map((row) => {
		const sid = String(row.linked_student_id);
		const s = smap.get(sid);
		return {
			id: row.id as string,
			username: row.username as string,
			name: row.name as string,
			phone: row.phone as string,
			linked_student_id: sid,
			student_name: s?.name ?? "",
			student_username: s?.username ?? "",
			is_approved: Boolean(row.is_approved),
			created_at: row.created_at as string,
		};
	});

	return NextResponse.json({ accounts });
}

export async function PATCH(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { id?: string; password?: string };
		const id = (body.id ?? "").trim();
		const password = (body.password ?? "").trim();

		if (!isValidUuid(id)) {
			return NextResponse.json({ message: "유효한 학부모 계정 ID가 필요합니다." }, { status: 400 });
		}
		if (password.length < 6) {
			return NextResponse.json({ message: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
		}

		const passwordHash = await hashParentPassword(password);
		const { error } = await supabaseAdmin
			.from("parent_profiles")
			.update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
			.eq("id", id);

		if (error) {
			return NextResponse.json({ message: "비밀번호 변경에 실패했습니다.", detail: error.message }, { status: 500 });
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
		const body = (await request.json()) as { id?: string };
		const id = (body.id ?? "").trim();
		if (!isValidUuid(id)) {
			return NextResponse.json({ message: "삭제할 계정 ID가 필요합니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("parent_profiles").delete().eq("id", id);
		if (error) {
			return NextResponse.json({ message: "학부모 계정 삭제에 실패했습니다.", detail: error.message }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
