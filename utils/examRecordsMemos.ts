import type { SupabaseClient } from "@supabase/supabase-js";
import {
	EXAM_KIND_OTHER,
	type ExamKind,
	formatExamDisplayName,
	isValidExamKind,
	isValidIsoDateOnly,
} from "@/utils/examKinds";
import { isValidUuid } from "@/utils/uuidValidation";

/** DB가 student_id 를 bigint 로 두고 있을 때 Postgres 오류를 한글 안내로 보강합니다. */
function formatExamMemoDbError(raw: string | undefined, fallback: string): string {
	const msg = raw || fallback;
	if (/bigint/i.test(msg) && /invalid input syntax/i.test(msg)) {
		return `${msg} — DB의 exam_records·memos.student_id 가 아직 정수(bigint)일 수 있습니다. Supabase에서 db/migrate_exam_memos_student_id_to_uuid.sql 을 실행해 uuid(profiles.id)로 맞추세요.`;
	}
	return msg;
}

export type ExamRecord = {
	id: number;
	student_id: string;
	/** 표시용(기존 호환). `formatExamDisplayName(exam_kind, exam_detail)` 과 동일 목적 */
	exam_name: string;
	exam_kind: string;
	exam_detail: string | null;
	/** YYYY-MM-DD */
	exam_date: string;
	score: number;
	grade: number;
	created_at: string;
};

export type Memo = {
	id: number;
	student_id: string;
	content: string;
	created_at: string;
};

export type CreateExamRecordInput = {
	studentId: string;
	examKind: ExamKind;
	/** `사설/기타`일 때 필수 */
	examDetail: string | null;
	/** YYYY-MM-DD */
	examDate: string;
	score: number;
	grade: number;
};

export type CreateMemoInput = {
	studentId: string;
	content: string;
};

type Ok<T> = { data: T; error: null };
type Err = { data: null; error: string };
export type ExamRecordsQueryResult = Ok<ExamRecord[]> | Err;
export type ExamRecordInsertResult = Ok<ExamRecord> | Err;
export type ExamRecordUpdateResult = Ok<ExamRecord> | Err;
export type MemosQueryResult = Ok<Memo[]> | Err;
export type MemoInsertResult = Ok<Memo> | Err;

function invalidStudentIdError(): Err {
	return { data: null, error: "유효한 학생 ID가 아닙니다." };
}

function mapExamRecord(row: Record<string, unknown>): ExamRecord {
	const examKindRaw = row.exam_kind;
	const examKind =
		typeof examKindRaw === "string" && examKindRaw.trim() ? examKindRaw.trim() : EXAM_KIND_OTHER;
	const detailRaw = row.exam_detail;
	const examDetail =
		detailRaw != null && String(detailRaw).trim() ? String(detailRaw).trim() : null;
	const dateRaw = row.exam_date;
	let examDate =
		typeof dateRaw === "string" && dateRaw.length >= 10 ? dateRaw.slice(0, 10) : "";
	if (!examDate && row.created_at) {
		examDate = String(row.created_at).slice(0, 10);
	}
	const display = formatExamDisplayName(examKind, examDetail);
	const legacyName = String(row.exam_name ?? "").trim();
	const exam_name = legacyName || display;

	return {
		id: Number(row.id),
		student_id: String(row.student_id ?? ""),
		exam_name,
		exam_kind: examKind,
		exam_detail: examDetail,
		exam_date: examDate,
		score: Number(row.score),
		grade: Number(row.grade),
		created_at: String(row.created_at ?? ""),
	};
}

function mapMemo(row: Record<string, unknown>): Memo {
	return {
		id: Number(row.id),
		student_id: String(row.student_id ?? ""),
		content: String(row.content ?? ""),
		created_at: String(row.created_at ?? ""),
	};
}

/**
 * 특정 학생(profiles.id / auth user id)의 성적 기록을 최신순으로 조회합니다.
 */
