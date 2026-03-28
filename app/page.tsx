"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Shuffle, UserRound, X } from "lucide-react";
import { supabase } from "../utils/supabase";
import { BottomTabNav } from "@/components/BottomTabNav";
import { STUDENT_APP_SHELL, studentComicCard } from "@/lib/appShell";

type AnnouncementItem = {
	id: number;
	title: string;
	content: string;
	created_at: string;
};

type UnreadMaterialItem = {
	id: number;
	title: string;
	category: string;
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

function relativeTimeKo(iso: string) {
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.floor(diff / 60000);
	if (m < 1) return "방금 전";
	if (m < 60) return `${m}분 전`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}시간 전`;
	const d = Math.floor(h / 24);
	if (d < 7) return `${d}일 전`;
	return toKoreanDate(iso);
}

const DAILY_VOCAB_LIST = [
	{
		word: "미봉책",
		tag: "오늘의 어휘",
		meaning:
			"‘꿰매어 깁는다’는 뜻에서 나온 말로, 당장의 위기나 허점을 임시로 메우며 넘기는 꾀를 가리킨다. 근본 해결 없이 상황만 봉합하는 계략이라는 뉘앙스가 있다.",
	},
	{
		word: "반면교사",
		tag: "오늘의 어휘",
		meaning:
			"‘거울’(鑑)을 보듯 남의 잘못이나 실패를 통해 스스로의 교훈으로 삼는다는 뜻이다. 비판만이 아니라 자기 성찰과 개선으로 이어지는 태도를 나타낸다.",
	},
] as const;

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
	const [unreadMaterials, setUnreadMaterials] = useState<UnreadMaterialItem[]>([]);
	const [showPostDates, setShowPostDates] = useState(true);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState("");
	const [studentName, setStudentName] = useState("");
	const [targetUniversity, setTargetUniversity] = useState("");
	const [vocabShuffle, setVocabShuffle] = useState(0);
	const [activeVocabWord, setActiveVocabWord] = useState<string | null>(null);
	const [openAnnouncement, setOpenAnnouncement] = useState<AnnouncementItem | null>(null);

	useEffect(() => {
		if (!openAnnouncement) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpenAnnouncement(null);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [openAnnouncement]);

	useEffect(() => {
		let isMounted = true;

		const fetchHomeData = async () => {
			setIsLoading(true);
			setErrorMessage("");

			const [announcementResult, settingResult, profileRes, unreadRes] = await Promise.all([
				supabase
					.from("announcements")
					.select("id, title, content, created_at")
					.order("created_at", { ascending: false })
					.limit(12),
				supabase.from("home_settings").select("id, show_post_dates").eq("id", 1).maybeSingle(),
				fetch("/api/student/profile", { credentials: "same-origin" }),
				fetch("/api/student/unread-materials", { credentials: "same-origin" }),
			]);

			if (!isMounted) {
				return;
			}

			if (announcementResult.error) {
				setErrorMessage("홈 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
				setAnnouncements([]);
			} else {
				setAnnouncements((announcementResult.data ?? []) as AnnouncementItem[]);
			}

			if (!settingResult.error && settingResult.data) {
				const setting = settingResult.data as HomeSetting;
				setShowPostDates(setting.show_post_dates ?? true);
			}

			if (profileRes.ok) {
				const profileJson = (await profileRes.json()) as {
					name?: string;
					targetUniversity?: string;
				};
				setStudentName((profileJson.name ?? "").trim());
				setTargetUniversity((profileJson.targetUniversity ?? "").trim());
			} else {
				setStudentName("");
				setTargetUniversity("");
			}

			if (unreadRes.ok) {
				const unreadJson = (await unreadRes.json()) as { items?: UnreadMaterialItem[] };
				setUnreadMaterials(unreadJson.items ?? []);
			} else {
				setUnreadMaterials([]);
			}

			setIsLoading(false);
		};

		fetchHomeData();

		return () => {
			isMounted = false;
		};
	}, []);

	const n = DAILY_VOCAB_LIST.length;
	const baseIdx = getDailyVocabIndex(n);
	const offset = (baseIdx + vocabShuffle) % n;
	const vocabPair: (typeof DAILY_VOCAB_LIST)[number][] =
		n <= 1
			? [DAILY_VOCAB_LIST[0]]
			: [DAILY_VOCAB_LIST[offset], DAILY_VOCAB_LIST[(offset + 1) % n]];

	const activeMeaning =
		activeVocabWord === null
			? null
			: (DAILY_VOCAB_LIST.find((v) => v.word === activeVocabWord)?.meaning ?? null);

	const welcomeHeadline = studentName ? `${studentName} 학생 환영합니다` : "학생 환영합니다";
	const targetSubtitle = targetUniversity
		? `${targetUniversity}에 입학할 학생을 응원합니다`
		: "마이페이지에 목표 대학을 입력해주세요";

	return (
		<main className="relative min-h-screen min-h-[100dvh] bg-app-sage pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
			<div className="app-home-top border-b border-slate-200/80 py-10 sm:py-12 md:py-14 pt-[max(0.5rem,env(safe-area-inset-top))]">
				<div className={`${STUDENT_APP_SHELL}`}>
					<div className="flex items-center gap-4 sm:gap-5">
						<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand sm:h-[4.5rem] sm:w-[4.5rem]">
							<UserRound className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2} aria-hidden />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-lg font-bold leading-snug tracking-tight text-slate-900 sm:text-xl md:text-2xl">{welcomeHeadline}</p>
							<p className="mt-1.5 text-sm font-medium leading-snug text-slate-500 sm:text-base">{targetSubtitle}</p>
						</div>
					</div>
				</div>
			</div>

			<section className="border-b border-slate-200/80 bg-white pb-4 pt-4">
				<div className={`${STUDENT_APP_SHELL} space-y-3`}>
					{isLoading ? <p className="text-sm text-slate-500">공지를 불러오는 중…</p> : null}
					{!isLoading && errorMessage ? (
						<p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
					) : null}
					{!isLoading && !errorMessage && announcements.length === 0 ? (
						<p className="text-sm text-slate-500">등록된 공지가 없습니다.</p>
					) : null}
					{!isLoading && !errorMessage && announcements.length > 0
						? announcements.map((a) => (
								<button
									key={a.id}
									type="button"
									onClick={() => setOpenAnnouncement(a)}
									className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand to-brand-hover px-4 py-3.5 text-left text-white shadow-md shadow-brand/25 transition hover:opacity-[0.97] active:scale-[0.99]"
								>
									<div className="min-w-0">
										<p className="text-[11px] font-medium text-white/85">공지</p>
										<p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{a.title || "새 공지"}</p>
										{showPostDates ? (
											<p className="mt-1 text-[10px] font-medium text-white/75">{relativeTimeKo(a.created_at)}</p>
										) : null}
									</div>
									<ChevronRight className="h-5 w-5 shrink-0 text-white/90" strokeWidth={2.25} aria-hidden />
								</button>
							))
						: null}
				</div>
			</section>

			{!isLoading && unreadMaterials.length > 0 ? (
				<div className={`${STUDENT_APP_SHELL} pt-4`}>
					<section>
						<h2 className="mb-2 text-sm font-bold text-slate-800">새로 확인할 자료</h2>
						<ul className="space-y-2">
							{unreadMaterials.map((m) => (
								<li key={m.id}>
									<Link
										href={`/material/${m.id}`}
										className={`flex items-center gap-2.5 ${studentComicCard} p-2.5 transition hover:border-brand/20 hover:shadow-sm`}
									>
										<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
											<FileText className="h-4 w-4" strokeWidth={2} />
										</div>
										<div className="min-w-0 flex-1">
											<p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-900">{m.title}</p>
											<div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
												<span className="font-medium text-brand/90">{m.category}</span>
												{showPostDates ? <span>{toKoreanDate(m.created_at)}</span> : null}
											</div>
										</div>
										<ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
									</Link>
								</li>
							))}
						</ul>
					</section>
				</div>
			) : null}

			<div className={`${STUDENT_APP_SHELL} space-y-5 pt-5`}>
				<div
					className={`${studentComicCard} p-2 sm:p-2.5`}
					onMouseLeave={() => setActiveVocabWord(null)}
				>
					<div className="flex items-start justify-between gap-2">
						<h2 className="text-sm font-bold leading-tight tracking-tight text-slate-900 sm:text-base">오늘의 어휘</h2>
						<button
							type="button"
							onClick={() => {
								setVocabShuffle((s) => s + 1);
								setActiveVocabWord(null);
							}}
							className="comic-border flex h-7 w-7 shrink-0 touch-manipulation items-center justify-center rounded-lg bg-white text-slate-600 transition hover:bg-slate-50 active:scale-95"
							aria-label="다른 어휘 조합 보기"
						>
							<Shuffle className="h-3 w-3" strokeWidth={2.25} />
						</button>
					</div>

					<div
						className={`mt-2 grid gap-1.5 ${n <= 1 ? "grid-cols-1" : "grid-cols-2"}`}
						role="group"
						aria-label="오늘의 어휘 단어"
					>
						{vocabPair.map((v) => {
							const isActive = activeVocabWord === v.word;
							return (
								<button
									key={v.word}
									type="button"
									onMouseEnter={() => setActiveVocabWord(v.word)}
									onClick={() => setActiveVocabWord((cur) => (cur === v.word ? null : v.word))}
									aria-pressed={isActive}
									aria-describedby={isActive ? "vocab-meaning-panel" : undefined}
									className={`vocab-highlight-chip flex min-h-[2rem] touch-manipulation items-center justify-center rounded-xl px-1.5 py-1.5 text-center text-sm font-semibold text-slate-800 transition sm:min-h-[2.25rem] sm:text-base ${
										isActive ? "ring-1 ring-brand/35 ring-offset-1 ring-offset-white" : ""
									} `}
								>
									{v.word}
								</button>
							);
						})}
					</div>

					<div
						id="vocab-meaning-panel"
						className="mt-2 min-h-[2.5rem] rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-2 sm:min-h-[2.75rem] sm:px-2.5"
						role="region"
						aria-live="polite"
						aria-label="선택한 단어의 뜻"
					>
						{activeMeaning ? (
							<p className="vocab-meaning-text text-xs leading-relaxed sm:text-[13px]">{activeMeaning}</p>
						) : (
							<p className="text-center text-[10px] font-medium leading-relaxed text-slate-500 sm:text-left sm:text-xs">
								<span className="hidden sm:inline">단어에 마우스를 올리면 이곳에 뜻이 나타납니다.</span>
								<span className="sm:hidden">단어를 누르면 이곳에 뜻이 나타납니다.</span>
							</p>
						)}
					</div>
				</div>
			</div>

			{openAnnouncement ? (
				<div
					className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center sm:p-4"
					role="dialog"
					aria-modal="true"
					aria-labelledby="announcement-dialog-title"
					onClick={() => setOpenAnnouncement(null)}
				>
					<div
						className={`${studentComicCard} flex max-h-[min(88dvh,28rem)] w-full max-w-lg flex-col overflow-hidden sm:max-h-[min(85vh,32rem)]`}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/90 bg-white px-4 py-3">
							<h3 id="announcement-dialog-title" className="min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-slate-800">
								{openAnnouncement.title || "공지"}
							</h3>
							<button
								type="button"
								onClick={() => setOpenAnnouncement(null)}
								className="comic-border flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full bg-slate-50 text-slate-600 transition hover:bg-slate-100"
								aria-label="닫기"
							>
								<X className="h-4 w-4" strokeWidth={2.25} />
							</button>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
							<p className="vocab-meaning-text whitespace-pre-wrap text-[13px] sm:text-sm">
								{openAnnouncement.content?.trim() || "내용이 없습니다."}
							</p>
							{showPostDates ? (
								<p className="mt-4 text-xs font-medium tracking-tight text-slate-500">
									{relativeTimeKo(openAnnouncement.created_at)}
								</p>
							) : null}
						</div>
						<div className="shrink-0 border-t border-slate-200/90 bg-slate-50/80 p-3">
							<button
								type="button"
								onClick={() => setOpenAnnouncement(null)}
								className="w-full touch-manipulation rounded-xl bg-brand py-2.5 text-sm font-semibold tracking-tight text-white shadow-md shadow-brand/25 transition hover:bg-brand-hover active:scale-[0.99]"
							>
								닫기
							</button>
						</div>
					</div>
				</div>
			) : null}

			<BottomTabNav active="home" />
		</main>
	);
}
