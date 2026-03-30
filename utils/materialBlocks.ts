/**
 * 학습 자료 본문을 "블록 배열"로 표현하기 위한 타입 정의입니다.
 *
 * DB의 `materials.content` 컬럼에 JSON 문자열로 저장할 수 있으며,
 * 레거시( [원문] / [해설] 텍스트 )는 파서에서 자동으로 text 블록들로 변환합니다.
 *
 * ── 향후 확장 ─────────────────────────────────────────
 * 같은 패턴으로 아래 타입을 추가하면 됩니다.
 *   export type MaterialFormulaBlock = { type: "formula"; latex: string };
 *   export type MaterialTableBlock = { type: "table"; headers: string[]; rows: string[][] };
 * 그다음 `MaterialBlock` 유니온에 합치고, 렌더러 switch에 case만 추가합니다.
 */

/** 본문 안의 일반 텍스트(문장). 읽기 연습에서는 commentary가 툴팁(해설)에 쓰입니다. */
export type MaterialTextBlock = {
	type: "text";
	content: string;
	/** 선택. 있으면 기본 스타일 카드 하단 설명 + 읽기 연습 하단 패널에 표시 */
	commentary?: string;
};

/** 이미지 한 장. url은 https URL 또는 Supabase Storage 객체 경로(버킷 내 상대경로) 모두 가능 */
export type MaterialImageBlock = {
	type: "image";
	url: string;
	/** 접근성용 대체 텍스트 (선택) */
	alt?: string;
};

/**
 * 현재 지원하는 모든 블록 타입의 합집합.
 * (formula / table 등을 추가할 때 여기에 | 로 이어 붙이면 됩니다.)
 */
export type MaterialBlock = MaterialTextBlock | MaterialImageBlock;

/**
 * 권장 JSON 루트 형태(객체).
 * - blocks: 화면에 순서대로 그릴 블록들
 * - summary: 선택. 기존과 동일한 "[학생용 소재 요약본]..." 원문을 통째로 넣으면 요약 파서가 처리합니다.
 */
export type MaterialContentDocument = {
	version?: number;
	blocks: MaterialBlock[];
	summary?: string;
};

/** JSON 최상위가 배열인 경우: 이 배열을 blocks로 간주합니다. */
export type MaterialContentDocumentShorthand = MaterialBlock[];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

/**
 * 한 개의 JSON 값이 유효한 MaterialBlock인지 검사하고, 아니면 null.
 * (초보자용: 런타임에서 형식이 틀려도 앱 전체가 죽지 않게 방어합니다.)
 */
export function parseOneBlock(raw: unknown): MaterialBlock | null {
	if (!isRecord(raw)) return null;
	const t = raw.type;
	if (t === "text") {
		if (!isNonEmptyString(raw.content)) return null;
		const commentary =
			raw.commentary === undefined || raw.commentary === null
				? undefined
				: typeof raw.commentary === "string"
					? raw.commentary
					: undefined;
		return { type: "text", content: raw.content.trim(), commentary };
	}
	if (t === "image") {
		if (!isNonEmptyString(raw.url)) return null;
		const alt = typeof raw.alt === "string" ? raw.alt : undefined;
		return { type: "image", url: raw.url.trim(), alt };
	}
	/* 알 수 있는 미래 타입은 여기서 처리. 아직 없으면 null */
	return null;
}

/**
 * `materials.content`가 JSON 블록 형식인지 1차 판별 (시작 문자만 봄).
 */
export function looksLikeJsonMaterialContent(raw: string): boolean {
	const s = raw.trim();
	return s.startsWith("{") || s.startsWith("[");
}

/**
 * JSON 문자열을 파싱해 blocks 배열(+선택 summary)을 꺼냅니다.
 * 실패 시 null → 이때만 레거시 [원문] 텍스트 파서로 넘깁니다.
 *
 * 주의: `[]` 나 `{ "blocks": [] }` 처럼 "의도된 JSON 자료"이지만 블록이 비어 있으면
 * 그대로 빈 배열을 반환합니다. (전체 문자열이 한 덩어리 원문으로 오인되지 않게 하기 위함)
 */
export function tryParseMaterialBlocksJson(raw: string): { blocks: MaterialBlock[]; summary?: string } | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed) as unknown;
	} catch {
		return null;
	}

	/* 형태 A: 최상위가 배열 → 전체를 blocks 로 간주 */
	if (Array.isArray(parsed)) {
		const blocks = parsed.map(parseOneBlock).filter((b): b is MaterialBlock => b !== null);
		return { blocks };
	}

	if (!isRecord(parsed)) return null;

	/* 형태 B: { "blocks": [...], "summary"?: "..." } */
	if (Array.isArray(parsed.blocks)) {
		const blocks = parsed.blocks.map(parseOneBlock).filter((b): b is MaterialBlock => b !== null);
		const summary = typeof parsed.summary === "string" ? parsed.summary : undefined;
		return { blocks, summary };
	}

	return null;
}
