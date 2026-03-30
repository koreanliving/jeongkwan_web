"use client";

import { useCallback, useEffect, useMemo, type ComponentPropsWithoutRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Download, FileText } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { BottomTabNav } from "@/components/BottomTabNav";
import { STUDENT_APP_SHELL, studentComicCard } from "@/lib/appShell";
import { supabase } from "../../../utils/supabase";
import type { MaterialBlock } from "../../../utils/materialBlocks";
import { parseMaterialContent, type ParsedSummary } from "../../../utils/materialParser";

type MaterialDetail = {
	id: number;
	title: string;
	subtitle: string | null;
	content: string;
	category: "문학" | "비문학";
	display_style: "standard" | "reading";
	file_url: string | null;
	file_name: string | null;
	file_size: number | null;
	created_at: string;
};

type HomeSetting = {
	id: number;
	show_post_dates: boolean;
};

function formatFileSize(bytes: number | null) {
	if (!bytes || bytes <= 0) return "";
	const mb = bytes / (1024 * 1024);
	return `${mb.toFixed(1)}MB`;
}

function createDownloadUrl(fileUrl: string, fileName: string | null) {
	try {
		const url = new URL(fileUrl);
		url.searchParams.set("download", fileName ?? "material.pdf");
		return url.toString();
	} catch {
		return fileUrl;
	}
}

function resolveFileUrl(fileUrl: string | null) {
	if (!fileUrl) return null;
	if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) return fileUrl;
	const { data } = supabase.storage.from("materials").getPublicUrl(fileUrl);
	return data.publicUrl;
}

/** JSON 블록의 image.url — PDF와 동일하게 materials 버킷 상대경로 또는 절대 URL 허용 */
function resolveMaterialAssetUrl(url: string) {
	const u = url.trim();
	if (!u) return "";
	if (u.startsWith("http://") || u.startsWith("https://")) return u;
	const { data } = supabase.storage.from("materials").getPublicUrl(u);
	return data.publicUrl;
}

