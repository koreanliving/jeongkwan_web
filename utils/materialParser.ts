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

export function parseStructuredMaterialContent(raw: string): ParsedMaterialContent {
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
