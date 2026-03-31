"use client";

import { FormEvent, useEffect, useState } from "react";
import { BottomTabNav } from "@/components/BottomTabNav";
import { AppTopBar } from "@/components/AppTopBar";
import { STUDENT_APP_SHELL, studentComicCard } from "@/lib/appShell";
import { toKoreanDate } from "@/utils/dateFormat";
import { supabase } from "../../utils/supabase";
import { CheckCircle2, Send, UserRound } from "lucide-react";

const requestTypes = ["보강영상", "질문", "상담"] as const;

type RequestType = (typeof requestTypes)[number];
type RequestStatus = "접수" | "처리중" | "완료";

type StudentRequest = {
	id: number;
	request_type: RequestType;
	title: string;
	content: string;
	status: RequestStatus;
	admin_reply: string | null;
	support_video_url: string | null;
	created_at: string;
};

type RequestResponse = {
	student?: { id: string; name: string };
	requests?: StudentRequest[];
	message?: string;
};

type HomeSetting = {
	id: number;
	show_post_dates: boolean;
};

export default function RequestPage() {
	const [studentLabel, setStudentLabel] = useState("");
	const [requestType, setRequestType] = useState<RequestType>("질문");
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [requests, setRequests] = useState<StudentRequest[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [showPostDates, setShowPostDates] = useState(true);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");

	const fetchRequests = async () => {
		setIsLoading(true);
		setError("");
		const response = await fetch("/api/requests", { cache: "no-store" });
		const result = (await response.json()) as RequestResponse;

		if (!response.ok) {
			setError(result.message ?? "요청 내역을 불러오지 못했습니다.");
			setRequests([]);
			setIsLoading(false);
			return;
		}

		setRequests(result.requests ?? []);
		if (result.student) {
			setStudentLabel(`${result.student.name} (${result.student.id})`);
		}
		setIsLoading(false);
	};

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchRequests();
	}, []);

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

		fetchSetting();
		return () => {
			isMounted = false;
		};
	}, []);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setMessage("");

		if (!title.trim() || !content.trim()) {
			setError("제목과 내용을 모두 입력해 주세요.");
			return;
		}

		setIsSubmitting(true);
		const response = await fetch("/api/requests", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				requestType,
				title,
				content,
			}),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setError(result.message ?? "요청 등록에 실패했습니다.");
			setIsSubmitting(false);
			return;
		}

		setTitle("");
		setContent("");
		setRequestType("질문");
		setMessage("요청이 접수되었습니다.");
		setIsSubmitting(false);
		await fetchRequests();
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm("이 요청을 삭제할까요?")) return;
		setDeletingId(id);
		setError("");
		setMessage("");

		const response = await fetch("/api/requests", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setError(result.message ?? "요청 삭제에 실패했습니다.");
			setDeletingId(null);
			return;
		}

		setMessage("요청이 삭제되었습니다.");
		setDeletingId(null);
		await fetchRequests();
	};

	return (
		<main className="relative min-h-screen min-h-[100dvh] bg-app-sage pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-zinc-800">
			<AppTopBar title="질문 및 요청" />

			<div className={`${STUDENT_APP_SHELL} space-y-4 pt-3 sm:space-y-5 sm:pt-4`}>
				<div className={`${studentComicCard} p-4 sm:p-5`}>
					<p className="text-sm font-semibold tracking-tight text-zinc-700">
						보강영상·질문·상담을 남기면 순차적으로 답변드립니다.
					</p>
					{studentLabel ? (
						<p className="mt-2 text-xs font-bold tracking-tight text-zinc-500">현재 사용자: {studentLabel}</p>
					) : null}
				</div>

				<section className={`${studentComicCard} p-5 md:p-6`}>
					<h2 className="text-base font-extrabold tracking-tight text-zinc-900">새 요청</h2>
					<form className="mt-4 space-y-4" onSubmit={handleSubmit}>
						<div>
							<label htmlFor="req-type" className="text-xs font-extrabold tracking-tight text-zinc-600">
								요청 유형
							</label>
							<select
								id="req-type"
								value={requestType}
								onChange={(event) => setRequestType(event.target.value as RequestType)}
								className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-zinc-50 px-4 py-3 text-sm font-bold tracking-tight text-zinc-900 shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
							>
								{requestTypes.map((type) => (
									<option key={type} value={type}>
										{type}
									</option>
								))}
							</select>
						</div>
						<div>
							<label htmlFor="req-title" className="text-xs font-extrabold tracking-tight text-zinc-600">
								제목
							</label>
							<input
								id="req-title"
								type="text"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								placeholder="요청 제목"
								className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-zinc-50 px-4 py-3 text-sm font-semibold tracking-tight text-zinc-900 shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
							/>
						</div>
						<div>
							<label htmlFor="req-content" className="text-xs font-extrabold tracking-tight text-zinc-600">
								내용
							</label>
							<textarea
								id="req-content"
								rows={4}
								value={content}
								onChange={(event) => setContent(event.target.value)}
								placeholder="요청 내용을 자세히 작성해 주세요"
								className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200/90 bg-zinc-50 px-4 py-3 text-sm font-semibold tracking-tight text-zinc-900 shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
							/>
						</div>
						{error ? (
							<p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
						) : null}
						{message ? (
							<p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
								{message}
							</p>
						) : null}
						<button
							type="submit"
							disabled={isSubmitting}
							className="flex w-full min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold tracking-tight text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
						>
							<Send className="h-4 w-4" strokeWidth={2.5} />
							{isSubmitting ? "전송 중..." : "요청 보내기"}
						</button>
					</form>
				</section>

				<section className={`${studentComicCard} p-5 md:p-6`}>
					<h2 className="text-base font-extrabold tracking-tight text-zinc-900">최근 내역</h2>
					{isLoading ? <p className="mt-4 text-sm text-zinc-500">불러오는 중입니다...</p> : null}
					{!isLoading && requests.length === 0 ? (
						<p className="mt-4 text-sm text-zinc-500">등록된 요청이 없습니다.</p>
					) : null}
					<div className="mt-4 space-y-3">
						{requests.map((item) => {
							const done = item.status === "완료";
							return (
								<article
									key={item.id}
									className="flex gap-3 rounded-xl border border-zinc-200/90 bg-zinc-50 p-3 shadow-sm transition hover:bg-white md:p-4"
								>
									<div
										className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 ${
											done ? "bg-slate-100 text-slate-800" : "bg-brand/10 text-brand"
										}`}
									>
										{done ? (
											<CheckCircle2 className="h-5 w-5" strokeWidth={2.25} />
										) : (
											<UserRound className="h-5 w-5" strokeWidth={2} aria-hidden />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<p className="text-xs font-semibold text-zinc-500">{item.request_type}</p>
											<span
												className={`rounded-full border border-zinc-200/90 px-2 py-0.5 text-[10px] font-semibold tracking-tight ${
													done ? "bg-white text-zinc-800" : "bg-zinc-200 text-zinc-700"
												}`}
											>
												{done ? "답변완료" : "답변대기"}
											</span>
										</div>
										<h3 className="mt-1 text-sm font-bold text-zinc-900">{item.title}</h3>
										<p className="mt-1 text-sm text-zinc-600">{item.content}</p>
										{showPostDates ? (
											<p className="mt-2 text-right text-[11px] font-medium text-zinc-400">
												{toKoreanDate(item.created_at)}
											</p>
										) : null}
										{item.admin_reply ? (
											<p className="mt-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
												이정관T: {item.admin_reply}
											</p>
										) : null}
										{item.support_video_url ? (
											<a
												href={item.support_video_url}
												target="_blank"
												rel="noreferrer"
												className="mt-2 inline-flex rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-emerald-50"
											>
												보강 영상 링크 열기
											</a>
										) : null}
										<button
											type="button"
											onClick={() => handleDelete(item.id)}
											disabled={deletingId === item.id}
											className="mt-2 text-xs font-semibold text-rose-600 underline-offset-2 transition hover:underline disabled:opacity-60"
										>
											{deletingId === item.id ? "삭제 중..." : "삭제"}
										</button>
									</div>
								</article>
							);
						})}
					</div>
				</section>
			</div>

			<BottomTabNav active="request" />
		</main>
	);
}