function toKoreanDate(value: string) {
	return new Date(value).toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function MaterialSummarySection({ summary }: { summary: ParsedSummary }) {
	return (
		<div className={`${studentComicCard} mt-7 bg-zinc-50 p-4`}>
			<div className={`${studentComicCard} space-y-3 bg-white p-4`}>
				<p className="text-sm font-semibold tracking-tight text-zinc-800">
					<span className="mr-2 inline-block rounded border border-zinc-200/90 bg-amber-200 px-2 py-0.5 text-xs font-extrabold text-zinc-900">
						핵심 소재 한줄 요약
					</span>
					{summary.oneLine || "요약을 입력하세요."}
				</p>
				<p className="text-sm font-semibold tracking-tight text-zinc-800">
					<span className="mr-2 inline-block rounded border border-zinc-200/90 bg-emerald-200 px-2 py-0.5 text-xs font-extrabold text-zinc-900">
						직관적인 쉬운 비유
					</span>
					{summary.analogy || "비유를 입력하세요."}
				</p>
				<p className="text-sm font-semibold tracking-tight text-zinc-800">
					<span className="mr-2 inline-block rounded border border-zinc-200/90 bg-zinc-200 px-2 py-0.5 text-xs font-extrabold text-zinc-900">
						기억할 대립항
					</span>
					{summary.contrast || "대립항을 입력하세요."}
				</p>
			</div>

			<h3 className="mt-6 text-lg font-extrabold tracking-tight text-zinc-900">필수 어휘</h3>
			<div className="mt-3 grid gap-3 sm:grid-cols-2">
				{(summary.essentialVocab.length > 0
					? summary.essentialVocab
					: [{ word: "어휘", meaning: "뜻을 입력하세요." }]
				).map((vocab, index) => (
					<div key={`essential-${index + 1}`} className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm">
						<p className="text-base font-extrabold tracking-tight text-zinc-900 sm:text-lg">{vocab.word}</p>
						<p className="vocab-meaning-text mt-1 whitespace-pre-wrap text-[13px] sm:text-sm">{vocab.meaning}</p>
					</div>
				))}
			</div>

			<h3 className="mt-6 text-lg font-extrabold tracking-tight text-zinc-900">보조 어휘 (독해 속도향상)</h3>
			<div className="mt-3 flex flex-wrap gap-2">
				{(summary.supportVocab.length > 0
					? summary.supportVocab
					: [{ word: "보조어휘", meaning: "뜻" }]
				).map((vocab, index) => (
					<div
						key={`support-${index + 1}`}
						className="rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm shadow-sm"
					>
						<span className="mr-1.5 inline-block rounded border border-zinc-200/90 bg-[#f5ead8] px-1.5 py-0.5 text-xs font-extrabold tracking-tight text-zinc-900">
							{vocab.word}
						</span>
						<span className="vocab-meaning-text text-[13px]">{vocab.meaning}</span>
					</div>
				))}
			</div>

			<h3 className="mt-6 text-lg font-extrabold tracking-tight text-zinc-900">스스로 생각하기</h3>
			<div className="mt-3 rounded-xl border-2 border-sky-300/80 bg-sky-50/90 p-4">
				<p className="vocab-meaning-text text-[13px] sm:text-sm">1. {summary.question1 || "질문을 입력하세요."}</p>
				<p className="vocab-meaning-text mt-4 text-[13px] sm:text-sm">2. {summary.question2 || "질문을 입력하세요."}</p>
			</div>
		</div>
	);
}

/**
 * type: "image" 블록 전용 — 툴팁 없이 이미지만 표시합니다.
 * (나중에 formula 블록을 추가하면 이와 같은 옆에 MaterialBlockFormula 컴포넌트를 두면 됩니다.)
 */
function MaterialBlockImage({ url, alt }: { url: string; alt?: string }) {
	const src = resolveMaterialAssetUrl(url);
	if (!src) {
		return (
			<p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">이미지 주소가 비어 있습니다.</p>
		);
	}
	return (
		<figure className="my-1 overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-50 shadow-sm">
			{/* eslint-disable-next-line @next/next/no-img-element -- 원격·스토리지 URL 혼합, 업로드 경로 가변 */}
			<img src={src} alt={alt ?? ""} className="mx-auto max-h-[min(70vh,32rem)] w-full max-w-full object-contain" loading="lazy" />
		</figure>
	);
}

/**
 * 기본 스타일 자료 본문: blocks 배열을 순서대로 돌면서 type에 따라 분기합니다.
 * - text: 원문 카드 + commentary(해설) 영역
 * - image: 가로 전체를 쓰는 그림 (그리드에서 sm:col-span-2)
 */
function StandardMaterialBlocksView({ blocks }: { blocks: MaterialBlock[] }) {
	if (blocks.length === 0) return null;

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{blocks.map((block, index) => {
				switch (block.type) {
					case "text":
						return (
							<div key={`std-block-${index}`} className="rounded-xl border border-zinc-200/90 bg-zinc-50 p-3 shadow-sm">
								<p className="rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm font-extrabold tracking-tight text-zinc-800 whitespace-pre-wrap">
									{block.content}
								</p>
								{block.commentary?.trim() ? (
									<p className="vocab-meaning-text mt-2 whitespace-pre-wrap text-[13px] sm:text-sm">{block.commentary}</p>
								) : null}
							</div>
						);
					case "image":
						return (
							<div key={`std-block-${index}`} className="sm:col-span-2">
								<MaterialBlockImage url={block.url} alt={block.alt} />
							</div>
						);
					default:
						/* formula / table 등 유니온 확장 시 여기에 case 추가 */
						return null;
				}
			})}
		</div>
	);
}

