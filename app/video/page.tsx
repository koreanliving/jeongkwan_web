"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Home, MessageSquareText, PlayCircle, UserRound } from "lucide-react";
import { supabase } from "../../utils/supabase";

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

function toKoreanDate(value: string) {
	return new Date(value).toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function getYoutubeEmbedUrl(videoUrl: string) {
	try {
		const parsed = new URL(videoUrl);

		if (parsed.hostname.includes("youtu.be")) {
			const videoId = parsed.pathname.replace("/", "");
			return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
		}

		if (parsed.hostname.includes("youtube.com")) {
			if (parsed.pathname.startsWith("/embed/")) {
				return videoUrl;
			}

			const videoId = parsed.searchParams.get("v");
			return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
		}

		return null;
	} catch {
		return null;
	}
}

export default function VideoPage() {
	const [activeTab, setActiveTab] = useState<CategoryTab>("전체");
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

	return (
		<main className="min-h-screen bg-zinc-100 px-5 pb-28 pt-8 text-zinc-800">
			<div className="mx-auto w-full max-w-sm">
				<header>
					<h1 className="text-3xl font-bold tracking-tight text-zinc-900">영상</h1>
					<div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-200/70 p-1.5">
						{categoryTabs.map((tab) => (
							<button
								key={tab}
								type="button"
								onClick={() => setActiveTab(tab)}
								className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
									activeTab === tab
										? "bg-zinc-900 text-white shadow-sm"
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

					{!isLoading && !errorMessage && videos.length === 0 ? (
						<p className="rounded-2xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
							등록된 영상이 없습니다.
						</p>
					) : null}

					{!isLoading && !errorMessage
						? videos.map((video) => {
								const embedUrl = getYoutubeEmbedUrl(video.video_url);

								return (
									<article
										key={video.id}
										className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]"
									>
										<div>
											<h2 className="text-lg font-semibold text-zinc-900">{video.title}</h2>
											{showPostDates ? <p className="mt-1 text-sm text-zinc-500">{toKoreanDate(video.created_at)}</p> : null}
										</div>

										<div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
											{embedUrl ? (
												<iframe
													title={`${video.title} 유튜브 영상`}
													src={embedUrl}
													className="aspect-video w-full"
													allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
													referrerPolicy="strict-origin-when-cross-origin"
													allowFullScreen
												/>
											) : (
												<div className="flex aspect-video w-full items-center justify-center text-sm text-zinc-500">
													유효한 유튜브 링크가 아닙니다.
												</div>
											)}
										</div>
									</article>
								);
							})
						: null}
				</section>
			</div>

			<nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 backdrop-blur-md">
				<ul className="mx-auto grid w-full max-w-sm grid-cols-5 gap-1">
					<li>
						<Link href="/" className="flex w-full flex-col items-center justify-center rounded-2xl py-2 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700">
							<Home className="mb-0.5 h-5 w-5" strokeWidth={2.1} />
							<span>홈</span>
						</Link>
					</li>
					<li>
						<Link href="/video" aria-current="page" className="flex w-full flex-col items-center justify-center rounded-2xl bg-zinc-900 py-2 text-[11px] font-medium text-white shadow-sm transition">
							<PlayCircle className="mb-0.5 h-5 w-5" strokeWidth={2.1} />
							<span>영상</span>
						</Link>
					</li>
					<li>
						<Link href="/material" className="flex w-full flex-col items-center justify-center rounded-2xl py-2 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700">
							<FileText className="mb-0.5 h-5 w-5" strokeWidth={2.1} />
							<span>자료</span>
						</Link>
					</li>
					<li>
						<Link href="/request" className="flex w-full flex-col items-center justify-center rounded-2xl py-2 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700">
							<MessageSquareText className="mb-0.5 h-5 w-5" strokeWidth={2.1} />
							<span>요청</span>
						</Link>
					</li>
					<li>
						<Link href="/mypage" className="flex w-full flex-col items-center justify-center rounded-2xl py-2 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700">
							<UserRound className="mb-0.5 h-5 w-5" strokeWidth={2.1} />
							<span>마이</span>
						</Link>
					</li>
				</ul>
			</nav>
		</main>
	);
}
