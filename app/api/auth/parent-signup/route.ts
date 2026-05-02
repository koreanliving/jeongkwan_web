import { NextResponse } from "next/server";
import { normalizeParentUsername } from "@/utils/parentAuthEmail";
import { hashParentPassword } from "@/utils/server/parentPassword";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

const academies = ["서정학원", "다올105", "라파에듀", "입시왕"];

function isValidAcademy(value: string): boolean {
	return academies.includes(value);
}

export async function POST(request: Request) {
	let body: {
		username?: string;
		password?: string;
		parentName?: string;
		phone?: string;
		studentName?: string;
		academy?: string;
	};

	try {
		body = (await request.json()) as typeof body;
	} catch {
		return NextResponse.json(
			{ message: "요청 형식이 올바르지 않습니다. 페이지를 새로고침 후 다시 시도해 주세요." },
			{ status: 400 },
		);
	}

	try {
		const usernameRaw = (body.username ?? "").trim();
		const username = normalizeParentUsername(usernameRaw);
		const password = (body.password ?? "").trim();
		const parentName = (body.parentName ?? "").trim();
		const academy = (body.academy ?? "").trim();
		const phone = (body.phone ?? "").trim();
		const normalizedPhone = phone.replace(/[-\s]/g, "");
		const studentName = (body.studentName ?? "").trim();

		if (!username || !password || !parentName || !academy || !phone || !studentName) {
			return NextResponse.json({ message: "필수 입력란을 확인해 주세요." }, { status: 400 });
		}

		if (!isValidAcademy(academy)) {
			return NextResponse.json({ message: "선택한 학원이 올바르지 않습니다." }, { status: 400 });
		}

		if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
			return NextResponse.json(
				{ message: "아이디는 영문/숫자/_ 조합 4~20자로 입력해 주세요." },
				{ status: 400 },
			);
		}

		if (!/^\d{10,11}$/.test(normalizedPhone)) {
			return NextResponse.json({ message: "연락처 형식이 올바르지 않습니다." }, { status: 400 });
		}

		if (password.length < 6) {
			return NextResponse.json({ message: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
		}

		const { data: existingParent, error: existingError } = await supabaseAdmin
			.from("parent_profiles")
			.select("id")
			.eq("username", username)
			.maybeSingle();

		if (existingError) {
			return NextResponse.json(
				{ message: "가입 신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
				{ status: 500 },
			);
		}

		if (existingParent) {
			return NextResponse.json(
				{ message: "이미 등록된 학부모 아이디입니다. 다른 아이디로 신청해 주세요." },
				{ status: 409 },
			);
		}

		const passwordHash = await hashParentPassword(password);

		const { error } = await supabaseAdmin.from("parent_signup_requests").insert({
			username,
			password: passwordHash,
			parent_name: parentName,
			phone: normalizedPhone,
			student_name: studentName,
			academy,
		});

		if (error) {
			if (error.code === "42703" || error.message?.includes("parent_signup_requests")) {
				return NextResponse.json(
					{
						message:
							"DB에 학부모 가입 테이블이 없습니다. 관리자에게 `db/parent_schema.sql` 실행을 요청해 주세요.",
					},
					{ status: 503 },
				);
			}

			if (error.code === "23505") {
				return NextResponse.json(
					{ message: "이미 승인 대기 중인 동일 아이디가 있습니다. 다른 아이디로 다시 시도해 주세요." },
					{ status: 409 },
				);
			}

			if (error.code === "23514") {
				return NextResponse.json(
					{ message: "아이디 형식이 올바르지 않습니다. 영문/숫자/_ 조합 4~20자로 입력해 주세요." },
					{ status: 400 },
				);
			}

			return NextResponse.json(
				{ message: "가입 신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
				{ status: 500 },
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
		console.error("[api/auth/parent-signup]", e);
		return NextResponse.json(
			{ message: "가입 신청 처리 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
			{ status: 500 },
		);
	}
}
