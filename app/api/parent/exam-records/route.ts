import { NextRequest, NextResponse } from "next/server";
import { getExamRecordsForStudent } from "@/utils/examRecordsMemos";
import { getParentSession } from "@/utils/server/parentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

/**
 * 학부모: 연결된 자녀의 누적 성적 조회 전용 (읽기)
 */
export async function GET(request: NextRequest) {
	const session = await getParentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	const result = await getExamRecordsForStudent(supabaseAdmin, session.linkedStudentId);
	if (result.error) {
		return NextResponse.json({ message: result.error }, { status: 500 });
	}

	return NextResponse.json({ records: result.data });
}
