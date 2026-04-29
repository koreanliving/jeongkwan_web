"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppTopBar } from "@/components/AppTopBar";
import { ExamTrendChartLazy } from "@/components/ExamTrendChartLazy";
import { STUDENT_APP_SHELL, studentComicCard } from "@/lib/appShell";
import type { ExamRecord } from "@/utils/examRecordsMemos";
import { toKoreanDate } from "@/utils/dateFormat";
import { supabase } from "@/utils/supabase";
import { CheckCircle2, LogOut, Send, UserRound } from "lucide-react";

type ParentClassReportRow = {
	id: number;
	group_id: number;
	group_name: string;
	week_label: string;
	content: string;
	created_at: string;
	updated_at: string;
};

const requestTypes = ["보강영상", "질문", "상담"] as const;
type RequestType = (typeof requestTypes)[number];
type RequestStatus = "접수" | "처리중" | "완료";

type ParentRequest = {
	id: number;
	request_type: RequestType;
	title: string;
	content: string;
	status: RequestStatus;
	admin_reply: string | null;
	support_video_url: string | null;
	created_at: string;
};

type ProfilePayload = {
	parent: { id: string; username: string; name: string };
	student: {
		id: string;
		username: string;
		name: string;
		academy: string;
		grade: string | null;
		targetUniversity: string;
		targetDepartment: string;
		isApproved: boolean;
	};
};

type HomeSetting = {
	id: number;
	show_post_dates: boolean;
};

type ParentSection = "report" | "grades" | "inquiry";

const parentNavItems: { id: ParentSection; label: string }[] = [
	{ id: "report", label: "수업 리포트" },
	{ id: "grades", label: "성적 추이" },
	{ id: "inquiry", label: "문의" },
];

