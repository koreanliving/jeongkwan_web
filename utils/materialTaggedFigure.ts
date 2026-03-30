/**
 * [원문]…[해설]… 사이에 [그림]스토리지경로 또는 URL 을 끼워 넣는 태그 본문을
 * MaterialBlock[] 로 변환합니다. (요약 구간 [학생용 소재 요약본] 앞까지만 처리)
 */

import type { MaterialBlock, MaterialImageBlock } from "./materialBlocks";

/**
 * 본문에서 요약 마커 앞까지 / 전체 본문을 잘라 pairSource 로 쓸 때,
 * [그림] 태그가 있으면 이 파서를 사용합니다.
 */
export function parseTaggedMixedMaterialBlocks(body: string): MaterialBlock[] {
	const matches: { tag: "원문" | "해설" | "그림"; at: number; end: number }[] = [];
	const re = /\[(원문|해설|그림)\]/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(body)) !== null) {
		matches.push({
			tag: m[1] as "원문" | "해설" | "그림",
			at: m.index,
			end: m.index + m[0].length,
		});
	}
	if (matches.length === 0) return [];

	const blocks: MaterialBlock[] = [];
	let pendingOriginal: string | null = null;

	for (let k = 0; k < matches.length; k++) {
		const tagEnd = matches[k].end;
		const sliceEnd = k + 1 < matches.length ? matches[k + 1].at : body.length;
		const segment = body.slice(tagEnd, sliceEnd).trim();
		const tag = matches[k].tag;

		if (tag === "원문") {
			if (pendingOriginal !== null) {
				blocks.push({ type: "text", content: pendingOriginal, commentary: undefined });
			}
			pendingOriginal = segment;
		} else if (tag === "해설") {
			if (pendingOriginal !== null) {
				blocks.push({
					type: "text",
					content: pendingOriginal,
					commentary: segment || undefined,
				});
				pendingOriginal = null;
			} else {
				const last = blocks[blocks.length - 1];
				if (last?.type === "image" && segment) {
					const img = last as MaterialImageBlock;
					blocks[blocks.length - 1] = {
						...img,
						alt: img.alt ? `${img.alt} ${segment}` : segment,
					};
				}
			}
		} else {
			/* 그림 */
			if (pendingOriginal !== null) {
				blocks.push({ type: "text", content: pendingOriginal, commentary: undefined });
				pendingOriginal = null;
			}
			if (segment) {
				blocks.push({ type: "image", url: segment, alt: "" });
			}
		}
	}

	if (pendingOriginal !== null) {
		blocks.push({ type: "text", content: pendingOriginal, commentary: undefined });
	}

	return blocks;
}

/**
 * 커서 위치에 `[그림]업로드경로` 삽입.
 * - 커로가 빈 `[그림]` 바로 뒤면 경로만 채움
 * - 그 외에는 `[그림]경로` 블록을 삽입 (앞뒤 줄바꿈 자동)
 */
export function insertMaterialFigureTagAtCursor(content: string, cursor: number, storagePath: string): string {
	const before = content.slice(0, cursor);
	const after = content.slice(cursor);
	if (/\[그림\]\s*$/.test(before)) {
		return before.replace(/\[그림\]\s*$/, `[그림]${storagePath}`) + after;
	}
	const insert = `[그림]${storagePath}`;
	const padBefore = before.length > 0 && !/\n\s*$/.test(before) ? "\n" : "";
	const padAfter = after.length > 0 && !/^\s*\n/.test(after) ? "\n" : "";
	return before + padBefore + insert + padAfter + after;
}
