import { NextRequest, NextResponse } from "next/server";
import { addExamRecord, getExamRecordsForStudent } from "@/utils/examRecordsMemos";
import { getStudentSession, isAdminRequest } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { isValidUuid } from "@/utils/uuidValidation";

function parseStudentIdParam(searchParams: URLSearchParams): string | null {
	const raw = searchParams.get("studentId");
	if (raw === null || raw === "") return null;
	const id = raw.trim();
	return isValidUuid(id) ? id : null;
}

export async function GET(request: NextRequest) {
	const admin = isAdminRequest(request);
	const session = await getStudentSession(request);
	let studentId = parseStudentIdParam(request.nextUrl.searchParams);

	if (studentId === null) {
		if (admin) {
			return NextResponse.json({ message: "유효한 studentId 쿼리가 필요합니다." }, { status: 400 });
		}
		if (session) {
			studentId = session.userId;
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
			examName?: unknown;
			score?: unknown;
			grade?: unknown;
		};

		const studentId = admin
			? typeof body.studentId === "string"
				? body.studentId.trim()
				: String(body.studentId ?? "").trim()
			: session!.userId;

		const examName = typeof body.examName === "string" ? body.examName : "";
		const score = typeof body.score === "number" ? body.score : Number(body.score);
		const grade = typeof body.grade === "number" ? body.grade : Number(body.grade);

		const result = await addExamRecord(supabaseAdmin, {
			studentId,
			examName,
			score,
			grade,
		});

		if (result.error) {
			const status = result.error.includes("유효한 학생") || result.error.includes("입력") ? 400 : 500;
			return NextResponse.json({ message: result.error }, { status });
		}

		return NextResponse.json({ record: result.data });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
