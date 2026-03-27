/** 시험 종류(드롭다운). `사설/기타` 선택 시 `exam_detail` 필수. */
export const EXAM_KIND_OPTIONS = [
	"3월 학평",
	"4월 학평",
	"6월 모평",
	"7월 학평",
	"9월 모평",
	"10월 학평",
	"11월 수능",
	"사설/기타",
] as const;

export type ExamKind = (typeof EXAM_KIND_OPTIONS)[number];

export const EXAM_KIND_OTHER = "사설/기타" satisfies ExamKind;

const KIND_SET = new Set<string>(EXAM_KIND_OPTIONS);

export function isValidExamKind(value: string): value is ExamKind {
	return KIND_SET.has(value);
}

/** DB/레거시 값이 목록에 없으면 사설/기타로 편집 폼에 맞춤 */
export function normalizeExamKindForForm(stored: string): ExamKind {
	const t = stored.trim();
	if (isValidExamKind(t)) return t;
	return EXAM_KIND_OTHER;
}

/** 리스트·그래프·X축에 쓰는 표시 이름 */
export function formatExamDisplayName(examKind: string, examDetail: string | null | undefined): string {
	const kind = examKind.trim();
	if (kind === EXAM_KIND_OTHER) {
		const d = (examDetail ?? "").trim();
		return d || EXAM_KIND_OTHER;
	}
	return kind || EXAM_KIND_OTHER;
}

/** YYYY-MM-DD */
export function isValidIsoDateOnly(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00`));
}
