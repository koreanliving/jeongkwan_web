import { NextRequest, NextResponse } from "next/server";
import { normalizeParentUsername } from "@/utils/parentAuthEmail";
import { hashParentPassword } from "@/utils/server/parentPassword";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { isValidUuid } from "@/utils/uuidValidation";

function isBcryptHash(value: string): boolean {
	return /^\$2[aby]\$\d{2}\$/.test(value);
}

export async function GET(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("parent_signup_requests")
		.select(
			"id, username, parent_name, phone, student_name, academy, status, admin_note, created_at, updated_at",
		)
		.order("created_at", { ascending: false })
		.limit(500);

	if (error) {
		return NextResponse.json(
			{
				message: "학부모 가입신청 목록을 불러오지 못했습니다.",
				detail: error.message,
			},
			{ status: 500 },
		);
	}

	return NextResponse.json({ parentSignupRequests: data ?? [] });
}

export async function POST(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			id?: number;
			action?: string;
			linkedStudentId?: string;
			adminNote?: string;
		};

		if (!body.id || !body.action || !["approve", "reject"].includes(body.action)) {
			return NextResponse.json({ message: "요청 파라미터가 올바르지 않습니다." }, { status: 400 });
		}

		if (body.action === "approve") {
			const linkedStudentId = (body.linkedStudentId ?? "").trim();
			if (!isValidUuid(linkedStudentId)) {
				return NextResponse.json(
					{ message: "승인 시 연결할 학생(profiles UUID)을 선택해 주세요." },
					{ status: 400 },
				);
			}

			const { data: reqRow, error: fetchError } = await supabaseAdmin
				.from("parent_signup_requests")
				.select("id, username, password, parent_name, phone, student_name, academy, status")
				.eq("id", body.id)
				.maybeSingle();

			if (fetchError || !reqRow) {
				return NextResponse.json({ message: "신청 정보를 찾을 수 없습니다." }, { status: 404 });
			}

			if (reqRow.status !== "대기") {
				return NextResponse.json({ message: "이미 처리된 신청입니다." }, { status: 409 });
			}

			const username = normalizeParentUsername(String(reqRow.username ?? ""));
			const storedPassword = String(reqRow.password ?? "").trim();
			if (!username || !storedPassword) {
				return NextResponse.json({ message: "신청 데이터가 올바르지 않습니다." }, { status: 400 });
			}

			const { data: dup } = await supabaseAdmin.from("parent_profiles").select("id").eq("username", username).maybeSingle();
			if (dup) {
				return NextResponse.json({ message: "이미 동일 아이디의 학부모 계정이 있습니다." }, { status: 409 });
			}

			const { data: studentRow, error: studentError } = await supabaseAdmin
				.from("profiles")
				.select("id, is_approved")
				.eq("id", linkedStudentId)
				.maybeSingle();

			if (studentError || !studentRow) {
				return NextResponse.json({ message: "선택한 학생을 찾을 수 없습니다." }, { status: 404 });
			}

			if (!studentRow.is_approved) {
				return NextResponse.json(
					{ message: "승인된 학생 계정만 학부모와 연결할 수 있습니다. 먼저 학생 승인을 완료해 주세요." },
					{ status: 400 },
				);
			}

			const passwordHash = isBcryptHash(storedPassword) ? storedPassword : await hashParentPassword(storedPassword);
			const phone = String(reqRow.phone ?? "").replace(/[-\s]/g, "") || "-";
			const parentName = String(reqRow.parent_name ?? "").trim();

			const { data: created, error: insertError } = await supabaseAdmin
				.from("parent_profiles")
				.insert({
					username,
					password_hash: passwordHash,
					name: parentName,
					phone,
					linked_student_id: linkedStudentId,
					is_approved: true,
				})
				.select("id")
				.maybeSingle();

			if (insertError || !created) {
				return NextResponse.json(
					{
						message: "학부모 계정 생성에 실패했습니다.",
						detail: insertError?.message,
						code: insertError?.code,
					},
					{ status: 500 },
				);
			}

			const parentId = (created as { id: string }).id;

			const { error: updateError } = await supabaseAdmin
				.from("parent_signup_requests")
				.update({ status: "승인", admin_note: (body.adminNote ?? "").trim() || null, updated_at: new Date().toISOString() })
				.eq("id", body.id);

			if (updateError) {
				await supabaseAdmin.from("parent_profiles").delete().eq("id", parentId);
				return NextResponse.json({ message: "신청 상태 업데이트에 실패했습니다. 학부모 계정은 롤백되었습니다." }, { status: 500 });
			}

			return NextResponse.json({
				ok: true,
				parentId,
				username,
				parentName,
				linkedStudentId,
			});
		}

		if (body.action === "reject") {
			const { error } = await supabaseAdmin
				.from("parent_signup_requests")
				.update({ status: "거절", admin_note: (body.adminNote ?? "").trim() || null, updated_at: new Date().toISOString() })
				.eq("id", body.id);

			if (error) {
				return NextResponse.json({ message: "신청 거절 처리에 실패했습니다." }, { status: 500 });
			}

			return NextResponse.json({ ok: true });
		}

		return NextResponse.json({ message: "요청 파라미터가 올바르지 않습니다." }, { status: 400 });
	} catch (e) {
		console.error("[api/admin/parent-signup]", e);
		return NextResponse.json({ message: "요청 처리 중 오류가 발생했습니다." }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { id?: number };

		if (!body.id) {
			return NextResponse.json({ message: "삭제할 신청 ID가 필요합니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("parent_signup_requests").delete().eq("id", body.id);

		if (error) {
			return NextResponse.json({ message: "신청 삭제에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
