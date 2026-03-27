"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Paperclip } from "lucide-react";
import { BottomTabNav } from "@/components/BottomTabNav";
import { supabase } from "../../utils/supabase";

const categoryTabs = ["전체", "문학", "비문학"] as const;

type CategoryTab = (typeof categoryTabs)[number];

type MaterialItem = {
	id: number;
	title: string;
	subtitle: string | null;
	content: string;
	category: "문학" | "비문학";
	file_name: string | null;
	created_at: string;
};

type HomeSetting = {
	id: number;
	show_post_dates: boolean;
};

function toKoreanDate(value: string) {
	return new Date(value).toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export default function MaterialPage() {
	const [activeTab, setActiveTab] = useState<CategoryTab>("전체");
	const [materials, setMaterials] = useState<MaterialItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [isAdminUi] = useState(() => (typeof document !== "undefined" ? document.cookie.includes("admin_ui=true") : false));
	const [showPostDates, setShowPostDates] = useState(true);

	useEffect(() => {
		let isMounted = true;

		const fetchMaterials = async () => {
			setIsLoading(true);
			setErrorMessage("");

			let query = supabase
				.from("materials")
				.select("id, title, subtitle, content, category, file_name, created_at")
				.order("created_at", { ascending: false });

			if (activeTab !== "전체") {
				query = query.eq("category", activeTab);
			}

			const [materialResult, settingResult] = await Promise.all([
				query,
				supabase.from("home_settings").select("id, show_post_dates").eq("id", 1).maybeSingle(),
			]);
			const { data, error } = materialResult;

			if (!isMounted) {
				return;
			}

			if (error) {
				setErrorMessage("자료 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
				setMaterials([]);
				setIsLoading(false);
				return;
			}

			setMaterials((data ?? []) as MaterialItem[]);
			if (!settingResult.error && settingResult.data) {
				const setting = settingResult.data as HomeSetting;
				setShowPostDates(setting.show_post_dates ?? true);
			}
			setIsLoading(false);
		};

		fetchMaterials();

		return () => {
			isMounted = false;
		};
	}, [activeTab]);

	return (
		<main className="min-h-screen bg-zinc-100 px-5 pb-28 pt-8 text-zinc-800">
			<div className="mx-auto w-full max-w-sm">
				<header>
					<div className="flex items-center justify-between gap-3">
						<h1 className="text-3xl font-bold tracking-tight text-zinc-900">자료실</h1>
						{isAdminUi ? (
							<Link
								href="/admin"
								className="inline-flex min-h-10 items-center rounded-xl border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
							>
								관리
							</Link>
						) : null}
					</div>
					<div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-200/70 p-1.5">
						{categoryTabs.map((tab) => (
							<button
								key={tab}
								type="button"
								onClick={() => setActiveTab(tab)}
								className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
									activeTab === tab
										? "bg-brand text-white shadow-sm"
										: "bg-transparent text-zinc-600 hover:bg-white/80"
								}`}
							>
								{tab}
							</button>
						))}
					</div>
				</header>

				<section className="mt-6 space-y-4">
					{isLoading ? (
						<p className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
							데이터를 불러오는 중입니다...
						</p>
					) : null}

					{!isLoading && errorMessage ? (
						<p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
							{errorMessage}
						</p>
					) : null}

					{!isLoading && !errorMessage && materials.length === 0 ? (
						<p className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
							등록된 자료가 없습니다.
						</p>
					) : null}

					{!isLoading && !errorMessage
						? materials.map((material) => (
								<Link
									key={material.id}
									href={`/material/${material.id}`}
									className="block rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
								>
									<article>
										<div className="flex items-start justify-between gap-3">
											<h2 className="text-base font-semibold leading-snug text-zinc-900">{material.title}</h2>
											<div className="flex items-center gap-1.5">
												{material.file_name ? (
													<span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
														<Paperclip className="h-3 w-3" />
														PDF
													</span>
												) : null}
												<span className="shrink-0 whitespace-nowrap rounded-full bg-brand px-2.5 py-1 text-xs font-medium leading-none text-white">
													{material.category}
												</span>
											</div>
										</div>
										{showPostDates ? <p className="mt-2 text-xs text-zinc-500">{toKoreanDate(material.created_at)}</p> : null}
										<p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-700">
											{material.subtitle || material.content.trim() || (material.file_name ? "PDF 첨부 자료입니다. 상세 페이지에서 바로 볼 수 있습니다." : "")}
										</p>
									</article>
								</Link>
							))
						: null}
				</section>
			</div>

			<BottomTabNav active="material" />
		</main>
	);
}
