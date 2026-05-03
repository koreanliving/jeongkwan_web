"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Paperclip } from "lucide-react";
import { BottomTabNav } from "@/components/BottomTabNav";
import { AppTopBar } from "@/components/AppTopBar";
import { StudentCategoryTabs } from "@/components/StudentCategoryTabs";
import { STUDENT_APP_SHELL, studentComicCard } from "@/lib/appShell";
import { toKoreanDate } from "@/utils/dateFormat";
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

function MaterialRowSkeleton() {
	return (
		<li className={`flex items-center gap-3 ${studentComicCard} animate-pulse p-3`}>
			<div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />
			<div className="min-w-0 flex-1 space-y-2">
				<div className="h-4 w-[60%] max-w-[14rem] rounded bg-slate-200" />
				<div className="h-3 w-[40%] max-w-[8rem] rounded bg-slate-100" />
			</div>
			<div className="h-8 w-14 shrink-0 rounded-full bg-slate-200" />
		</li>
	);
}

export default function MaterialPage() {
	const [activeTab, setActiveTab] = useState<CategoryTab>("전체");
	const [materials, setMaterials] = useState<MaterialItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [isAdminUi, setIsAdminUi] = useState(false);
	const [showPostDates, setShowPostDates] = useState(true);

	useEffect(() => {
		let isMounted = true;

		const checkAdminUi = async () => {
			const response = await fetch("/api/auth/admin-status", { credentials: "same-origin", cache: "no-store" });
			if (!isMounted || !response.ok) return;
			const result = (await response.json()) as { isAdmin?: boolean };
			setIsAdminUi(result.isAdmin === true);
		};

		void checkAdminUi();
		return () => {
			isMounted = false;
		};
	}, []);

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
		<main className="min-h-screen min-h-[100dvh] bg-app-sage pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-slate-800">
			<AppTopBar
				title="학습 자료"
				right={
					isAdminUi ? (
						<Link
							href="/admin"
							className="rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold tracking-tight text-slate-900 shadow-sm transition hover:bg-slate-50"
						>
							관리
						</Link>
					) : null
				}
			/>

			<div className={`${STUDENT_APP_SHELL} space-y-4 pt-3 sm:space-y-5 sm:pt-4`}>
				<StudentCategoryTabs tabs={categoryTabs} active={activeTab} onChange={setActiveTab} />

				{isLoading ? (
					<ul className="space-y-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<MaterialRowSkeleton key={i} />
						))}
					</ul>
				) : null}

				{!isLoading && errorMessage ? (
					<p className={`${studentComicCard} border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800`}>
						{errorMessage}
					</p>
				) : null}

				{!isLoading && !errorMessage && materials.length === 0 ? (
					<p className={`${studentComicCard} px-4 py-10 text-center text-sm font-medium text-slate-500`}>등록된 자료가 없습니다.</p>
				) : null}

				{!isLoading && !errorMessage && materials.length > 0 ? (
					<ul className="space-y-3">
						{materials.map((material) => (
							<li key={material.id}>
								<div className={`flex items-center gap-3 ${studentComicCard} p-3 sm:p-3.5`}>
									<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
										<FileText className="h-5 w-5" strokeWidth={2} />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{material.category}</p>
										<h2 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-[15px]">
											{material.title}
										</h2>
										<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
											{showPostDates ? <span>{toKoreanDate(material.created_at)}</span> : null}
											{material.file_name ? (
												<span className="inline-flex items-center gap-1 text-slate-600">
													<Paperclip className="h-3 w-3 shrink-0" />
													PDF
												</span>
											) : null}
										</div>
									</div>
									<Link
										href={`/material/${material.id}`}
										className="shrink-0 touch-manipulation rounded-full bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-brand/20 transition hover:bg-brand-hover active:scale-[0.98] sm:px-4"
									>
										열기
									</Link>
								</div>
							</li>
						))}
					</ul>
				) : null}
			</div>

			<BottomTabNav active="material" />
		</main>
	);
}
