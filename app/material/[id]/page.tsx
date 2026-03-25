"use client";

import { useEffect, useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Download, FileText, Minus, Plus } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { supabase } from "../../../utils/supabase";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

type MaterialDetail = {
	id: number;
	title: string;
	content: string;
	category: "문학" | "비문학";
	file_url: string | null;
	file_name: string | null;
	file_size: number | null;
	created_at: string;
};

function formatFileSize(bytes: number | null) {
	if (!bytes || bytes <= 0) {
		return "";
	}

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
	if (!fileUrl) {
		return null;
	}

	if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
		return fileUrl;
	}

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
	const [totalPages, setTotalPages] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [pdfScale, setPdfScale] = useState(1);
	const [pageWidth, setPageWidth] = useState(340);
	const [pdfError, setPdfError] = useState("");
	const resolvedFileUrl = resolveFileUrl(material?.file_url ?? null);

	useEffect(() => {
		const updatePageWidth = () => {
			setPageWidth(Math.min(Math.max(window.innerWidth - 56, 260), 760));
		};

		updatePageWidth();
		window.addEventListener("resize", updatePageWidth);

		return () => {
			window.removeEventListener("resize", updatePageWidth);
		};
	}, []);

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

			const { data, error } = await supabase
				.from("materials")
				.select("id, title, content, category, file_url, file_name, file_size, created_at")
				.eq("id", materialId)
				.single();

			if (!isMounted) {
				return;
			}

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
			setCurrentPage(1);
			setPdfScale(1);
			setPdfError("");
			setIsLoading(false);
		};

		fetchMaterial();

		return () => {
			isMounted = false;
		};
	}, [materialId]);

	return (
		<main className="min-h-screen bg-zinc-100 px-4 pb-10 pt-6 text-zinc-800 sm:px-6 sm:pt-8">
			<div className="mx-auto w-full max-w-3xl">
				<div className="mb-5 flex items-center justify-between gap-3">
					<Link
						href="/material"
						className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
					>
						목록으로
					</Link>
				</div>

				{isLoading ? (
					<p className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
						자료를 불러오는 중입니다...
					</p>
				) : null}

				{!isLoading && errorMessage ? (
					<p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						{errorMessage}
					</p>
				) : null}

				{!isLoading && !errorMessage && material ? (
					<article className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)] sm:p-6">
						<header>
							<div className="flex flex-wrap items-center gap-2">
								<span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white">
									{material.category}
								</span>
								<p className="text-xs text-zinc-500">{toKoreanDate(material.created_at)}</p>
							</div>
							<h1 className="mt-3 break-words text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl">
								{material.title}
							</h1>
						</header>

						<section className="mt-6 text-sm text-zinc-800 sm:text-base">
							<ReactMarkdown
								components={{
									blockquote: ({ children }: ComponentPropsWithoutRef<"blockquote">) => (
										<blockquote className="bg-gray-100 p-5 rounded-xl mb-3 text-gray-800 text-lg font-bold border-l-4 border-gray-400">
											{children}
										</blockquote>
									),
									p: ({ children }: ComponentPropsWithoutRef<"p">) => (
										<p className="bg-blue-50 p-5 rounded-xl mb-8 text-gray-700 leading-relaxed">
											<span aria-hidden="true">💡 사고 과정 : </span>
											{children}
										</p>
									),
								}}
							>
								{material.content}
							</ReactMarkdown>
						</section>

						{resolvedFileUrl ? (
							<section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div>
										<h2 className="text-sm font-semibold text-zinc-900 sm:text-base">첨부 PDF</h2>
										<p className="mt-1 text-xs text-zinc-500">
											{material.file_name ?? "첨부파일"}
											{material.file_size ? ` · ${formatFileSize(material.file_size)}` : ""}
										</p>
									</div>
									<a
										href={createDownloadUrl(resolvedFileUrl, material.file_name)}
										target="_blank"
										rel="noreferrer"
										className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700 sm:text-sm"
									>
										<Download className="h-4 w-4" />
										다운로드
									</a>
								</div>

								<div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white p-2">
									<Document
										file={resolvedFileUrl}
										onLoadSuccess={({ numPages }) => {
											setTotalPages(numPages);
											setCurrentPage(1);
										}}
										onLoadError={() => {
											setPdfError("PDF를 불러오지 못했습니다. 파일 링크를 확인해 주세요.");
										}}
									>
										<Page
											pageNumber={currentPage}
											scale={pdfScale}
											width={pageWidth}
											renderTextLayer={false}
											renderAnnotationLayer={false}
										/>
									</Document>
								</div>

								{pdfError ? (
									<p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
										{pdfError}
									</p>
								) : null}

								<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
									<div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1">
										<button
											type="button"
											onClick={() => setPdfScale((value) => Math.max(0.8, Number((value - 0.1).toFixed(1))))}
											className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100"
										>
											<Minus className="h-4 w-4" />
										</button>
										<span className="px-1 text-xs font-medium text-zinc-600 sm:text-sm">{Math.round(pdfScale * 100)}%</span>
										<button
											type="button"
											onClick={() => setPdfScale((value) => Math.min(2, Number((value + 0.1).toFixed(1))))}
											className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100"
										>
											<Plus className="h-4 w-4" />
										</button>
									</div>

									<div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1">
										<button
											type="button"
											onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
											className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 sm:text-sm"
										>
											이전
										</button>
										<span className="text-xs font-medium text-zinc-600 sm:text-sm">
											{currentPage} / {totalPages || "-"}
										</span>
										<button
											type="button"
											onClick={() => setCurrentPage((page) => (totalPages ? Math.min(totalPages, page + 1) : page))}
											className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 sm:text-sm"
										>
											다음
										</button>
									</div>
								</div>
							</section>
						) : (
							<section className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
								<div className="inline-flex items-center gap-2">
									<FileText className="h-4 w-4" />
									첨부된 PDF가 없습니다.
								</div>
							</section>
						)}
					</article>
				) : null}
			</div>
		</main>
	);
}
