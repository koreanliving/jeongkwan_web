"use client";

import { useEffect, type ComponentPropsWithoutRef, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Download, FileText } from "lucide-react";
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

	return (
		<main className="min-h-screen bg-zinc-100 px-4 pb-10 pt-6 text-zinc-800 sm:px-6 sm:pt-8">
			<div className="mx-auto w-full max-w-4xl">
				<div className="mb-5 flex items-center justify-between gap-3">
					<Link href="/material" className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
						목록으로
					</Link>
				</div>

				{isLoading ? <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">자료를 불러오는 중입니다...</p> : null}
				{!isLoading && errorMessage ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p> : null}

				{!isLoading && !errorMessage && material ? (
					<article className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)] sm:p-6">
						<header>
							<div className="flex flex-wrap items-center gap-2">
								<span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium leading-none text-white">{material.category}</span>
								{showPostDates ? <p className="text-xs text-zinc-500">{toKoreanDate(material.created_at)}</p> : null}
							</div>
							<h1 className="mt-3 break-words text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl">{material.title}</h1>
							{material.subtitle?.trim() ? <p className="mt-2 text-sm text-zinc-600">{material.subtitle}</p> : null}
						</header>

						{isParsedView ? (
							<section className="mt-6">
								<div className="grid gap-4 sm:grid-cols-2">
									{parsed.pairs.map((pair, index) => (
										<div key={`pair-${index + 1}`} className="rounded-2xl border border-zinc-300 bg-zinc-50 p-3">
											<p className="rounded-xl border border-zinc-500 bg-white px-3 py-2 text-sm font-semibold leading-relaxed text-zinc-800">{pair.original}</p>
											{pair.explanation ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-sky-700">{pair.explanation}</p> : null}
										</div>
									))}
								</div>

								{parsed.summary ? (
									<div className="mt-7 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
										<div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
											<p className="text-sm leading-relaxed"><span className="mr-2 rounded bg-amber-300 px-2 py-0.5 text-xs font-bold text-amber-900">핵심 소재 한줄 요약</span>{parsed.summary.oneLine || "요약을 입력하세요."}</p>
											<p className="text-sm leading-relaxed"><span className="mr-2 rounded bg-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-900">직관적인 쉬운 비유</span>{parsed.summary.analogy || "비유를 입력하세요."}</p>
											<p className="text-sm leading-relaxed"><span className="mr-2 rounded bg-slate-400 px-2 py-0.5 text-xs font-bold text-white">기억할 대립항</span>{parsed.summary.contrast || "대립항을 입력하세요."}</p>
										</div>

										<h3 className="mt-6 text-lg font-bold text-zinc-900">필수 어휘</h3>
										<div className="mt-3 grid gap-3 sm:grid-cols-2">
											{(parsed.summary.essentialVocab.length > 0 ? parsed.summary.essentialVocab : [{ word: "어휘", meaning: "뜻을 입력하세요." }]).map((vocab, index) => (
												<div key={`essential-${index + 1}`} className="rounded-xl border border-zinc-200 bg-white p-3">
													<p className="text-lg font-bold text-zinc-900">{vocab.word}</p>
													<p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">{vocab.meaning}</p>
												</div>
											))}
										</div>

										<h3 className="mt-6 text-lg font-bold text-zinc-900">보조 어휘 (독해 속도향상)</h3>
										<div className="mt-3 flex flex-wrap gap-2">
											{(parsed.summary.supportVocab.length > 0 ? parsed.summary.supportVocab : [{ word: "보조어휘", meaning: "뜻" }]).map((vocab, index) => (
												<div key={`support-${index + 1}`} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
													<span className="mr-1.5 rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-zinc-900">{vocab.word}</span>
													<span className="text-zinc-600">{vocab.meaning}</span>
												</div>
											))}
										</div>

										<h3 className="mt-6 text-lg font-bold text-zinc-900">스스로 생각하기</h3>
										<div className="mt-3 rounded-2xl border-2 border-sky-200 bg-sky-50 p-4">
											<p className="text-sm text-zinc-700">1. {parsed.summary.question1 || "질문을 입력하세요."}</p>
											<p className="mt-4 text-sm text-zinc-700">2. {parsed.summary.question2 || "질문을 입력하세요."}</p>
										</div>
									</div>
								) : null}
							</section>
						) : material.content.trim() ? (
							<section className="mt-6 text-sm text-zinc-800 sm:text-base">
								<ReactMarkdown
									components={{
										blockquote: ({ children }: ComponentPropsWithoutRef<"blockquote">) => <blockquote className="rounded-xl border-l-4 border-gray-400 bg-gray-100 p-5 text-lg font-bold text-gray-800">{children}</blockquote>,
										p: ({ children }: ComponentPropsWithoutRef<"p">) => (
											<p className="mb-8 rounded-xl bg-blue-50 p-5 leading-relaxed text-gray-700"><span aria-hidden="true">💡 사고 과정 : </span>{children}</p>
										),
									}}
								>
									{material.content}
								</ReactMarkdown>
							</section>
						) : null}

						<section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
							<h2 className="text-sm font-semibold text-zinc-900 sm:text-base">첨부파일</h2>
							{resolvedFileUrl ? (
								<div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3">
									<div>
										<p className="text-sm font-medium text-zinc-800">{material.file_name ?? "첨부파일"}</p>
										<p className="mt-1 text-xs text-zinc-500">{material.file_size ? formatFileSize(material.file_size) : ""}</p>
									</div>
									<a href={createDownloadUrl(resolvedFileUrl, material.file_name)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700 sm:text-sm">
										<Download className="h-4 w-4" />다운로드
									</a>
								</div>
							) : (
								<div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-600">
									<FileText className="h-4 w-4" />첨부파일이 없습니다.
								</div>
							)}
						</section>
					</article>
				) : null}
			</div>
		</main>
	);
}
