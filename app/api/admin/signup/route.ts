import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const { data, error } = await supabaseAdmin
		.from("signup_requests")
		.select("id, student_name, academy, phone, grade, recent_test, recent_grade, selected_subject, status, admin_note, created_at, updated_at")
		.order("created_at", { ascending: false })
		.limit(500);

	if (error) {
		return NextResponse.json({ message: "가입신청 목록을 불러오지 못했습니다." }, { status: 500 });
	}

	return NextResponse.json({ signupRequests: data ?? [] });
}

export async function POST(request: NextRequest) {
	if (!isAdminRequest(request)) {
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
				.select("id, student_id, student_name, phone, password")
				.eq("id", body.id)
				.maybeSingle();

			if (fetchError || !signupData) {
				return NextResponse.json({ message: "신청 정보를 찾을 수 없습니다." }, { status: 404 });
			}

			const studentId = (signupData.student_id ?? '').trim() || `user_${Date.now()}`;
			const password = (signupData.password ?? '').trim() || randomUUID().slice(0, 8);

			const { error: insertError } = await supabaseAdmin.from("students").insert({
				student_id: studentId,
				name: signupData.student_name as string,
				password,
				is_active: true,
			});

			if (insertError) {
				return NextResponse.json({ message: "학생 계정 생성에 실패했습니다." }, { status: 500 });
			}

			const { error: updateError } = await supabaseAdmin
				.from("signup_requests")
				.update({ status: "승인", admin_note: (body.adminNote ?? "").trim() || null })
				.eq("id", body.id);

			if (updateError) {
				return NextResponse.json({ message: "신청 상태 업데이트에 실패했습니다." }, { status: 500 });
			}

			return NextResponse.json({
				ok: true,
				studentId,
				password,
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

			return NextResponse.json({ ok: true });
		}

		return NextResponse.json({ message: "요청 파라미터가 올바르지 않습니다." }, { status: 400 });
	} catch {
		return NextResponse.json({ message: "요청 처리 중 오류가 발생했습니다." }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	if (!isAdminRequest(request)) {
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

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