export default function ParentHomePage() {
	const router = useRouter();
	const [profile, setProfile] = useState<ProfilePayload | null>(null);
	const [records, setRecords] = useState<ExamRecord[]>([]);
	const [recordsError, setRecordsError] = useState("");
	const [reports, setReports] = useState<ParentClassReportRow[]>([]);
	const [reportsError, setReportsError] = useState("");
	const [requests, setRequests] = useState<ParentRequest[]>([]);
	const [requestsLoadError, setRequestsLoadError] = useState("");
	const [isBootstrapping, setIsBootstrapping] = useState(true);
	const [showPostDates, setShowPostDates] = useState(true);

	const [requestType, setRequestType] = useState<RequestType>("질문");
	const [reqTitle, setReqTitle] = useState("");
	const [reqContent, setReqContent] = useState("");
	const [isSubmittingReq, setIsSubmittingReq] = useState(false);
	const [deletingReqId, setDeletingReqId] = useState<number | null>(null);
	const [formError, setFormError] = useState("");
	const [formMessage, setFormMessage] = useState("");
	const [activeSection, setActiveSection] = useState<ParentSection>("report");

	const bootstrap = useCallback(async () => {
		setIsBootstrapping(true);
		setRecordsError("");
		setReportsError("");
		setRequestsLoadError("");

		const profRes = await fetch("/api/parent/profile", { cache: "no-store" });
		if (!profRes.ok) {
			router.replace("/parent-login");
			return;
		}
		const profJson = (await profRes.json()) as ProfilePayload;
		setProfile(profJson);

		const [exRes, repRes, reqRes] = await Promise.all([
			fetch("/api/parent/exam-records", { cache: "no-store" }),
			fetch("/api/parent/class-report", { cache: "no-store" }),
			fetch("/api/parent/requests", { cache: "no-store" }),
		]);

		if (exRes.ok) {
			const exJson = (await exRes.json()) as { records?: ExamRecord[] };
			setRecords(exJson.records ?? []);
		} else {
			const j = (await exRes.json()) as { message?: string };
			setRecords([]);
			setRecordsError(j.message ?? "성적을 불러오지 못했습니다.");
		}

		if (repRes.ok) {
			const repJson = (await repRes.json()) as { reports?: ParentClassReportRow[] };
			setReports(repJson.reports ?? []);
		} else {
			const j = (await repRes.json()) as { message?: string };
			setReports([]);
			setReportsError(j.message ?? "수업 리포트를 불러오지 못했습니다.");
		}

		if (reqRes.ok) {
			const rqJson = (await reqRes.json()) as { requests?: ParentRequest[] };
			setRequests(rqJson.requests ?? []);
		} else {
			const j = (await reqRes.json()) as { message?: string };
			setRequests([]);
			setRequestsLoadError(j.message ?? "문의 내역을 불러오지 못했습니다.");
		}

		setIsBootstrapping(false);
	}, [router]);

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

	const handleLogout = async () => {
		await fetch("/api/auth/parent-logout", { method: "POST" });
		router.replace("/parent-login");
	};

	const handleSubmitRequest = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFormError("");
		setFormMessage("");

		if (!reqTitle.trim() || !reqContent.trim()) {
			setFormError("제목과 내용을 모두 입력해 주세요.");
			return;
		}

		setIsSubmittingReq(true);
		const response = await fetch("/api/parent/requests", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				requestType,
				title: reqTitle,
				content: reqContent,
			}),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setFormError(result.message ?? "요청 등록에 실패했습니다.");
			setIsSubmittingReq(false);
			return;
		}

		setReqTitle("");
		setReqContent("");
		setRequestType("질문");
		setFormMessage("요청이 접수되었습니다.");
		setIsSubmittingReq(false);

		const reqRes = await fetch("/api/parent/requests", { cache: "no-store" });
		if (reqRes.ok) {
			const rqJson = (await reqRes.json()) as { requests?: ParentRequest[] };
			setRequests(rqJson.requests ?? []);
		}
	};

	const handleDeleteRequest = async (id: number) => {
		if (!window.confirm("이 요청을 삭제할까요?")) return;
		setDeletingReqId(id);
		setFormError("");
		setFormMessage("");

		const response = await fetch("/api/parent/requests", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setFormError(result.message ?? "삭제에 실패했습니다.");
			setDeletingReqId(null);
			return;
		}

		setFormMessage("요청이 삭제되었습니다.");
		setDeletingReqId(null);
		const reqRes = await fetch("/api/parent/requests", { cache: "no-store" });
		if (reqRes.ok) {
			const rqJson = (await reqRes.json()) as { requests?: ParentRequest[] };
			setRequests(rqJson.requests ?? []);
		}
	};

	if (isBootstrapping || !profile) {
		return (
			<main className="relative min-h-screen min-h-[100dvh] bg-app-sage pb-10 text-zinc-800">
				<AppTopBar title="학부모" />
				<div className={`${STUDENT_APP_SHELL} pt-6`}>
					<p className={`${studentComicCard} p-5 text-sm text-zinc-600`}>불러오는 중입니다…</p>
				</div>
			</main>
		);
	}

	const child = profile.student;
	const profileInitial = (child.name || "학").charAt(0);

	return (
		<main className="relative min-h-screen min-h-[100dvh] bg-app-sage pb-12 text-zinc-800">
			<AppTopBar
				title="학부모"
				right={
					<button
						type="button"
						onClick={() => void handleLogout()}
						className="comic-border flex h-9 touch-manipulation items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
					>
						<LogOut className="h-3.5 w-3.5" strokeWidth={2.5} />
						로그아웃
					</button>
				}
			/>

			<div className={`${STUDENT_APP_SHELL} space-y-4 pt-3 sm:space-y-5 sm:pt-4`}>
				<p className={`${studentComicCard} p-4 text-sm font-medium leading-relaxed text-zinc-700`}>
					자녀 성적과 수업 소식, 선생님께 남기실 문의를 이 한곳에서 편히 보실 수 있어요.
					<span className="mt-2 block text-xs text-zinc-500">
						강의 영상·자료실은 학생 계정으로 로그인하신 뒤 이용해 주세요.
					</span>
				</p>

				<section className={`${studentComicCard} p-5 md:p-6`}>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex items-center gap-4">
							<div className="comic-border flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-2xl font-extrabold tracking-tight text-zinc-900">
								{profileInitial}
							</div>
							<div className="min-w-0">
								<p className="text-lg font-bold text-zinc-900">{child.name}</p>
								<p className="mt-0.5 text-xs text-zinc-500">
									학생 아이디 {child.username} · 학부모 {profile.parent.name}({profile.parent.username})
								</p>
								<ul className="mt-2 space-y-1 text-xs text-zinc-600">
									<li>
										<span className="font-semibold text-zinc-500">수강 학원</span> {child.academy}
									</li>
									<li>
										<span className="font-semibold text-zinc-500">학년</span> {child.grade ?? "—"}
									</li>
									<li>
										<span className="font-semibold text-zinc-500">목표대학</span> {child.targetUniversity || "미입력"}
									</li>
									<li>
										<span className="font-semibold text-zinc-500">희망학과</span> {child.targetDepartment || "미입력"}
									</li>
								</ul>
								{!child.isApproved ? (
									<p className="mt-2 text-xs font-semibold text-amber-700">학생 계정이 아직 승인되지 않았습니다.</p>
								) : null}
							</div>
						</div>
						<dl className="flex shrink-0 gap-6 rounded-xl border border-zinc-200/90 bg-zinc-50 px-4 py-3 text-center shadow-sm sm:flex-col sm:gap-1 sm:text-left">
							<div>
								<dt className="text-[10px] font-extrabold tracking-tight text-zinc-500">등록 성적</dt>
								<dd className="text-lg font-extrabold tracking-tight text-zinc-900">{records.length}건</dd>
							</div>
						</dl>
					</div>
				</section>

				<nav className="flex flex-wrap gap-2" aria-label="콘텐츠 구역">
					{parentNavItems.map(({ id, label }) => {
						const isActive = activeSection === id;
						return (
							<button
								key={id}
								type="button"
								onClick={() => setActiveSection(id)}
								aria-pressed={isActive}
								className={`min-h-10 flex-1 touch-manipulation rounded-2xl border px-3 py-2.5 text-center text-xs font-bold tracking-tight transition sm:min-h-11 sm:flex-none sm:px-5 sm:text-sm ${
									isActive
										? "border-brand/35 bg-brand text-white shadow-md shadow-brand/20"
										: "comic-border border-zinc-200/90 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
								}`}
							>
								{label}
							</button>
						);
					})}
				</nav>

				{activeSection === "report" ? (
					<section className={`${studentComicCard} p-5 md:p-6`}>
						<h2 className="text-base font-extrabold tracking-tight text-zinc-900">수업반 주간 안내</h2>
						{reportsError ? <p className="mt-3 text-sm text-rose-600">{reportsError}</p> : null}
						{!reportsError && reports.length === 0 ? (
							<p className="mt-3 text-sm text-zinc-500">등록된 안내가 없거나, 자녀가 아직 수업반에 배정되지 않았습니다.</p>
						) : null}
						<ul className="mt-3 space-y-3">
							{reports.map((r) => (
								<li key={r.id} className="rounded-xl border border-zinc-200/90 bg-zinc-50 px-3 py-3 shadow-sm">
									<p className="text-xs font-semibold text-brand">{r.group_name}</p>
									<p className="mt-1 text-sm font-bold text-zinc-900">{r.week_label}</p>
									<p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{r.content}</p>
									{showPostDates ? (
										<p className="mt-2 text-right text-[11px] text-zinc-400">{toKoreanDate(r.created_at)}</p>
									) : null}
								</li>
							))}
						</ul>
					</section>
				) : null}

				{activeSection === "grades" ? (
					<div className="space-y-4 sm:space-y-5">
						<section className={`${studentComicCard} p-5 md:p-6`}>
							<h2 className="text-base font-extrabold tracking-tight text-zinc-900">성적 추이</h2>
							{recordsError ? (
								<p className="mt-3 text-sm text-rose-600">{recordsError}</p>
							) : (
								<ExamTrendChartLazy records={records} className="mt-3" />
							)}
						</section>
						<section className={`${studentComicCard} p-5 md:p-6`}>
							<h2 className="text-base font-extrabold tracking-tight text-zinc-900">자녀 성적</h2>
							<p className="mt-1 text-xs text-zinc-500">성적 등록·수정은 학생 마이페이지에서만 가능합니다.</p>
							{recordsError ? <p className="mt-3 text-sm text-rose-600">{recordsError}</p> : null}
							{!recordsError && records.length === 0 ? <p className="mt-3 text-sm text-zinc-500">등록된 성적이 없습니다.</p> : null}
							<ul className="mt-3 space-y-2">
								{records.map((row) => (
									<li key={row.id} className="rounded-xl border border-zinc-200/90 bg-zinc-50 px-3 py-3 shadow-sm">
										<p className="text-sm font-semibold text-zinc-900">{row.exam_name}</p>
										<p className="mt-0.5 text-xs text-zinc-500">
											응시일 {row.exam_date ? toKoreanDate(`${row.exam_date}T12:00:00`) : "-"}
											{showPostDates ? ` · 등록 ${toKoreanDate(row.created_at)}` : ""}
										</p>
										<p className="mt-1 text-sm text-zinc-700">
											점수 <span className="font-medium text-zinc-900">{row.score}</span>
											{" · "}
											등급 <span className="font-medium text-zinc-900">{row.grade}</span>
										</p>
									</li>
								))}
							</ul>
						</section>
					</div>
				) : null}

				{activeSection === "inquiry" ? (
					<div className="space-y-4 sm:space-y-5">
						<section className={`${studentComicCard} p-5 md:p-6`}>
							<h2 className="text-base font-extrabold tracking-tight text-zinc-900">선생님께 문의</h2>
							<p className="mt-1 text-xs text-zinc-500">보강영상·질문·상담을 남기면 순차적으로 답변드립니다.</p>
							{requestsLoadError ? <p className="mt-3 text-sm text-rose-600">{requestsLoadError}</p> : null}

							<form className="mt-4 space-y-4" onSubmit={handleSubmitRequest}>
								<div>
									<label htmlFor="p-req-type" className="text-xs font-extrabold tracking-tight text-zinc-600">
										요청 유형
									</label>
									<select
										id="p-req-type"
										value={requestType}
										onChange={(e) => setRequestType(e.target.value as RequestType)}
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
									<label htmlFor="p-req-title" className="text-xs font-extrabold tracking-tight text-zinc-600">
										제목
									</label>
									<input
										id="p-req-title"
										type="text"
										value={reqTitle}
										onChange={(e) => setReqTitle(e.target.value)}
										placeholder="요청 제목"
										className="mt-1.5 w-full rounded-xl border border-zinc-200/90 bg-zinc-50 px-4 py-3 text-sm font-semibold tracking-tight text-zinc-900 shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
									/>
								</div>
								<div>
									<label htmlFor="p-req-content" className="text-xs font-extrabold tracking-tight text-zinc-600">
										내용
									</label>
									<textarea
										id="p-req-content"
										rows={4}
										value={reqContent}
										onChange={(e) => setReqContent(e.target.value)}
										placeholder="요청 내용을 자세히 작성해 주세요"
										className="mt-1.5 w-full resize-none rounded-xl border border-zinc-200/90 bg-zinc-50 px-4 py-3 text-sm font-semibold tracking-tight text-zinc-900 shadow-sm outline-none transition focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
									/>
								</div>
								{formError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p> : null}
								{formMessage ? (
									<p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{formMessage}</p>
								) : null}
								<button
									type="submit"
									disabled={isSubmittingReq}
									className="flex w-full min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold tracking-tight text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
								>
									<Send className="h-4 w-4" strokeWidth={2.5} />
									{isSubmittingReq ? "전송 중..." : "요청 보내기"}
								</button>
							</form>
						</section>

						<section className={`${studentComicCard} p-5 md:p-6`}>
							<h2 className="text-base font-extrabold tracking-tight text-zinc-900">문의 내역</h2>
							{requests.length === 0 ? <p className="mt-4 text-sm text-zinc-500">등록된 문의가 없습니다.</p> : null}
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
												{done ? <CheckCircle2 className="h-5 w-5" strokeWidth={2.25} /> : <UserRound className="h-5 w-5" strokeWidth={2} aria-hidden />}
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
													<p className="mt-2 text-right text-[11px] font-medium text-zinc-400">{toKoreanDate(item.created_at)}</p>
												) : null}
												{item.admin_reply ? (
													<p className="mt-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
														이정관: {item.admin_reply}
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
													onClick={() => void handleDeleteRequest(item.id)}
													disabled={deletingReqId === item.id}
													className="mt-2 text-xs font-semibold text-rose-600 underline-offset-2 transition hover:underline disabled:opacity-60"
												>
													{deletingReqId === item.id ? "삭제 중..." : "삭제"}
												</button>
											</div>
										</article>
									);
								})}
							</div>
						</section>
					</div>
				) : null}

				<p className="text-center text-xs text-zinc-500">
					<Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
						학생 로그인
					</Link>
					으로 전환
				</p>
			</div>
		</main>
	);
}
