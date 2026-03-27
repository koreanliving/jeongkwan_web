"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
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
	show_post_dates: boolean;
};

function toKoreanDate(value: string) {
	return new Date(value).toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/** 임시 어휘 데이터 — 추후 DB·CMS로 이전 가능 */
const DAILY_VOCAB_LIST = [
	{
		word: "미봉책",
		meaning:
			"‘꿰매어 깁는다’는 뜻에서 나온 말로, 당장의 위기나 허점을 임시로 메우며 넘기는 꾀를 가리킨다. 근본 해결 없이 상황만 봉합하는 계략이라는 뉘앙스가 있다.",
	},
	{
		word: "반면교사",
		meaning:
			"‘거울’(鑑)을 보듯 남의 잘못이나 실패를 통해 스스로의 교훈으로 삼는다는 뜻이다. 비판만이 아니라 자기 성찰과 개선으로 이어지는 태도를 나타낸다.",
	},
] as const;

/** 한국(서울) 달력 날짜가 바뀔 때마다 다른 인덱스 — 자정 기준은 해당 타임존의 날짜 전환 */
function getDailyVocabIndex(length: number): number {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Seoul",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const y = Number(parts.find((p) => p.type === "year")?.value ?? 0);
	const m = Number(parts.find((p) => p.type === "month")?.value ?? 0);
	const d = Number(parts.find((p) => p.type === "day")?.value ?? 0);
	const dayKey = y * 10_000 + m * 100 + d;
	return dayKey % length;
}

export default function HomePage() {
	const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
	const [latestMaterials, setLatestMaterials] = useState<MaterialPreviewItem[]>([]);
	const [welcomeTitle, setWelcomeTitle] = useState("강의실에 오신 것을 환영합니다!");
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
				supabase.from("home_settings").select("id, welcome_title, show_post_dates").eq("id", 1).maybeSingle(),
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
				setShowPostDates(setting.show_post_dates ?? true);
			}

			setIsLoading(false);
		};

		fetchHomeData();

		return () => {
			isMounted = false;
		};
	}, []);

	const vocabIndex = getDailyVocabIndex(DAILY_VOCAB_LIST.length);
	const todayVocab = DAILY_VOCAB_LIST[vocabIndex];

	return (
		<main className="relative min-h-screen bg-zinc-100">
			<div className="mx-auto w-full max-w-sm px-5 pb-28 pt-8">
				<section
					className="flex min-h-[152px] flex-col items-center justify-center rounded-3xl border border-white/15 bg-brand px-6 py-10 text-center shadow-[0_20px_50px_-28px_rgba(43,91,63,0.55)]"
					aria-label="메인 환영 배너"
				>
					<h1 className="max-w-[18rem] text-balance text-xl font-extrabold leading-snug tracking-tight text-white sm:text-2xl">
						{welcomeTitle}
					</h1>
				</section>

				<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
					<h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
						<Bell className="h-4 w-4 shrink-0 text-brand" strokeWidth={2} aria-hidden />
						공지사항
					</h2>

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
					<h2 className="text-base font-semibold text-zinc-900">오늘의 수능 필수 어휘</h2>
					<div className="mt-3 rounded-2xl bg-zinc-100 px-3 py-3">
						<p className="text-sm font-semibold text-brand">{todayVocab.word}</p>
						<p className="mt-2 text-sm leading-relaxed text-zinc-800">{todayVocab.meaning}</p>
					</div>
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
