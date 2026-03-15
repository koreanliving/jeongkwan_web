"use client";

import { useEffect, useState, type ComponentPropsWithoutRef } from "react";
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
					</article>
				) : null}
			</div>
		</main>
	);
}
