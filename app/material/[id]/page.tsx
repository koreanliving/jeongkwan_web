"use client";

import { useEffect, useMemo, useState, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { supabase } from "../../../utils/supabase";

type MaterialDetail = {
	id: number;
	title: string;
	content: string;
	category: "문학" | "비문학";
	created_at: string;
};

const THINKING_KEYWORD = "사고 과정:";

function toKoreanDate(value: string) {
	return new Date(value).toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function splitMaterialContent(content: string) {
	const keywordIndex = content.indexOf(THINKING_KEYWORD);

	if (keywordIndex === -1) {
		return {
			originalText: content.trim(),
			thinkingText: "",
		};
	}

	return {
		originalText: content.slice(0, keywordIndex).trim(),
		thinkingText: content.slice(keywordIndex + THINKING_KEYWORD.length).trim(),
	};
}

function MarkdownBlock({ text }: { text: string }) {
	const normalizedMarkdown = useMemo(() => text.replace(/\n/g, "  \n"), [text]);

	type ParagraphProps = ComponentPropsWithoutRef<"p">;
	type StrongProps = ComponentPropsWithoutRef<"strong">;
	type ListProps = ComponentPropsWithoutRef<"ul">;
	type OrderedListProps = ComponentPropsWithoutRef<"ol">;
	type ListItemProps = ComponentPropsWithoutRef<"li">;
	type QuoteProps = ComponentPropsWithoutRef<"blockquote">;

	return (
		<ReactMarkdown
			components={{
				p: ({ children }: ParagraphProps) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
				strong: ({ children }: StrongProps) => <strong className="font-bold text-zinc-900">{children}</strong>,
				ul: ({ children }: ListProps) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
				ol: ({ children }: OrderedListProps) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
				li: ({ children }: ListItemProps) => <li className="leading-relaxed">{children}</li>,
				blockquote: ({ children }: QuoteProps) => (
					<blockquote className="my-3 border-l-4 border-zinc-300 pl-3 text-zinc-700">{children}</blockquote>
				),
			}}
		>
			{normalizedMarkdown}
		</ReactMarkdown>
	);
}

export default function MaterialDetailPage() {
	const params = useParams<{ id: string }>();
	const materialId = Number(params.id);

	const [material, setMaterial] = useState<MaterialDetail | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");

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
				.select("id, title, content, category, created_at")
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
			setIsLoading(false);
		};

		fetchMaterial();

		return () => {
			isMounted = false;
		};
	}, [materialId]);

	const parsedContent = useMemo(
		() => splitMaterialContent(material?.content ?? ""),
		[material?.content],
	);

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

						<section className="mt-6 space-y-4 text-sm text-zinc-800 sm:text-base">
							<div className="bg-gray-100 rounded-lg p-4">
								<h2 className="mb-2 text-xs font-semibold tracking-wide text-zinc-600">원문</h2>
								<MarkdownBlock text={parsedContent.originalText || material.content} />
							</div>

							{parsedContent.thinkingText ? (
								<div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
									<h2 className="mb-2 text-sm font-semibold text-blue-900">
										<span aria-hidden="true" className="mr-1">💡</span>
										사고 과정
									</h2>
									<MarkdownBlock text={parsedContent.thinkingText} />
								</div>
							) : null}
						</section>
					</article>
				) : null}
			</div>
		</main>
	);
}
