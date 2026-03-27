import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { studentEmailFromUsername } from "@/utils/studentAuthEmail";
import { isValidUuid } from "@/utils/uuidValidation";

export async function GET(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("profiles")
		.select("id, username, name, academy, phone, is_approved, created_at")
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
			academy?: string;
			phone?: string;
			isApproved?: boolean;
		};

		const username = (body.studentId ?? "").trim();
		const name = (body.name ?? "").trim();
		const password = (body.password ?? "").trim();
		const academy = (body.academy ?? "").trim() || "-";
		const phone = (body.phone ?? "").trim() || "-";
		const isApproved = body.isApproved !== false;

		if (!username || !name || !password) {
			return NextResponse.json({ message: "아이디, 이름, 비밀번호를 모두 입력해 주세요." }, { status: 400 });
		}

		const email = studentEmailFromUsername(username);

		const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
		});

		if (createError || !created.user) {
			return NextResponse.json(
				{ message: createError?.message ?? "Auth 계정 생성에 실패했습니다. 이메일(아이디) 중복 여부를 확인해 주세요." },
				{ status: 500 },
			);
		}

		const userId = created.user.id;

		const { error: profileError } = await supabaseAdmin.from("profiles").insert({
			id: userId,
			username,
			name,
			academy,
			phone,
			is_approved: isApproved,
		});

		if (profileError) {
			await supabaseAdmin.auth.admin.deleteUser(userId);
			return NextResponse.json({ message: "프로필 생성에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true, id: userId });
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
			id?: string;
			isApproved?: boolean;
			password?: string;
		};

		const id = (body.id ?? "").trim();
		if (!isValidUuid(id)) {
			return NextResponse.json({ message: "유효한 학생 ID가 아닙니다." }, { status: 400 });
		}

		if (typeof body.isApproved === "boolean") {
			const { error } = await supabaseAdmin.from("profiles").update({ is_approved: body.isApproved }).eq("id", id);
			if (error) {
				return NextResponse.json({ message: "승인 상태 변경에 실패했습니다." }, { status: 500 });
			}
			return NextResponse.json({ ok: true });
		}

		const newPassword = (body.password ?? "").trim();
		if (newPassword.length > 0) {
			if (newPassword.length < 6) {
				return NextResponse.json({ message: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
			}
			const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: newPassword });
			if (error) {
				return NextResponse.json({ message: error.message || "비밀번호 변경에 실패했습니다." }, { status: 500 });
			}
			return NextResponse.json({ ok: true });
		}

		return NextResponse.json({ message: "수정할 값이 없습니다." }, { status: 400 });
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
			return NextResponse.json({ message: "삭제할 학생 ID가 필요합니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
		if (error) {
			return NextResponse.json({ message: error.message || "계정 삭제에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
