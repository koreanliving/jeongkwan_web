import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { studentEmailFromUsername } from "@/utils/studentAuthEmail";

const academies = ["서정학원", "다올105", "라파에듀", "입시왕"];

function isValidAcademy(value: string): boolean {
	return academies.includes(value);
}

export async function POST(request: Request) {
	let body: {
		studentId?: string;
		password?: string;
		studentName?: string;
		academy?: string;
		phone?: string;
		grade?: string;
		recentTest?: string | null;
		recentGrade?: string | null;
		selectedSubject?: string | null;
	};

	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json({ message: "요청 형식이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해 주세요." }, { status: 400 });
	}

	try {

		const studentId = (body.studentId ?? "").trim();
		const password = (body.password ?? "").trim();
		const studentName = (body.studentName ?? "").trim();
		const academy = (body.academy ?? "").trim();
		const phone = (body.phone ?? "").trim();
		const normalizedPhone = phone.replace(/[-\s]/g, "");
		const grade = (body.grade ?? "").trim();

		if (!studentId || !password || !studentName || !academy || !phone || !grade) {
			return NextResponse.json(
				{ message: "필수 입력란을 확인해 주세요." },
				{ status: 400 }
			);
		}

		if (!isValidAcademy(academy)) {
			return NextResponse.json(
				{ message: "선택한 학원이 올바르지 않습니다." },
				{ status: 400 }
			);
		}

		if (!/^[a-zA-Z0-9_]{4,20}$/.test(studentId)) {
			return NextResponse.json(
				{ message: "아이디는 영문/숫자/_ 조합 4~20자로 입력해 주세요." },
				{ status: 400 }
			);
		}

		if (!/^\d{10,11}$/.test(normalizedPhone)) {
			return NextResponse.json(
				{ message: "연락처 형식이 올바르지 않습니다." },
				{ status: 400 }
			);
		}

		if (password.length < 6) {
			return NextResponse.json(
				{ message: "비밀번호는 6자 이상이어야 합니다." },
				{ status: 400 }
			);
		}

		const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
			email: studentEmailFromUsername(studentId),
			password,
			email_confirm: true,
		});

		if (createError || !created.user) {
			const message = createError?.message ?? "계정 생성에 실패했습니다.";
			const status = message.toLowerCase().includes("already") || message.includes("already registered") ? 409 : 500;
			return NextResponse.json(
				{ message: status === 409 ? "이미 사용 중인 아이디입니다. 다른 아이디로 다시 시도해 주세요." : message },
				{ status },
			);
		}

		const userId = created.user.id;
		const { error: profileError } = await supabaseAdmin.from("profiles").insert({
			id: userId,
			username: studentId,
			name: studentName,
			academy,
			phone: normalizedPhone,
			is_approved: false,
			signup_grade: grade,
			target_university: null,
			target_department: null,
		});

		if (profileError) {
			await supabaseAdmin.auth.admin.deleteUser(userId);
			const status = profileError.code === "23505" ? 409 : 500;
			return NextResponse.json(
				{
					message:
						status === 409
							? "이미 사용 중인 아이디입니다. 다른 아이디로 다시 시도해 주세요."
							: "프로필 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
				},
				{ status },
			);
		}

		const { error } = await supabaseAdmin.from("signup_requests").insert({
			student_id: studentId,
			student_name: studentName,
			academy,
			phone: normalizedPhone,
			grade,
			recent_test: (body.recentTest ?? "").trim() || null,
			recent_grade: (body.recentGrade ?? "").trim() || null,
			selected_subject: (body.selectedSubject ?? "").trim() || null,
		});

		if (error) {
			await supabaseAdmin.from("profiles").delete().eq("id", userId);
			await supabaseAdmin.auth.admin.deleteUser(userId);
			if (error.code === "42703") {
				return NextResponse.json(
					{ message: "DB 컬럼이 최신이 아닙니다. 관리자에게 마이그레이션 실행을 요청해 주세요." },
					{ status: 500 }
				);
			}

			if (error.code === "23505") {
				return NextResponse.json(
					{ message: "이미 사용 중인 아이디이거나 중복된 요청입니다. 다른 아이디로 다시 시도해 주세요." },
					{ status: 409 }
				);
			}

			return NextResponse.json(
				{ message: "가입 신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
				{ status: 500 }
			);
		}

		return NextResponse.json({ ok: true });
	} catch (e) {
		const msg = e instanceof Error ? e.message : "";
		if (msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
			return NextResponse.json(
				{
					message:
						"서버에 Supabase 설정이 없습니다. 배포(예: Vercel) 환경 변수에 SUPABASE_SERVICE_ROLE_KEY(service_role)와 NEXT_PUBLIC_SUPABASE_URL을 등록했는지 확인해 주세요.",
				},
				{ status: 503 },
			);
		}
		console.error("[api/auth/signup]", e);
		return NextResponse.json(
			{ message: "가입 신청 처리 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
			{ status: 500 },
		);
	}
}
