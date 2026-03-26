import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

const academies = ["서정학원", "다올105", "라파에듀", "입시왕"];

function isValidAcademy(value: string): boolean {
	return academies.includes(value);
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			studentName?: string;
			academy?: string;
			phone?: string;
			grade?: string;
			recentTest?: string | null;
			recentGrade?: string | null;
			selectedSubject?: string | null;
		};

		const studentName = (body.studentName ?? "").trim();
		const academy = (body.academy ?? "").trim();
		const phone = (body.phone ?? "").trim();
		const grade = (body.grade ?? "").trim();

		if (!studentName || !academy || !phone || !grade) {
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

		if (!/^\d{10,11}$/.test(phone.replace(/[-\s]/g, ""))) {
			return NextResponse.json(
				{ message: "연락처 형식이 올바르지 않습니다." },
				{ status: 400 }
			);
		}

		const { error } = await supabaseAdmin.from("signup_requests").insert({
			student_name: studentName,
			academy,
			phone,
			grade,
			recent_test: (body.recentTest ?? "").trim() || null,
			recent_grade: (body.recentGrade ?? "").trim() || null,
			selected_subject: (body.selectedSubject ?? "").trim() || null,
		});

		if (error) {
			return NextResponse.json(
				{ message: "가입 신청 처리 중 오류가 발생했습니다." },
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
