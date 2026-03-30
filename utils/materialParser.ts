import { tryParseMaterialBlocksJson, type MaterialBlock, type MaterialTextBlock } from "./materialBlocks";

/** 외부에서 블록 타입만 쓸 때: `import type { MaterialBlock } from "@/utils/materialParser"` 도 가능 */
export type { MaterialBlock, MaterialContentDocument, MaterialImageBlock, MaterialTextBlock } from "./materialBlocks";

export type ParsedPair = {
	original: string;
	explanation: string;
};

export type ParsedSummary = {
	oneLine: string;
	analogy: string;
	contrast: string;
	essentialVocab: Array<{ word: string; meaning: string }>;
	supportVocab: Array<{ word: string; meaning: string }>;
	question1: string;
	question2: string;
};

export type ParsedMaterialContent = {
	pairs: ParsedPair[];
	summary: ParsedSummary | null;
};

/**
 * 통합 파싱 결과.
 * - blocks: 화면 렌더 순서 (텍스트·이미지 혼합)
 * - format: json 이면 DB에 JSON으로 저장된 자료, legacy 면 [원문]/[해설] 문자열 자료
 */
export type UnifiedMaterialParse = {
	blocks: MaterialBlock[];
	summary: ParsedSummary | null;
	format: "json" | "legacy";
};

type SummarySection = "oneLine" | "analogy" | "contrast" | "essential" | "support" | "thinking";

function normalizeLine(line: string) {
	return line
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "")
		.replace(/[\[\]()]/g, "");
}

function stripLabelPrefix(line: string) {
	const colonIndex = line.indexOf(":");
	if (colonIndex === -1) {
		return "";
	}
	return line.slice(colonIndex + 1).trim();
}

function detectSection(line: string): SummarySection | null {
	const normalized = normalizeLine(line);

	if (normalized.startsWith("핵심소재한줄요약")) return "oneLine";
	if (normalized.startsWith("직관적인쉬운비유")) return "analogy";
	if (normalized.startsWith("기억할대립항avs b") || normalized.startsWith("기억할대립항avsb") || normalized.startsWith("기억할대립항")) {
		return "contrast";
	}
	if (normalized.startsWith("필수어휘")) return "essential";
	if (normalized.startsWith("보조어휘독해속도향상") || normalized.startsWith("보조어휘")) return "support";
	if (normalized.startsWith("스스로생각하기")) return "thinking";

	return null;
}

function parseVocabLines(source: string) {
	const lines = source
		.split(/\n+/)
		.map((line) => line.trim())
		.filter(Boolean);

	return lines.map((line) => {
		const splitIndex = line.search(/[:\-]/);
		if (splitIndex === -1) {
			return { word: line, meaning: "" };
		}

		return {
			word: line.slice(0, splitIndex).trim(),
			meaning: line.slice(splitIndex + 1).trim(),
		};
	});
}

function parseQuestions(source: string) {
	const q1Match = source.match(/(?:^|\n)\s*(?:Q\s*1|1\.)\s*[:.]?\s*([^\n]+)/i);
	const q2Match = source.match(/(?:^|\n)\s*(?:Q\s*2|2\.)\s*[:.]?\s*([^\n]+)/i);

	return {
		q1: (q1Match?.[1] || "").trim(),
		q2: (q2Match?.[1] || "").trim(),
	};
}

