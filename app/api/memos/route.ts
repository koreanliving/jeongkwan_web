import { NextRequest, NextResponse } from "next/server";
import { addMemo, deleteMemo, getMemosForStudent } from "@/utils/examRecordsMemos";
import { isAdminRequest } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { isValidUuid } from "@/utils/uuidValidation";

function parseStudentIdParam(searchParams: URLSearchParams): string | null {
	const raw = searchParams.get("studentId");
	if (raw === null || raw === "") return null;
	const id = raw.trim();
	return isValidUuid(id) ? id : null;
}

export async function GET(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const studentId = parseStudentIdParam(request.nextUrl.searchParams);
	if (studentId === null) {
		return NextResponse.json({ message: "유효한 studentId 쿼리가 필요합니다." }, { status: 400 });
	}

	const result = await getMemosForStudent(supabaseAdmin, studentId);
	if (result.error) {
		return NextResponse.json({ message: result.error }, { status: 500 });
	}

	return NextResponse.json({ memos: result.data });
}

export async function POST(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			studentId?: unknown;
			content?: unknown;
		};

		const studentId =
			typeof body.studentId === "string" ? body.studentId.trim() : String(body.studentId ?? "").trim();
		const content = typeof body.content === "string" ? body.content : String(body.content ?? "");

		if (!isValidUuid(studentId)) {
			return NextResponse.json({ message: "유효한 studentId가 필요합니다." }, { status: 400 });
		}

		const result = await addMemo(supabaseAdmin, {
			studentId,
			content,
		});

		if (result.error) {
			const status = result.error.includes("유효한 학생") || result.error.includes("입력") ? 400 : 500;
			return NextResponse.json({ message: result.error }, { status });
		}

		return NextResponse.json({ memo: result.data });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { id?: unknown };
		const raw = body.id;
		const id = typeof raw === "number" ? raw : Number(raw);
		const result = await deleteMemo(supabaseAdmin, id);
		if (result.error) {
			const status = result.error.includes("유효한") ? 400 : 500;
			return NextResponse.json({ message: result.error }, { status });
		}
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
