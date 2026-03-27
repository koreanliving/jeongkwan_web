"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Home, MessageSquareText, PlayCircle, UserRound } from "lucide-react";
import { supabase } from "@/utils/supabase";

type ExamRecord = {
	id: number;
	student_id: string;
	exam_name: string;
	score: number;
	grade: number;
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

export default function MyPage() {
	const [auth, setAuth] = useState<"unknown" | "guest" | "user">("unknown");
	const [records, setRecords] = useState<ExamRecord[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [examName, setExamName] = useState("");
	const [scoreInput, setScoreInput] = useState("");
	const [gradeInput, setGradeInput] = useState("");
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [showPostDates, setShowPostDates] = useState(true);
	const [studentLabel, setStudentLabel] = useState("");

	const loadExamRecords = useCallback(async () => {
		setIsLoading(true);
		setError("");
		const response = await fetch("/api/exam-records", { cache: "no-store" });
		const result = (await response.json()) as { records?: ExamRecord[]; message?: string };

		if (!response.ok) {
			setError(result.message ?? "성적을 불러오지 못했습니다.");
			setRecords([]);
			setIsLoading(false);
			return;
		}

		setRecords(result.records ?? []);
		setIsLoading(false);
	}, []);

	const bootstrap = useCallback(async () => {
		setAuth("unknown");
		setIsLoading(true);
		setError("");

		const reqRes = await fetch("/api/requests", { cache: "no-store" });
		const reqData = (await reqRes.json()) as { student?: { id: string; name: string } };

		if (!reqRes.ok || !reqData.student) {
			setAuth("guest");
			setStudentLabel("");
			setRecords([]);
			setIsLoading(false);
			return;
		}

		setAuth("user");
		setStudentLabel(`${reqData.student.name} (${reqData.student.id})`);

		const exRes = await fetch("/api/exam-records", { cache: "no-store" });
		const exData = (await exRes.json()) as { records?: ExamRecord[]; message?: string };

		if (!exRes.ok) {
			setError(exData.message ?? "성적을 불러오지 못했습니다.");
			setRecords([]);
		} else {
			setRecords(exData.records ?? []);
		}
		setIsLoading(false);
	}, []);

	useEffect(() => {
		void bootstrap();
	}, [bootstrap]);

	useEffect(() => {
		let isMounted = true;
		const fetchSetting = async () => {
			const { data, error: settingError } = await supabase
				.from("home_settings")
				.select("id, show_post_dates")
				.eq("id", 1)
				.maybeSingle();

			if (!isMounted || settingError || !data) return;
			const setting = data as HomeSetting;
			setShowPostDates(setting.show_post_dates ?? true);
		};

		void fetchSetting();
		return () => {
			isMounted = false;
		};
	}, []);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setMessage("");

		const name = examName.trim();
		const score = Number.parseInt(scoreInput, 10);
		const grade = Number.parseInt(gradeInput, 10);

		if (!name) {
			setError("시험 이름을 입력해 주세요.");
			return;
		}
		if (!Number.isFinite(score) || !Number.isInteger(score)) {
			setError("점수는 정수로 입력해 주세요.");
			return;
		}
		if (!Number.isFinite(grade) || !Number.isInteger(grade)) {
			setError("등급은 정수로 입력해 주세요.");
			return;
		}

		setIsSubmitting(true);
		const response = await fetch("/api/exam-records", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				examName: name,
				score,
				grade,
			}),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setError(result.message ?? "성적 등록에 실패했습니다.");
			setIsSubmitting(false);
			return;
		}

		setExamName("");
		setScoreInput("");
		setGradeInput("");
		setMessage("성적이 등록되었습니다.");
		setIsSubmitting(false);
		await loadExamRecords();
	};

	return (
		<main className="relative min-h-screen bg-zinc-100 px-5 pb-28 pt-8 text-zinc-800">
			<div className="mx-auto w-full max-w-sm">
				<header className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
					<h1 className="text-2xl font-bold tracking-tight text-zinc-900">마이페이지</h1>
					<p className="mt-2 text-sm text-zinc-600">나의 성적을 확인하고 기록할 수 있습니다.</p>
					{studentLabel ? <p className="mt-2 text-xs text-zinc-500">현재 사용자: {studentLabel}</p> : null}
				</header>

				{auth === "guest" ? (
					<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
						<p className="text-sm text-zinc-600">성적을 보려면 학생 로그인이 필요합니다.</p>
						<Link
							href="/login"
							className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700"
						>
							로그인하기
						</Link>
					</section>
				) : null}

				{auth === "unknown" ? (
					<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
						<p className="text-sm text-zinc-600">불러오는 중입니다…</p>
					</section>
				) : null}

				{auth === "user" ? (
					<>
						<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
							<h2 className="text-base font-semibold text-zinc-900">성적 추가</h2>
							<form className="mt-3 space-y-3" onSubmit={handleSubmit}>
								<input
									type="text"
									value={examName}
									onChange={(e) => setExamName(e.target.value)}
									placeholder="시험 이름"
									className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
								/>
								<div className="grid grid-cols-2 gap-2">
									<input
										type="number"
										inputMode="numeric"
										value={scoreInput}
										onChange={(e) => setScoreInput(e.target.value)}
										placeholder="점수"
										className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
									/>
									<input
										type="number"
										inputMode="numeric"
										value={gradeInput}
										onChange={(e) => setGradeInput(e.target.value)}
										placeholder="등급"
										className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
									/>
								</div>
								{error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
								{message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
								<button
									type="submit"
									disabled={isSubmitting}
									className="inline-flex min-h-10 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
								>
									{isSubmitting ? "등록 중..." : "성적 등록"}
								</button>
							</form>
						</section>

						<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
							<h2 className="text-base font-semibold text-zinc-900">내 성적</h2>
							{isLoading ? <p className="mt-3 text-sm text-zinc-600">불러오는 중입니다…</p> : null}
							{!isLoading && error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
							{!isLoading && !error && records.length === 0 ? (
								<p className="mt-3 text-sm text-zinc-500">등록된 성적이 없습니다.</p>
							) : null}
							<ul className="mt-3 space-y-2">
								{records.map((row) => (
									<li key={row.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
										<div className="flex items-start justify-between gap-2">
											<p className="text-sm font-semibold text-zinc-900">{row.exam_name}</p>
											<span className="shrink-0 text-xs text-zinc-500">
												{showPostDates ? toKoreanDate(row.created_at) : ""}
											</span>
										</div>
										<p className="mt-1 text-sm text-zinc-700">
											점수 <span className="font-medium text-zinc-900">{row.score}</span>
											{" · "}
											등급 <span className="font-medium text-zinc-900">{row.grade}</span>
										</p>
									</li>
								))}
							</ul>
						</section>
					</>
				) : null}
			</div>

			<nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 backdrop-blur-md">
				<ul className="mx-auto grid w-full max-w-sm grid-cols-5 gap-1">
					<li>
						<Link
							href="/"
							className="flex w-full flex-col items-center justify-center rounded-2xl py-2 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
						>
							<Home className="mb-0.5 h-5 w-5" strokeWidth={2.1} />
							<span>홈</span>
						</Link>
					</li>
					<li>
						<Link
							href="/video"
							className="flex w-full flex-col items-center justify-center rounded-2xl py-2 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
						>
							<PlayCircle className="mb-0.5 h-5 w-5" strokeWidth={2.1} />
							<span>영상</span>
						</Link>
					</li>
					<li>
						<Link
							href="/material"
							className="flex w-full flex-col items-center justify-center rounded-2xl py-2 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
						>
							<FileText className="mb-0.5 h-5 w-5" strokeWidth={2.1} />
							<span>자료</span>
						</Link>
					</li>
					<li>
						<Link
							href="/request"
							className="flex w-full flex-col items-center justify-center rounded-2xl py-2 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
						>
							<MessageSquareText className="mb-0.5 h-5 w-5" strokeWidth={2.1} />
							<span>요청</span>
						</Link>
					</li>
					<li>
						<Link
							href="/mypage"
							aria-current="page"
							className="flex w-full flex-col items-center justify-center rounded-2xl bg-zinc-900 py-2 text-[11px] font-medium text-white shadow-sm transition"
						>
							<UserRound className="mb-0.5 h-5 w-5" strokeWidth={2.1} />
							<span>마이</span>
						</Link>
					</li>
				</ul>
			</nav>
		</main>
	);
}
