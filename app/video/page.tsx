"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomTabNav } from "@/components/BottomTabNav";
import { AppTopBar } from "@/components/AppTopBar";
import { StudentCategoryTabs } from "@/components/StudentCategoryTabs";
import { STUDENT_APP_SHELL, studentComicCard } from "@/lib/appShell";
import { getYoutubeThumbnailUrl } from "@/lib/youtube";
import { toKoreanDate } from "@/utils/dateFormat";
import { supabase } from "../../utils/supabase";
import { Play, Search } from "lucide-react";

const categoryTabs = ["전체", "문학", "비문학"] as const;

type CategoryTab = (typeof categoryTabs)[number];

type VideoItem = {
	id: number;
	title: string;
	video_url: string;
	category: "문학" | "비문학";
	created_at: string;
};

type HomeSetting = {
	id: number;
	show_post_dates: boolean;
};

export default function VideoPage() {
	const [activeTab, setActiveTab] = useState<CategoryTab>("전체");
	const [sortDesc, setSortDesc] = useState(true);
	const [videos, setVideos] = useState<VideoItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [showPostDates, setShowPostDates] = useState(true);

	useEffect(() => {
		let isMounted = true;

		const fetchVideos = async () => {
			setIsLoading(true);
			setErrorMessage("");

			let query = supabase
				.from("videos")
				.select("id, title, video_url, category, created_at")
				.order("created_at", { ascending: false });

			if (activeTab !== "전체") {
				query = query.eq("category", activeTab);
			}

			const [videoResult, settingResult] = await Promise.all([
				query,
				supabase.from("home_settings").select("id, show_post_dates").eq("id", 1).maybeSingle(),
			]);
			const { data, error } = videoResult;

			if (!isMounted) {
				return;
			}

			if (error) {
				setErrorMessage("영상 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
				setVideos([]);
				setIsLoading(false);
				return;
			}

			setVideos((data ?? []) as VideoItem[]);
			if (!settingResult.error && settingResult.data) {
				const setting = settingResult.data as HomeSetting;
				setShowPostDates(setting.show_post_dates ?? true);
			}
			setIsLoading(false);
		};

		fetchVideos();

		return () => {
			isMounted = false;
		};
	}, [activeTab]);

	const sortedVideos = useMemo(() => {
		const v = [...videos];
		v.sort((a, b) => {
			const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
			return sortDesc ? -t : t;
		});
		return v;
	}, [videos, sortDesc]);

	return (
		<main className="min-h-screen min-h-[100dvh] bg-app-sage pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-zinc-800">
			<AppTopBar
				title="영상 자료"
				right={
					<button
						type="button"
						className="comic-border flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-white text-zinc-900 shadow-sm transition hover:bg-zinc-50 active:translate-x-px active:translate-y-px active:shadow-none"
						aria-label="목록으로 이동"
						onClick={() => document.getElementById("video-list")?.scrollIntoView({ behavior: "smooth" })}
					>
						<Search className="h-4 w-4" strokeWidth={2.5} />
					</button>
				}
			/>

			<div className={`${STUDENT_APP_SHELL} space-y-4 pt-3 sm:space-y-5 sm:pt-4`}>
				<StudentCategoryTabs tabs={categoryTabs} active={activeTab} onChange={setActiveTab} />

				{isLoading ? (
					<p className={`${studentComicCard} px-4 py-10 text-center text-sm font-bold tracking-tight text-zinc-500`}>
						데이터를 불러오는 중입니다...
					</p>
				) : null}

				{!isLoading && errorMessage ? (
					<p className={`${studentComicCard} border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800`}>
						{errorMessage}
					</p>
				) : null}

				{!isLoading && !errorMessage && videos.length === 0 ? (
					<p className={`${studentComicCard} px-4 py-10 text-center text-sm font-bold tracking-tight text-zinc-500`}>
						등록된 영상이 없습니다.
					</p>
				) : null}

				<section id="video-list" className="scroll-mt-4">
					<div className="mb-3 flex items-center justify-between gap-2">
						<h2 className="text-base font-extrabold tracking-tight text-zinc-900">전체 목록</h2>
						<select
							value={sortDesc ? "latest" : "oldest"}
							onChange={(e) => setSortDesc(e.target.value === "latest")}
							className="rounded-xl border border-zinc-200/90 bg-white px-2 py-1.5 text-xs font-semibold tracking-tight text-zinc-800 shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
						>
							<option value="latest">최신순</option>
							<option value="oldest">오래된순</option>
						</select>
					</div>
					<ul className="space-y-3">
						{sortedVideos.map((video) => {
							const thumb = getYoutubeThumbnailUrl(video.video_url);
							return (
								<li key={video.id}>
									<a
										href={video.video_url}
										target="_blank"
										rel="noreferrer"
										className="group flex gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-md transition hover:translate-x-px hover:translate-y-px hover:shadow-sm md:gap-4 md:p-4"
									>
										<div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg border border-zinc-200/90 bg-zinc-200 md:h-28 md:w-44">
											{thumb ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img src={thumb} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
											) : (
												<div className="flex h-full w-full items-center justify-center bg-zinc-300 text-zinc-500">
													<Play className="h-8 w-8" />
												</div>
											)}
											<span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
												재생
											</span>
											<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
												<Play className="h-10 w-10 text-white drop-shadow-md" strokeWidth={2.5} />
											</div>
										</div>
										<div className="flex min-w-0 flex-1 flex-col justify-center">
											<span className="text-[10px] font-extrabold tracking-tight text-zinc-600">{video.category}</span>
											<p className="mt-0.5 line-clamp-2 text-sm font-extrabold tracking-tight text-zinc-900">{video.title}</p>
											<p className="mt-1 text-xs text-zinc-500">
												{showPostDates ? `${toKoreanDate(video.created_at)} · ` : null}
												유튜브에서 보기
											</p>
										</div>
									</a>
								</li>
							);
						})}
					</ul>
				</section>
			</div>

			<BottomTabNav active="video" />
		</main>
	);
}