export async function getExamRecordsForStudent(
	client: SupabaseClient,
	studentId: string,
): Promise<ExamRecordsQueryResult> {
	if (!isValidUuid(studentId)) {
		return invalidStudentIdError();
	}

	const { data, error } = await client
		.from("exam_records")
		.select("id, student_id, exam_name, exam_kind, exam_detail, exam_date, score, grade, created_at")
		.eq("student_id", studentId)
		.order("exam_date", { ascending: false, nullsFirst: false })
		.order("created_at", { ascending: false });

	if (error) {
		if (error.code === "42703" || error.message?.includes("exam_kind") || error.message?.includes("exam_date")) {
			return {
				data: null,
				error:
					"성적 테이블 스키마가 최신이 아닙니다. Supabase에서 db/exam_records_exam_kind_date.sql 을 실행해 주세요.",
			};
		}
		return { data: null, error: formatExamMemoDbError(error.message, "성적 기록을 불러오지 못했습니다.") };
	}

	const rows = (data ?? []) as Record<string, unknown>[];
	return { data: rows.map(mapExamRecord), error: null };
}

/**
 * 학생에게 성적 기록을 추가합니다.
 */
export async function addExamRecord(client: SupabaseClient, input: CreateExamRecordInput): Promise<ExamRecordInsertResult> {
	const { studentId, examKind, examDetail, examDate, score, grade } = input;

	if (!isValidUuid(studentId)) {
		return invalidStudentIdError();
	}

	if (!isValidExamKind(examKind)) {
		return { data: null, error: "시험 종류를 선택해 주세요." };
	}
	if (examKind === EXAM_KIND_OTHER) {
		const d = (examDetail ?? "").trim();
		if (!d) {
			return { data: null, error: "사설/기타 선택 시 상세 시험 이름을 입력해 주세요." };
		}
	}
	if (!isValidIsoDateOnly(examDate)) {
		return { data: null, error: "응시일을 선택해 주세요." };
	}
	if (!Number.isInteger(score)) {
		return { data: null, error: "점수는 정수여야 합니다." };
	}
	if (!Number.isInteger(grade)) {
		return { data: null, error: "등급은 정수여야 합니다." };
	}

	const detailForDb = examKind === EXAM_KIND_OTHER ? (examDetail ?? "").trim() : null;
	const displayName = formatExamDisplayName(examKind, detailForDb);

	const { data, error } = await client
		.from("exam_records")
		.insert({
			student_id: studentId,
			exam_kind: examKind,
			exam_detail: detailForDb,
			exam_date: examDate,
			exam_name: displayName,
			score,
			grade,
		})
		.select("id, student_id, exam_name, exam_kind, exam_detail, exam_date, score, grade, created_at")
		.single();

	if (error) {
		if (error.code === "42703" || error.message?.includes("exam_kind") || error.message?.includes("exam_date")) {
			return {
				data: null,
				error:
					"성적 테이블 스키마가 최신이 아닙니다. Supabase에서 db/exam_records_exam_kind_date.sql 을 실행해 주세요.",
			};
		}
		return { data: null, error: formatExamMemoDbError(error.message, "성적 추가에 실패했습니다.") };
	}
	if (!data) {
		return { data: null, error: "성적 추가 후 데이터를 확인할 수 없습니다." };
	}

	return { data: mapExamRecord(data as Record<string, unknown>), error: null };
}

export type UpdateExamRecordInput = {
	examKind: ExamKind;
	examDetail: string | null;
	examDate: string;
	score: number;
	grade: number;
};

/**
 * 성적 한 건 수정
 */