/**
 * 읽기 연습: blocks를 순서대로 렌더하되,
 * - text → 번호가 매겨진 문장 카드 + (해설이 있으면) 기존과 동일한 하단 고정 툴팁 패널
 * - image → 그림만 표시, 툴팁/포커스 상태와 무관
 *
 * hoverIndex / pinnedIndex는 "몇 번째 text 블록인가"만 가리킵니다 (이미지는 건너뜀).
 */
function ReadingPracticeView({ blocks, summary }: { blocks: MaterialBlock[]; summary: ParsedSummary | null }) {
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

	const activeIndex = hoverIndex ?? pinnedIndex;

	const handleClick = useCallback((textSlot: number) => {
		setPinnedIndex((prev) => (prev === textSlot ? null : textSlot));
	}, []);

	/** text 블록만 모은 목록 — 툴팁 활성 문장은 이 배열의 인덱스로 찾습니다. */
	const textBlocks = useMemo(
		() => blocks.filter((b): b is Extract<MaterialBlock, { type: "text" }> => b.type === "text"),
		[blocks],
	);

	/**
	 * 각 블록 인덱스 → 해당 위치가 text면 0부터 시작하는 "문장 번호", image면 -1
	 * (map 안에서 조건문 대신 미리 계산해 두면 읽기 쉽습니다.)
	 */
	const textSlotAtBlockIndex = useMemo(() => {
		const slots: number[] = [];
		let t = 0;
		for (let i = 0; i < blocks.length; i++) {
			if (blocks[i].type === "text") {
				slots[i] = t;
				t += 1;
			} else {
				slots[i] = -1;
			}
		}
		return slots;
	}, [blocks]);

	const activeTextBlock = activeIndex !== null && textBlocks.length > 0 ? textBlocks[activeIndex] : null;
	const activeExplanation = activeTextBlock?.commentary?.trim() ?? "";

	if (textBlocks.length === 0 && !summary) {
		return (
			<p className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
				읽기 연습 콘텐츠를 불러올 수 없습니다. JSON 블록의 <code className="rounded bg-zinc-200/80 px-1">text</code> 항목, 또는 [원문]/[해설]·[학생용 소재 요약본] 형식을 확인해 주세요.
			</p>
		);
	}

	return (
		<section className="mt-6">
			<div className="mb-4 flex flex-wrap items-center gap-2">
				<span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold tracking-widest text-brand">
					읽기 연습
				</span>
				<p className="text-xs text-zinc-500">
					{textBlocks.length > 0
						? `${textBlocks.length}개 문장 · 문장을 탭하거나 마우스를 올리면 아래에 해설이 나타납니다`
						: "요약·어휘 블록만 표시됩니다."}
				</p>
			</div>

			<div className="space-y-4">
				{blocks.map((block, i) => {
					switch (block.type) {
						case "image":
							return <MaterialBlockImage key={`read-block-${i}`} url={block.url} alt={block.alt} />;
						case "text": {
							const textSlot = textSlotAtBlockIndex[i];
							const isActive = activeIndex === textSlot;
							const isPinned = pinnedIndex === textSlot;
							return (
								<div
									key={`read-block-${i}`}
									role="button"
									tabIndex={0}
									aria-expanded={isActive}
									className={[
										"cursor-pointer select-none rounded-2xl border-2 px-4 py-4 text-base font-medium leading-relaxed tracking-tight transition-all duration-150 sm:px-5 sm:text-lg whitespace-pre-wrap",
										isActive
											? "border-brand bg-brand/5 text-brand shadow-md shadow-brand/10"
											: "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:shadow-sm",
										isPinned ? "ring-2 ring-brand/30 ring-offset-1" : "",
									].join(" ")}
									onMouseEnter={() => setHoverIndex(textSlot)}
									onMouseLeave={() => setHoverIndex(null)}
									onClick={() => handleClick(textSlot)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											handleClick(textSlot);
										}
									}}
								>
									<span className="mr-2.5 inline-block rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-500 tabular-nums">
										{textSlot + 1}
									</span>
									{block.content}
								</div>
							);
						}
						default:
							return null;
					}
				})}
			</div>

			{/* 기존과 동일한 하단 고정 해설 패널 (툴팁) */}
			<div
				className={[
					"fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[min(32rem,94vw)] -translate-x-1/2 transition-all duration-300",
					activeExplanation
						? "pointer-events-auto translate-y-0 opacity-100"
						: "pointer-events-none translate-y-4 opacity-0",
				].join(" ")}
				role="status"
				aria-live="polite"
			>
				<div className="rounded-2xl bg-zinc-800 px-5 py-4 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.55)]">
					<div className="mb-2.5 flex items-center gap-2">
						<span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
							해설
						</span>
						{activeIndex !== null ? (
							<span className="text-[10px] font-bold text-zinc-500">문장 {activeIndex + 1}</span>
						) : null}
					</div>
					<p className="whitespace-pre-wrap text-sm font-medium leading-7 tracking-tight text-white sm:text-base sm:leading-8">
						{activeExplanation}
					</p>
				</div>
				<div className="mx-auto mt-1.5 h-1 w-10 rounded-full bg-zinc-600/50" aria-hidden />
			</div>

			{activeExplanation ? <div className="h-40" aria-hidden /> : null}

			{summary ? <MaterialSummarySection summary={summary} /> : null}
		</section>
	);
}