function parseSummaryBlock(summaryRaw: string): ParsedSummary | null {
	const lines = summaryRaw
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.map((line) => line.trim());

	const bucket: Record<SummarySection, string[]> = {
		oneLine: [],
		analogy: [],
		contrast: [],
		essential: [],
		support: [],
		thinking: [],
	};

	let current: SummarySection | null = null;

	for (const rawLine of lines) {
		if (!rawLine) continue;

		const section = detectSection(rawLine);
		if (section) {
			current = section;
			const remainder = stripLabelPrefix(rawLine);
			if (remainder) {
				bucket[section].push(remainder);
			}
			continue;
		}

		if (/^(?:Q\s*[12]|[12]\.)\s*[:.]?/i.test(rawLine) && current !== "thinking") {
			current = "thinking";
		}

		if (current) {
			bucket[current].push(rawLine);
		}
	}

	const oneLine = bucket.oneLine.join(" ").trim();
	const analogy = bucket.analogy.join(" ").trim();
	const contrast = bucket.contrast.join(" ").trim();
	const essentialRaw = bucket.essential.join("\n").trim();
	const supportRaw = bucket.support.join("\n").trim();
	const thinkingRaw = bucket.thinking.join("\n").trim();
	const { q1, q2 } = parseQuestions(thinkingRaw);

	if (!oneLine && !analogy && !contrast && !essentialRaw && !supportRaw && !thinkingRaw) {
		return null;
	}

	return {
		oneLine,
		analogy,
		contrast,
		essentialVocab: parseVocabLines(essentialRaw).slice(0, 6),
		supportVocab: parseVocabLines(supportRaw).slice(0, 12),
		question1: q1,
		question2: q2,
	};
}

/**
 * 레거시: 본문 전체가 "[원문]…[해설]…" + 선택적 "[학생용 소재 요약본]…" 인 경우.
 * (JSON이 아닐 때만 사용합니다.)
 */
function parseLegacyStructuredMaterialContent(raw: string): ParsedMaterialContent {
	const content = (raw || "").trim();
	if (!content) {
		return { pairs: [], summary: null };
	}

	const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	const summaryStart = normalized.search(/\[학생용\s*소재\s*요약본[^\]]*\]/i);
	const pairSource = summaryStart >= 0 ? normalized.slice(0, summaryStart) : normalized;
	const summarySource = summaryStart >= 0 ? normalized.slice(summaryStart) : "";

	const pairBlocks = pairSource
		.split(/\[원문\]/)
		.map((block) => block.trim())
		.filter(Boolean);

	const pairs: ParsedPair[] = pairBlocks
		.map((block) => {
			const parts = block.split(/\[해설\]/);
			const original = (parts[0] || "").trim();
			const explanation = (parts[1] || "").replace(/^(사고\s*과정\s*:\s*)/i, "").trim();
			return { original, explanation };
		})
		.filter((item) => item.original.length > 0);

	const summary = summarySource ? parseSummaryBlock(summarySource) : null;

	return { pairs, summary };
}

/** text 블록만 뽑아 레거시 ParsedPair 배열로 변환 (어드민 미리보기·호환용) */
export function blocksToParsedPairs(blocks: MaterialBlock[]): ParsedPair[] {
	return blocks
		.filter((b): b is MaterialTextBlock => b.type === "text")
		.map((b) => ({
			original: b.content,
			explanation: (b.commentary ?? "").trim(),
		}))
		.filter((item) => item.original.length > 0);
}

/**
 * 자료 본문 통합 파서.
 * 1) JSON `{ blocks, summary? }` 또는 `[ 블록들 ]` 이면 블록 기반으로 처리
 * 2) 그 외는 기존 [원문]/[해설] 텍스트 파서
 */
export function parseMaterialContent(raw: string): UnifiedMaterialParse {
	const content = (raw || "").trim();
	if (!content) {
		return { blocks: [], summary: null, format: "legacy" };
	}

	const fromJson = tryParseMaterialBlocksJson(content);
	if (fromJson !== null) {
		let summary: ParsedSummary | null = null;
		if (fromJson.summary?.trim()) {
			summary = parseSummaryBlock(fromJson.summary);
		}
		return { blocks: fromJson.blocks, summary, format: "json" };
	}

	const legacy = parseLegacyStructuredMaterialContent(content);
	const blocks: MaterialBlock[] = legacy.pairs.map((p) => ({
		type: "text" as const,
		content: p.original,
		commentary: p.explanation ? p.explanation : undefined,
	}));

	return {
		blocks,
		summary: legacy.summary,
		format: "legacy",
	};
}

/** 내부적으로 parseMaterialContent 사용. 기존 코드·어드민 미리보기 호환용. */
export function parseStructuredMaterialContent(raw: string): ParsedMaterialContent {
	const u = parseMaterialContent(raw);
	return {
		pairs: blocksToParsedPairs(u.blocks),
		summary: u.summary,
	};
}
