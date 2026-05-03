import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/utils/server/adminActionLog";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { studentEmailFromUsername } from "@/utils/studentAuthEmail";

export async function GET(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("signup_requests")
		.select("id, student_id, student_name, academy, phone, grade, recent_test, recent_grade, selected_subject, status, admin_note, created_at, updated_at")
		.order("created_at", { ascending: false })
		.limit(500);

	if (error) {
		return NextResponse.json({ message: "가입신청 목록을 불러오지 못했습니다." }, { status: 500 });
	}

	return NextResponse.json({ signupRequests: data ?? [] });
}

export async function POST(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			id?: number;
			action?: string;
			adminNote?: string;
		};

		if (!body.id || !body.action || !["approve", "reject"].includes(body.action)) {
			return NextResponse.json({ message: "요청 파라미터가 올바르지 않습니다." }, { status: 400 });
		}

		if (body.action === "approve") {
			const { data: signupData, error: fetchError } = await supabaseAdmin
				.from("signup_requests")
				.select("id, student_id, student_name, phone, password, academy, grade")
				.eq("id", body.id)
				.maybeSingle();

			if (fetchError || !signupData) {
				return NextResponse.json({ message: "신청 정보를 찾을 수 없습니다." }, { status: 404 });
			}

			const username = (signupData.student_id ?? "").trim() || `user_${Date.now()}`;
			const academy = (signupData.academy as string) || "-";
			const phone = String(signupData.phone ?? "").replace(/[-\s]/g, "") || "-";
			const gradeSnap = String(signupData.grade ?? "").trim() || null;

			const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
				.from("profiles")
				.select("id")
				.eq("username", username)
				.maybeSingle();

			if (existingProfileError) {
				return NextResponse.json({ message: "프로필 조회에 실패했습니다." }, { status: 500 });
			}

			let userId = (existingProfile as { id?: string } | null)?.id ?? null;

			if (userId) {
				const { error: profileUpdateError } = await supabaseAdmin
					.from("profiles")
					.update({
						is_approved: true,
						name: signupData.student_name as string,
						academy,
						phone,
						signup_grade: gradeSnap,
					})
					.eq("id", userId);

				if (profileUpdateError) {
					return NextResponse.json({ message: "프로필 승인 처리에 실패했습니다." }, { status: 500 });
				}
			} else {
				const legacyPassword = String(signupData.password ?? "").trim();
				if (!legacyPassword) {
					return NextResponse.json(
						{ message: "미승인 프로필을 찾을 수 없습니다. 신청자가 다시 가입 신청을 해야 합니다." },
						{ status: 409 },
					);
				}

				const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
					email: studentEmailFromUsername(username),
					password: legacyPassword,
					email_confirm: true,
				});

				if (createError || !created.user) {
					const raw = createError?.message ?? "Auth 계정 생성에 실패했습니다.";
					const isKeyIssue =
						raw.toLowerCase().includes("not allowed") ||
						raw.toLowerCase().includes("jwt") ||
						raw.includes("401");
					const hint = isKeyIssue
						? " 서버 .env 의 SUPABASE_SERVICE_ROLE_KEY(service_role)가 올바른지 확인해 주세요. anon 키로는 관리자 승인이 불가능합니다."
						: "";
					return NextResponse.json({ message: `${raw}${hint}` }, { status: 500 });
				}

				userId = created.user.id;

				const { error: profileError } = await supabaseAdmin.from("profiles").insert({
					id: userId,
					username,
					name: signupData.student_name as string,
					academy,
					phone,
					is_approved: true,
					signup_grade: gradeSnap,
					target_university: null,
					target_department: null,
				});

				if (profileError) {
					await supabaseAdmin.auth.admin.deleteUser(userId);
					return NextResponse.json(
						{
							message: "프로필 생성에 실패했습니다.",
							detail: profileError.message,
							code: profileError.code,
						},
						{ status: 500 },
					);
				}
			}

			const { error: updateError } = await supabaseAdmin
				.from("signup_requests")
				.update({ status: "승인", admin_note: (body.adminNote ?? "").trim() || null })
				.eq("id", body.id);

			if (updateError) {
				return NextResponse.json({ message: "신청 상태 업데이트에 실패했습니다." }, { status: 500 });
			}

			void logAdminAction(request, {
				action: "signup.approve",
				detail: { requestId: body.id, studentId: username, studentName: signupData.student_name },
			});
			return NextResponse.json({
				ok: true,
				studentId: username,
				studentName: signupData.student_name,
				phone: signupData.phone,
			});
		}

		if (body.action === "reject") {
			const { error } = await supabaseAdmin
				.from("signup_requests")
				.update({ status: "거절", admin_note: (body.adminNote ?? "").trim() || null })
				.eq("id", body.id);

			if (error) {
				return NextResponse.json({ message: "신청 거절 처리에 실패했습니다." }, { status: 500 });
			}

			void logAdminAction(request, { action: "signup.reject", detail: { requestId: body.id } });
			return NextResponse.json({ ok: true });
		}

		return NextResponse.json({ message: "요청 파라미터가 올바르지 않습니다." }, { status: 400 });
	} catch {
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

		const { error } = await supabaseAdmin.from("signup_requests").delete().eq("id", body.id);

		if (error) {
			return NextResponse.json({ message: "신청 삭제에 실패했습니다." }, { status: 500 });
		}

		void logAdminAction(request, { action: "signup.delete", detail: { requestId: body.id } });
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
