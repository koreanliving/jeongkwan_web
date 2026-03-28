"use client";

import { useEffect, type ComponentPropsWithoutRef, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Download, FileText } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { BottomTabNav } from "@/components/BottomTabNav";
import { STUDENT_APP_SHELL, studentComicCard } from "@/lib/appShell";
import { supabase } from "../../../utils/supabase";
import { parseStructuredMaterialContent } from "../../../utils/materialParser";

type MaterialDetail = {
	id: number;
	title: string;
	subtitle: string | null;
	content: string;
	category: "문학" | "비문학";
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

function toKoreanDate(value: string) {
	return new Date(value).toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export default function MaterialDetailPage() {
	const params = useParams<{ id: string }>();
	const materialId = Number(params.id);

	const [material, setMaterial] = useState<MaterialDetail | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [showPostDates, setShowPostDates] = useState(true);

	const resolvedFileUrl = resolveFileUrl(material?.file_url ?? null);
	const parsed = useMemo(() => parseStructuredMaterialContent(material?.content ?? ""), [material?.content]);
	const isParsedView = parsed.pairs.length > 0 || !!parsed.summary;

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
					.select("id, title, subtitle, content, category, file_url, file_name, file_size, created_at")
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

						{isParsedView ? (
							<section className="mt-6">
								<div className="grid gap-4 sm:grid-cols-2">
									{parsed.pairs.map((pair, index) => (
										<div key={`pair-${index + 1}`} className="rounded-xl border border-zinc-200/90 bg-zinc-50 p-3 shadow-sm">
											<p className="rounded-lg border border-zinc-200/90 bg-white px-3 py-2 text-sm font-extrabold tracking-tight text-zinc-800">
												{pair.original}
											</p>
											{pair.explanation ? (
												<p className="vocab-meaning-text mt-2 whitespace-pre-wrap text-[13px] sm:text-sm">{pair.explanation}</p>
											) : null}
										</div>
									))}
								</div>

								{parsed.summary ? (
									<div className={`${studentComicCard} mt-7 bg-zinc-50 p-4`}>
										<div className={`${studentComicCard} space-y-3 bg-white p-4`}>
											<p className="text-sm font-semibold tracking-tight text-zinc-800">
												<span className="mr-2 inline-block rounded border border-zinc-200/90 bg-amber-200 px-2 py-0.5 text-xs font-extrabold text-zinc-900">
													핵심 소재 한줄 요약
												</span>
												{parsed.summary.oneLine || "요약을 입력하세요."}
											</p>
											<p className="text-sm font-semibold tracking-tight text-zinc-800">
												<span className="mr-2 inline-block rounded border border-zinc-200/90 bg-emerald-200 px-2 py-0.5 text-xs font-extrabold text-zinc-900">
													직관적인 쉬운 비유
												</span>
												{parsed.summary.analogy || "비유를 입력하세요."}
											</p>
											<p className="text-sm font-semibold tracking-tight text-zinc-800">
												<span className="mr-2 inline-block rounded border border-zinc-200/90 bg-zinc-200 px-2 py-0.5 text-xs font-extrabold text-zinc-900">
													기억할 대립항
												</span>
												{parsed.summary.contrast || "대립항을 입력하세요."}
											</p>
										</div>

										<h3 className="mt-6 text-lg font-extrabold tracking-tight text-zinc-900">필수 어휘</h3>
										<div className="mt-3 grid gap-3 sm:grid-cols-2">
											{(parsed.summary.essentialVocab.length > 0
												? parsed.summary.essentialVocab
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
											{(parsed.summary.supportVocab.length > 0
												? parsed.summary.supportVocab
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
											<p className="vocab-meaning-text text-[13px] sm:text-sm">1. {parsed.summary.question1 || "질문을 입력하세요."}</p>
											<p className="vocab-meaning-text mt-4 text-[13px] sm:text-sm">2. {parsed.summary.question2 || "질문을 입력하세요."}</p>
										</div>
									</div>
								) : null}
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
