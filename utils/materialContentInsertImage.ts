/**
 * 관리자 본문(JSON) 편집기에서 "커서 위치"에 image 블록을 끼워 넣을 때 사용합니다.
 * blocks 배열 앞쪽에서 `{ ... }` 객체 단위로 세어, 커서보다 앞에 완성된 객체가 몇 개인지로 삽입 인덱스를 정합니다.
 */

function findMatchingBracket(s: string, openBracketIdx: number): number {
	if (s[openBracketIdx] !== "[") return -1;
	let depth = 0;
	let inStr = false;
	let esc = false;
	for (let i = openBracketIdx; i < s.length; i++) {
		const ch = s[i];
		if (inStr) {
			if (esc) esc = false;
			else if (ch === "\\") esc = true;
			else if (ch === '"') inStr = false;
			continue;
		}
		if (ch === '"') {
			inStr = true;
			continue;
		}
		if (ch === "[") depth++;
		else if (ch === "]") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

function findMatchingBrace(s: string, openBraceIdx: number): number {
	if (s[openBraceIdx] !== "{") return -1;
	let depth = 0;
	let inStr = false;
	let esc = false;
	for (let i = openBraceIdx; i < s.length; i++) {
		const ch = s[i];
		if (inStr) {
			if (esc) esc = false;
			else if (ch === "\\") esc = true;
			else if (ch === '"') inStr = false;
			continue;
		}
		if (ch === '"') {
			inStr = true;
			continue;
		}
		if (ch === "{") depth++;
		else if (ch === "}") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

/**
 * 본문 문자열에서 `blocks` 배열의 `[` 위치와 짝이 맞는 `]` 위치를 찾습니다.
 * - 최상위가 배열이면 그 배열 전체
 * - 객체면 "blocks": [ ... ] 구간
 */
export function findMaterialBlocksArrayBounds(raw: string): { start: number; end: number } | null {
	const t = raw;
	const lt = t.trimStart();
	const trimLead = t.length - lt.length;
	if (lt.startsWith("[")) {
		const i = trimLead + lt.indexOf("[");
		const j = findMatchingBracket(t, i);
		return j >= 0 ? { start: i, end: j } : null;
	}
	const re = /"blocks"\s*:\s*\[/;
	const m = re.exec(t);
	if (!m) return null;
	const start = m.index + m[0].length - 1;
	const end = findMatchingBracket(t, start);
	return end >= 0 ? { start, end } : null;
}

/** blocks 배열 안에서, cursor 이전에 완성된 최상위 `{ ... }` 객체 개수 = 삽입 인덱스 */
function countTopLevelObjectsInArrayPrefix(s: string, arrayOpenIdx: number, exclusiveEnd: number): number {
	let i = arrayOpenIdx + 1;
	let count = 0;
	const end = Math.min(exclusiveEnd, s.length);
	while (i < end) {
		while (i < end && /\s/.test(s[i])) i++;
		if (i >= end) break;
		if (s[i] === "]") break;
		if (s[i] !== "{") {
			i++;
			continue;
		}
		const close = findMatchingBrace(s, i);
		if (close < 0 || close > end) break;
		count++;
		i = close + 1;
		while (i < end && /\s/.test(s[i])) i++;
		if (i < end && s[i] === ",") i++;
	}
	return count;
}

export type MaterialJsonDocument = { blocks: unknown[]; summary?: string; version?: number };

/** 문자열이 파싱 가능한 JSON 문서(배열 또는 { blocks })인지 */
export function tryParseMaterialJsonDocument(raw: string): MaterialJsonDocument | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return null;
	}
	if (Array.isArray(parsed)) {
		return { blocks: parsed };
	}
	if (parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).blocks)) {
		const o = parsed as Record<string, unknown>;
		return {
			blocks: [...(o.blocks as unknown[])],
			summary: typeof o.summary === "string" ? o.summary : undefined,
			version: typeof o.version === "number" ? o.version : undefined,
		};
	}
	return null;
}

/**
 * 스토리지에 올린 이미지 경로로 `blocks`에 image 항목을 끼워 넣고, 예쁘게 들여쓴 JSON 문자열로 돌려줍니다.
 * - 커서가 blocks 배열 밖이면 맨 뒤에 추가합니다.
 * - 레거시 [원문] 텍스트 등 JSON이 아니면 null.
 */
export function insertMaterialImageIntoJson(
	content: string,
	cursor: number,
	imageStoragePath: string,
	alt = "",
): string | null {
	const trimmed = content.trim();
	let parsedRoot: unknown;
	try {
		parsedRoot = JSON.parse(trimmed);
	} catch {
		return null;
	}

	const doc = tryParseMaterialJsonDocument(content);
	if (!doc) return null;

	const bounds = findMaterialBlocksArrayBounds(content);
	let insertAt = doc.blocks.length;
	if (bounds && cursor >= bounds.start && cursor <= bounds.end) {
		insertAt = countTopLevelObjectsInArrayPrefix(content, bounds.start, cursor);
	}
	insertAt = Math.max(0, Math.min(insertAt, doc.blocks.length));

	const imageBlock = { type: "image" as const, url: imageStoragePath, alt };
	const nextBlocks = [...doc.blocks];
	nextBlocks.splice(insertAt, 0, imageBlock);

	const isRootArray = Array.isArray(parsedRoot);
	if (isRootArray) {
		return JSON.stringify(nextBlocks, null, 2);
	}

	const rest = { ...(parsedRoot as Record<string, unknown>) };
	delete rest.blocks;
	return JSON.stringify({ ...rest, blocks: nextBlocks }, null, 2);
}
