import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

const academies = ["서정학원", "다올105", "라파에듀", "입시왕"];

function isValidAcademy(value: string): boolean {
	return academies.includes(value);
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
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

		const { error } = await supabaseAdmin.from("signup_requests").insert({
			student_id: studentId,
			password,
			student_name: studentName,
			academy,
			phone: normalizedPhone,
			grade,
			recent_test: (body.recentTest ?? "").trim() || null,
			recent_grade: (body.recentGrade ?? "").trim() || null,
			selected_subject: (body.selectedSubject ?? "").trim() || null,
		});

		if (error) {
			if (error.code === "42703") {
				return NextResponse.json(
					{ message: "DB 컬럼이 최신이 아닙니다. 관리자에게 마이그레이션 실행을 요청해 주세요. (student_id, password)" },
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
	} catch {
		return NextResponse.json(
			{ message: "요청 데이터가 올바르지 않습니다." },
			{ status: 400 }
		);
	}
}
