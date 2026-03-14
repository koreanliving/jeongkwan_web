"use client";

import { useEffect, useState } from "react";
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

			const { data, error } = await query;

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
			setIsLoading(false);
		};

		fetchVideos();

		return () => {
			isMounted = false;
		};
	}, [activeTab]);

	return (
		<main className="min-h-screen bg-zinc-100 px-5 pb-10 pt-8 text-zinc-800">
			<div className="mx-auto w-full max-w-sm">
				<header>
					<h1 className="text-3xl font-bold tracking-tight text-zinc-900">복습 영상</h1>
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
										<p className="mt-1 text-sm text-zinc-500">{toKoreanDate(video.created_at)}</p>
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
		</main>
	);
}