export default function MaterialDetailPage() {
	const params = useParams<{ id: string }>();
	const materialId = Number(params.id);

	const [material, setMaterial] = useState<MaterialDetail | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [showPostDates, setShowPostDates] = useState(true);

	const resolvedFileUrl = resolveFileUrl(material?.file_url ?? null);
	const parsed = useMemo(() => parseMaterialContent(material?.content ?? ""), [material?.content]);
	const isParsedView = parsed.blocks.length > 0 || !!parsed.summary;

	useEffect(() => {
		let isMounted = true;

		const fetchMaterial = async () => {
			if (!Number.isInteger(materialId) || materialId <= 0) {
				setErrorMessage("잘못된 자료 ID입니다.");
				setMaterial(null);
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			setErrorMessage("");

			const [materialResult, settingResult] = await Promise.all([
				supabase
					.from("materials")
					.select("id, title, subtitle, content, category, display_style, file_url, file_name, file_size, created_at")
					.eq("id", materialId)
					.single(),
				supabase.from("home_settings").select("id, show_post_dates").eq("id", 1).maybeSingle(),
			]);
			const { data, error } = materialResult;

			if (!isMounted) return;
			if (error) {
				setErrorMessage("자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
				setMaterial(null);
				setIsLoading(false);
				return;
			}
			if (!data) {
				setErrorMessage("해당 자료를 찾을 수 없습니다.");
				setMaterial(null);
				setIsLoading(false);
				return;
			}

			setMaterial(data as MaterialDetail);
			if (!settingResult.error && settingResult.data) {
				const setting = settingResult.data as HomeSetting;
				setShowPostDates(setting.show_post_dates ?? true);
			}
			setIsLoading(false);
		};

		fetchMaterial();
		return () => {
			isMounted = false;
		};
	}, [materialId]);

	useEffect(() => {
		if (!material || isLoading || errorMessage) return;
		void fetch("/api/student/material-view", {
			method: "POST",
			credentials: "same-origin",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ materialId: material.id }),
		});
	}, [material, isLoading, errorMessage]);

	return (
		<main className="min-h-screen min-h-[100dvh] bg-app-sage pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-zinc-800">
			<AppTopBar
				title="학습 자료"
				right={
					<Link
						href="/material"
						className="rounded-full border border-zinc-200/90 bg-white px-3 py-1.5 text-xs font-extrabold tracking-tight text-zinc-900 shadow-sm transition hover:bg-zinc-100"
					>
						목록
					</Link>
				}
			/>

			<div className={`${STUDENT_APP_SHELL} space-y-4 pb-6 pt-3 sm:space-y-5`}>
				{isLoading ? (
					<p className={`${studentComicCard} px-4 py-8 text-center text-sm font-bold tracking-tight text-zinc-600`}>
						자료를 불러오는 중입니다...
					</p>
				) : null}
				{!isLoading && errorMessage ? (
					<p className={`${studentComicCard} border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800`}>{errorMessage}</p>
				) : null}

				{!isLoading && !errorMessage && material ? (
					<article className={`${studentComicCard} p-4 sm:p-6`}>
						<header>
							<div className="flex flex-wrap items-center gap-2">
								<span className="shrink-0 whitespace-nowrap rounded-full bg-brand px-2.5 py-1 text-[10px] font-semibold leading-none tracking-tight text-white shadow-sm">
									{material.category}
								</span>
								{showPostDates ? (
									<p className="text-xs font-bold tracking-tight text-zinc-500">{toKoreanDate(material.created_at)}</p>
								) : null}
							</div>
							<h1 className="mt-3 break-words text-xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-2xl md:text-3xl">
								{material.title}
							</h1>
							{material.subtitle?.trim() ? (
								<p className="mt-2 text-sm font-semibold tracking-tight text-zinc-600">{material.subtitle}</p>
							) : null}
						</header>

						{material.display_style === "reading" ? (
							<ReadingPracticeView blocks={parsed.blocks} summary={parsed.summary} />
						) : isParsedView ? (
							<section className="mt-6">
								<StandardMaterialBlocksView blocks={parsed.blocks} />
								{parsed.summary ? <MaterialSummarySection summary={parsed.summary} /> : null}
							</section>
						) : material.content.trim() ? (
							<section className="mt-6 text-sm sm:text-base">
								<ReactMarkdown
									components={{
										blockquote: ({ children }: ComponentPropsWithoutRef<"blockquote">) => (
											<blockquote className="rounded-xl border border-zinc-200/90 bg-zinc-100 p-4 text-base font-extrabold tracking-tight text-zinc-900 sm:p-5 sm:text-lg">
												{children}
											</blockquote>
										),
										p: ({ children }: ComponentPropsWithoutRef<"p">) => (
											<p className="vocab-meaning-text mb-6 rounded-xl border-2 border-sky-300/80 bg-sky-50/90 p-4 text-[13px] sm:mb-8 sm:p-5 sm:text-sm">
												<span aria-hidden="true" className="font-extrabold">
													💡 사고 과정 :{" "}
												</span>
												{children}
											</p>
										),
									}}
								>
									{material.content}
								</ReactMarkdown>
							</section>
						) : null}

						<section className={`${studentComicCard} mt-8 bg-zinc-50 p-4 sm:p-5`}>
							<h2 className="text-sm font-extrabold tracking-tight text-zinc-900 sm:text-base">첨부파일</h2>
							{resolvedFileUrl ? (
								<div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white px-3 py-3 shadow-sm">
									<div>
										<p className="text-sm font-extrabold tracking-tight text-zinc-800">{material.file_name ?? "첨부파일"}</p>
										<p className="mt-1 text-xs font-bold text-zinc-500">{material.file_size ? formatFileSize(material.file_size) : ""}</p>
									</div>
									<a
										href={createDownloadUrl(resolvedFileUrl, material.file_name)}
										target="_blank"
										rel="noreferrer"
										className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-semibold tracking-tight text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover sm:text-sm"
									>
										<Download className="h-4 w-4" />
										다운로드
									</a>
								</div>
							) : (
								<div className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-zinc-400 bg-white px-3 py-2 text-sm font-semibold text-zinc-600">
									<FileText className="h-4 w-4" />
									첨부파일이 없습니다.
								</div>
							)}
						</section>
					</article>
				) : null}
			</div>

			<BottomTabNav active="material" />
		</main>
	);
}
