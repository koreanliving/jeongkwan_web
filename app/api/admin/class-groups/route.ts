import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/studentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { isValidUuid } from "@/utils/uuidValidation";

export type ClassGroupAdminRow = {
	id: number;
	name: string;
	description: string | null;
	created_at: string;
	updated_at: string;
	student_ids: string[];
};

async function loadGroupsWithStudents(): Promise<{ ok: true; groups: ClassGroupAdminRow[] } | { ok: false; message: string }> {
	const [groupsRes, linksRes] = await Promise.all([
		supabaseAdmin.from("class_groups").select("id, name, description, created_at, updated_at").order("id", { ascending: true }),
		supabaseAdmin.from("class_group_students").select("group_id, student_id"),
	]);

	if (groupsRes.error) {
		return { ok: false, message: groupsRes.error.message };
	}
	if (linksRes.error) {
		return { ok: false, message: linksRes.error.message };
	}

	const byGroup = new Map<number, string[]>();
	for (const row of linksRes.data ?? []) {
		const gid = Number((row as { group_id: number }).group_id);
		const sid = String((row as { student_id: string }).student_id);
		if (!byGroup.has(gid)) byGroup.set(gid, []);
		byGroup.get(gid)!.push(sid);
	}

	const groups = (groupsRes.data ?? []) as Omit<ClassGroupAdminRow, "student_ids">[];
	return {
		ok: true,
		groups: groups.map((g) => ({
			...g,
			student_ids: byGroup.get(g.id) ?? [],
		})),
	};
}

export async function GET(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const result = await loadGroupsWithStudents();
	if (!result.ok) {
		return NextResponse.json({ message: "수업반 목록을 불러오지 못했습니다.", detail: result.message }, { status: 500 });
	}

	return NextResponse.json({ groups: result.groups });
}

export async function POST(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { name?: string; description?: string | null };
		const name = (body.name ?? "").trim();
		if (!name) {
			return NextResponse.json({ message: "수업반 이름을 입력해 주세요." }, { status: 400 });
		}

		const description = (body.description ?? "").trim() || null;

		const { data, error } = await supabaseAdmin
			.from("class_groups")
			.insert({ name, description })
			.select("id, name, description, created_at, updated_at")
			.single();

		if (error || !data) {
			return NextResponse.json({ message: "수업반 생성에 실패했습니다.", detail: error?.message }, { status: 500 });
		}

		const row = data as ClassGroupAdminRow;
		return NextResponse.json({ group: { ...row, student_ids: [] as string[] } });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function PATCH(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			id?: number;
			name?: string;
			description?: string | null;
			studentIds?: string[];
		};

		const id = typeof body.id === "number" ? body.id : Number(body.id);
		if (!Number.isInteger(id) || id < 1) {
			return NextResponse.json({ message: "유효한 수업반 ID가 필요합니다." }, { status: 400 });
		}

		const hasMeta = body.name !== undefined || body.description !== undefined;
		const hasStudents = body.studentIds !== undefined;

		if (!hasMeta && !hasStudents) {
			return NextResponse.json({ message: "수정할 값이 없습니다." }, { status: 400 });
		}

		if (hasMeta) {
			const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
			if (body.name !== undefined) {
				const name = String(body.name).trim();
				if (!name) {
					return NextResponse.json({ message: "수업반 이름은 비울 수 없습니다." }, { status: 400 });
				}
				patch.name = name;
			}
			if (body.description !== undefined) {
				patch.description = body.description === null ? null : String(body.description).trim() || null;
			}
			const { error } = await supabaseAdmin.from("class_groups").update(patch).eq("id", id);
			if (error) {
				return NextResponse.json({ message: "수업반 정보 수정에 실패했습니다.", detail: error.message }, { status: 500 });
			}
		}

		if (hasStudents) {
			const raw = Array.isArray(body.studentIds) ? body.studentIds : [];
			const ids = [...new Set(raw.map((x) => String(x)))];
			for (const sid of ids) {
				if (!isValidUuid(sid)) {
					return NextResponse.json({ message: "학생 ID(UUID) 형식이 올바르지 않습니다." }, { status: 400 });
				}
			}

			const { error: delErr } = await supabaseAdmin.from("class_group_students").delete().eq("group_id", id);
			if (delErr) {
				return NextResponse.json({ message: "기존 반 소속을 비우지 못했습니다.", detail: delErr.message }, { status: 500 });
			}

			if (ids.length > 0) {
				const rows = ids.map((student_id) => ({ group_id: id, student_id }));
				const { error: insErr } = await supabaseAdmin.from("class_group_students").insert(rows);
				if (insErr) {
					return NextResponse.json(
						{ message: "반 소속 학생 저장에 실패했습니다. 학생 프로필이 존재하는지 확인해 주세요.", detail: insErr.message },
						{ status: 500 },
					);
				}
			}
		}

		const refreshed = await loadGroupsWithStudents();
		if (!refreshed.ok) {
			return NextResponse.json({ ok: true, message: "저장되었으나 목록을 다시 불러오지 못했습니다." });
		}
		const group = refreshed.groups.find((g) => g.id === id);
		return NextResponse.json({ ok: true, group: group ?? null, groups: refreshed.groups });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	if (!isAdminRequest(request)) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { id?: number };
		const id = typeof body.id === "number" ? body.id : Number(body.id);
		if (!Number.isInteger(id) || id < 1) {
			return NextResponse.json({ message: "삭제할 수업반 ID가 필요합니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("class_groups").delete().eq("id", id);
		if (error) {
			return NextResponse.json({ message: "수업반 삭제에 실패했습니다.", detail: error.message }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
