import { NextRequest, NextResponse } from "next/server";
import {
	addExamRecord,
	deleteExamRecord,
	getExamRecordsForStudent,
	updateExamRecord,
} from "@/utils/examRecordsMemos";
import { getStudentSession, isAdminRequest } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import type { ExamKind } from "@/utils/examKinds";
import { isValidUuid } from "@/utils/uuidValidation";

function parseStudentIdParam(searchParams: URLSearchParams): string | null {
	const raw = searchParams.get("studentId");
	if (raw === null || raw === "") return null;
	const id = raw.trim();
	return isValidUuid(id) ? id : null;
}

async function getExamRecordOwnerStudentId(recordId: number): Promise<string | null> {
	const { data, error } = await supabaseAdmin
		.from("exam_records")
		.select("student_id")
		.eq("id", recordId)
		.maybeSingle();
	if (error || !data) return null;
	return String((data as { student_id: string }).student_id);
}

async function assertExamRecordAccess(
	request: NextRequest,
	recordId: number,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
	const admin = isAdminRequest(request);
	const session = await getStudentSession(request);
	if (!admin && !session) {
		return { ok: false, response: NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 }) };
	}
	const ownerId = await getExamRecordOwnerStudentId(recordId);
	if (!ownerId) {
		return { ok: false, response: NextResponse.json({ message: "성적을 찾을 수 없습니다." }, { status: 404 }) };
	}
	if (!admin && session!.userId !== ownerId) {
		return { ok: false, response: NextResponse.json({ message: "권한이 없습니다." }, { status: 401 }) };
	}
	return { ok: true };
}

export async function GET(request: NextRequest) {
	const admin = isAdminRequest(request);
	const session = await getStudentSession(request);
	let studentId = parseStudentIdParam(request.nextUrl.searchParams);

	if (studentId === null) {
		// 관리자 쿠키가 있어도 마이페이지 등에서는 학생 세션으로 본인 성적을 봅니다.
		if (session) {
			studentId = session.userId;
		} else if (admin) {
			return NextResponse.json({ message: "유효한 studentId 쿼리가 필요합니다." }, { status: 400 });
		} else {
			return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
		}
	}

	if (!admin && (!session || session.userId !== studentId)) {
		return NextResponse.json({ message: "권한이 없습니다." }, { status: 401 });
	}

	const result = await getExamRecordsForStudent(supabaseAdmin, studentId);
	if (result.error) {
		return NextResponse.json({ message: result.error }, { status: 500 });
	}

	return NextResponse.json({ records: result.data });
}

export async function POST(request: NextRequest) {
	const admin = isAdminRequest(request);
	const session = await getStudentSession(request);

	if (!admin && !session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			studentId?: unknown;
			examKind?: unknown;
			examDetail?: unknown;
			examDate?: unknown;
			score?: unknown;
			grade?: unknown;
		};

		const rawStudentId =
			typeof body.studentId === "string" ? body.studentId.trim() : String(body.studentId ?? "").trim();

		let studentId: string;
		if (!admin) {
			studentId = session!.userId;
		} else if (rawStudentId) {
			if (!isValidUuid(rawStudentId)) {
				return NextResponse.json({ message: "유효한 studentId가 필요합니다." }, { status: 400 });
			}
			studentId = rawStudentId;
		} else if (session) {
			studentId = session.userId;
		} else {
			return NextResponse.json({ message: "유효한 studentId가 필요합니다." }, { status: 400 });
		}

		const examKind = typeof body.examKind === "string" ? body.examKind.trim() : "";
		const examDetail =
			body.examDetail === null || body.examDetail === undefined
				? null
				: typeof body.examDetail === "string"
					? body.examDetail
					: String(body.examDetail);
		const examDate = typeof body.examDate === "string" ? body.examDate.trim() : "";
		const score = typeof body.score === "number" ? body.score : Number(body.score);
		const grade = typeof body.grade === "number" ? body.grade : Number(body.grade);

		const result = await addExamRecord(supabaseAdmin, {
			studentId,
			examKind: examKind as ExamKind,
			examDetail,
			examDate,
			score,
			grade,
		});

		if (result.error) {
			const msg = result.error;
			const status =
				msg.includes("42703") || msg.includes("column")
					? 503
					: msg.includes("유효한 학생") || msg.includes("입력") || msg.includes("선택") || msg.includes("시험") || msg.includes("응시")
						? 400
						: 500;
			return NextResponse.json({ message: result.error }, { status });
		}

		return NextResponse.json({ record: result.data });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const body = (await request.json()) as {
			id?: unknown;
			examKind?: unknown;
			examDetail?: unknown;
			examDate?: unknown;
			score?: unknown;
			grade?: unknown;
		};
		const id = typeof body.id === "number" ? body.id : Number(body.id);
		if (!Number.isInteger(id) || id < 1) {
			return NextResponse.json({ message: "유효한 성적 ID가 필요합니다." }, { status: 400 });
		}

		const access = await assertExamRecordAccess(request, id);
		if (!access.ok) return access.response;

		const examKind = typeof body.examKind === "string" ? body.examKind.trim() : "";
		const examDetail =
			body.examDetail === null || body.examDetail === undefined
				? null
				: typeof body.examDetail === "string"
					? body.examDetail
					: String(body.examDetail);
		const examDate = typeof body.examDate === "string" ? body.examDate.trim() : "";
		const score = typeof body.score === "number" ? body.score : Number(body.score);
		const grade = typeof body.grade === "number" ? body.grade : Number(body.grade);

		const result = await updateExamRecord(supabaseAdmin, id, {
			examKind: examKind as ExamKind,
			examDetail,
			examDate,
			score,
			grade,
		});
		if (result.error) {
			const status = result.error.includes("유효한") || result.error.includes("입력") ? 400 : 500;
			return NextResponse.json({ message: result.error }, { status });
		}
		return NextResponse.json({ record: result.data });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const body = (await request.json()) as { id?: unknown };
		const id = typeof body.id === "number" ? body.id : Number(body.id);
		if (!Number.isInteger(id) || id < 1) {
			return NextResponse.json({ message: "유효한 성적 ID가 필요합니다." }, { status: 400 });
		}

		const access = await assertExamRecordAccess(request, id);
		if (!access.ok) return access.response;

		const result = await deleteExamRecord(supabaseAdmin, id);
		if (result.error) {
			const status = result.error.includes("유효한") ? 400 : 500;
			return NextResponse.json({ message: result.error }, { status });
		}
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
