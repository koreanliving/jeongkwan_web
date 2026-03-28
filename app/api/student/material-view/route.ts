import { NextRequest, NextResponse } from "next/server";
import { getStudentSession } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

export async function POST(request: NextRequest) {
	const session = await getStudentSession(request);
	if (!session) {
		return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { materialId?: unknown };
		const materialId = Number(body.materialId);
		if (!Number.isInteger(materialId) || materialId <= 0) {
			return NextResponse.json({ message: "자료 ID가 올바르지 않습니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("student_material_views").upsert(
			{
				student_id: session.userId,
				material_id: materialId,
				viewed_at: new Date().toISOString(),
			},
			{ onConflict: "student_id,material_id" },
		);

		if (error) {
			return NextResponse.json({ message: "열람 기록을 저장하지 못했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