export async function updateExamRecord(
	client: SupabaseClient,
	recordId: number,
	input: UpdateExamRecordInput,
): Promise<ExamRecordUpdateResult> {
	if (!Number.isInteger(recordId) || recordId < 1) {
		return { data: null, error: "유효한 성적 ID가 아닙니다." };
	}

	if (!isValidExamKind(input.examKind)) {
		return { data: null, error: "시험 종류를 선택해 주세요." };
	}
	if (input.examKind === EXAM_KIND_OTHER) {
		const d = (input.examDetail ?? "").trim();
		if (!d) {
			return { data: null, error: "사설/기타 선택 시 상세 시험 이름을 입력해 주세요." };
		}
	}
	if (!isValidIsoDateOnly(input.examDate)) {
		return { data: null, error: "응시일을 선택해 주세요." };
	}
	if (!Number.isInteger(input.score)) {
		return { data: null, error: "점수는 정수여야 합니다." };
	}
	if (!Number.isInteger(input.grade)) {
		return { data: null, error: "등급은 정수여야 합니다." };
	}

	const detailForDb = input.examKind === EXAM_KIND_OTHER ? (input.examDetail ?? "").trim() : null;
	const displayName = formatExamDisplayName(input.examKind, detailForDb);

	const { data, error } = await client
		.from("exam_records")
		.update({
			exam_kind: input.examKind,
			exam_detail: detailForDb,
			exam_date: input.examDate,
			exam_name: displayName,
			score: input.score,
			grade: input.grade,
		})
		.eq("id", recordId)
		.select("id, student_id, exam_name, exam_kind, exam_detail, exam_date, score, grade, created_at")
		.single();

	if (error) {
		if (error.code === "42703" || error.message?.includes("exam_kind") || error.message?.includes("exam_date")) {
			return {
				data: null,
				error:
					"성적 테이블 스키마가 최신이 아닙니다. Supabase에서 db/exam_records_exam_kind_date.sql 을 실행해 주세요.",
			};
		}
		return { data: null, error: formatExamMemoDbError(error.message, "성적 수정에 실패했습니다.") };
	}
	if (!data) {
		return { data: null, error: "수정할 성적을 찾을 수 없습니다." };
	}

	return { data: mapExamRecord(data as Record<string, unknown>), error: null };
}

/**
 * 성적 한 건 삭제
 */
export async function deleteExamRecord(client: SupabaseClient, recordId: number): Promise<{ error: string | null }> {
	if (!Number.isInteger(recordId) || recordId < 1) {
		return { error: "유효한 성적 ID가 아닙니다." };
	}

	const { error } = await client.from("exam_records").delete().eq("id", recordId);
	if (error) {
		return { error: formatExamMemoDbError(error.message, "성적 삭제에 실패했습니다.") };
	}
	return { error: null };
}

/**
 * 특정 학생(profiles.id)의 관리자 메모를 최신순으로 조회합니다.
 */
export async function getMemosForStudent(client: SupabaseClient, studentId: string): Promise<MemosQueryResult> {
	if (!isValidUuid(studentId)) {
		return invalidStudentIdError();
	}

	const { data, error } = await client
		.from("memos")
		.select("id, student_id, content, created_at")
		.eq("student_id", studentId)
		.order("created_at", { ascending: false });

	if (error) {
		return { data: null, error: formatExamMemoDbError(error.message, "메모를 불러오지 못했습니다.") };
	}

	const rows = (data ?? []) as Record<string, unknown>[];
	return { data: rows.map(mapMemo), error: null };
}

/**
 * 학생에게 관리자 메모를 추가합니다.
 */
export async function addMemo(client: SupabaseClient, input: CreateMemoInput): Promise<MemoInsertResult> {
	const { studentId, content } = input;

	if (!isValidUuid(studentId)) {
		return invalidStudentIdError();
	}

	const text = content.trim();
	if (!text) {
		return { data: null, error: "메모 내용을 입력해 주세요." };
	}

	const { data, error } = await client
		.from("memos")
		.insert({
			student_id: studentId,
			content: text,
		})
		.select("id, student_id, content, created_at")
		.single();

	if (error) {
		return { data: null, error: formatExamMemoDbError(error.message, "메모 추가에 실패했습니다.") };
	}
	if (!data) {
		return { data: null, error: "메모 추가 후 데이터를 확인할 수 없습니다." };
	}

	return { data: mapMemo(data as Record<string, unknown>), error: null };
}

/**
 * 관리자용: 메모 한 건 삭제
 */
export async function deleteMemo(client: SupabaseClient, memoId: number): Promise<{ error: string | null }> {
	if (!Number.isInteger(memoId) || memoId < 1) {
		return { error: "유효한 메모 ID가 아닙니다." };
	}

	const { error } = await client.from("memos").delete().eq("id", memoId);
	if (error) {
		return { error: formatExamMemoDbError(error.message, "메모 삭제에 실패했습니다.") };
	}
	return { error: null };
}
