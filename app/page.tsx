"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";
import { BottomTabNav } from "@/components/BottomTabNav";

type AnnouncementItem = {
	id: number;
	title: string;
	content: string;
	created_at: string;
};

type MaterialPreviewItem = {
	id: number;
	title: string;
	category: "문학" | "비문학";
	created_at: string;
};

type HomeSetting = {
	id: number;
	welcome_title: string;
	welcome_subtitle: string;
	show_post_dates: boolean;
};

function toKoreanDate(value: string) {
	return new Date(value).toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export default function HomePage() {
	const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
	const [latestMaterials, setLatestMaterials] = useState<MaterialPreviewItem[]>([]);
	const [welcomeTitle, setWelcomeTitle] = useState("강의실에 오신 것을 환영합니다!");
	const [welcomeSubtitle, setWelcomeSubtitle] = useState("오늘도 즐거운 배움이 가득한 하루를 시작해 보세요.");
	const [showPostDates, setShowPostDates] = useState(true);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");

	useEffect(() => {
		let isMounted = true;

		const fetchHomeData = async () => {
			setIsLoading(true);
			setErrorMessage("");

			const [announcementResult, materialResult, settingResult] = await Promise.all([
				supabase
					.from("announcements")
					.select("id, title, content, created_at")
					.order("created_at", { ascending: false })
					.limit(3),
				supabase
					.from("materials")
					.select("id, title, category, created_at")
					.order("created_at", { ascending: false })
					.limit(2),
				supabase.from("home_settings").select("id, welcome_title, welcome_subtitle, show_post_dates").eq("id", 1).maybeSingle(),
			]);

			if (!isMounted) {
				return;
			}

			if (announcementResult.error || materialResult.error) {
				setErrorMessage("홈 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
				setAnnouncements([]);
				setLatestMaterials([]);
				setIsLoading(false);
				return;
			}

			setAnnouncements((announcementResult.data ?? []) as AnnouncementItem[]);
			setLatestMaterials((materialResult.data ?? []) as MaterialPreviewItem[]);

			if (!settingResult.error && settingResult.data) {
				const setting = settingResult.data as HomeSetting;
				setWelcomeTitle(setting.welcome_title || "강의실에 오신 것을 환영합니다!");
				setWelcomeSubtitle(setting.welcome_subtitle || "오늘도 즐거운 배움이 가득한 하루를 시작해 보세요.");
				setShowPostDates(setting.show_post_dates ?? true);
			}

			setIsLoading(false);
		};

		fetchHomeData();

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<main className="relative min-h-screen bg-zinc-100">
			<div className="mx-auto w-full max-w-sm px-5 pb-28 pt-8">
				<section className="rounded-3xl border border-zinc-200 bg-white/85 p-7 text-center shadow-[0_18px_45px_-25px_rgba(0,0,0,0.35)] backdrop-blur-sm">
					<h1 className="text-2xl font-bold tracking-tight text-zinc-800">
						{welcomeTitle}
					</h1>
					<p className="mt-3 text-sm leading-relaxed text-zinc-500">
						{welcomeSubtitle}
					</p>
				</section>

				<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
					<h2 className="text-base font-semibold text-zinc-900">공지사항</h2>

					{isLoading ? (
						<p className="mt-3 text-sm text-zinc-600">데이터를 불러오는 중입니다...</p>
					) : null}

					{!isLoading && errorMessage ? (
						<p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
							{errorMessage}
						</p>
					) : null}

					{!isLoading && !errorMessage && announcements.length === 0 ? (
						<p className="mt-3 text-sm text-zinc-500">등록된 공지사항이 없습니다.</p>
					) : null}

					{!isLoading && !errorMessage && announcements.length > 0 ? (
						<ul className="mt-3 space-y-2">
							{announcements.map((announcement) => (
								<li key={announcement.id} className="rounded-2xl bg-zinc-100 px-3 py-2.5">
									<p className="text-sm font-semibold text-zinc-900">{announcement.title || "공지"}</p>
									<p className="text-sm leading-relaxed text-zinc-800">{announcement.content}</p>
									{showPostDates ? <p className="mt-1 text-xs text-zinc-500">{toKoreanDate(announcement.created_at)}</p> : null}
								</li>
							))}
						</ul>
					) : null}
				</section>

				<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
					<div className="flex items-center justify-between">
						<h2 className="text-base font-semibold text-zinc-900">최신 학습 자료</h2>
						<Link href="/material" className="text-xs font-semibold text-zinc-600 hover:text-zinc-900">
							전체보기
						</Link>
					</div>

					{isLoading ? (
						<p className="mt-3 text-sm text-zinc-600">데이터를 불러오는 중입니다...</p>
					) : null}

					{!isLoading && !errorMessage && latestMaterials.length === 0 ? (
						<p className="mt-3 text-sm text-zinc-500">등록된 최신 자료가 없습니다.</p>
					) : null}

					{!isLoading && !errorMessage && latestMaterials.length > 0 ? (
						<ul className="mt-3 space-y-2">
							{latestMaterials.map((material) => (
								<li
									key={material.id}
									className="rounded-2xl bg-zinc-100"
								>
									<Link href={`/material/${material.id}`} className="flex items-center justify-between px-3 py-2.5">
										<div>
											<p className="text-sm font-medium text-zinc-800">{material.title}</p>
											{showPostDates ? <p className="mt-1 text-xs text-zinc-500">{toKoreanDate(material.created_at)}</p> : null}
										</div>
										<span className="shrink-0 whitespace-nowrap rounded-full bg-brand px-2.5 py-1 text-xs font-medium leading-none text-white">
											{material.category}
										</span>
									</Link>
								</li>
							))}
						</ul>
					) : null}
				</section>
			</div>

			<BottomTabNav active="home" />
		</main>
	);
}
