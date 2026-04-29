"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Pencil, Trash2 } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { BottomTabNav } from "@/components/BottomTabNav";
import { STUDENT_APP_SHELL, studentComicCard } from "@/lib/appShell";
import { ExamScoreFormFields } from "@/components/ExamScoreFormFields";
import { ExamTrendChartLazy } from "@/components/ExamTrendChartLazy";
import { supabase } from "@/utils/supabase";
import { EXAM_KIND_OPTIONS, EXAM_KIND_OTHER, normalizeExamKindForForm } from "@/utils/examKinds";
import type { ExamRecord } from "@/utils/examRecordsMemos";
import { toKoreanDate } from "@/utils/dateFormat";

const DEFAULT_EXAM_KIND = EXAM_KIND_OPTIONS[0];

type HomeSetting = {
	id: number;
	show_post_dates: boolean;
};

export default function MyPage() {
	const router = useRouter();
	const [auth, setAuth] = useState<"unknown" | "guest" | "user">("unknown");
	const [records, setRecords] = useState<ExamRecord[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [examKind, setExamKind] = useState<string>(DEFAULT_EXAM_KIND);
	const [examDetail, setExamDetail] = useState("");
	const [examDate, setExamDate] = useState("");
	const [scoreInput, setScoreInput] = useState("");
	const [gradeInput, setGradeInput] = useState("");
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [showPostDates, setShowPostDates] = useState(true);
	const [studentLabel, setStudentLabel] = useState("");
	const [studentInfo, setStudentInfo] = useState<{
		academy: string;
		grade: string | null;
		targetUniversity: string;
		targetDepartment: string;
	} | null>(null);
	const [showExamModal, setShowExamModal] = useState(false);
	const [showGoalModal, setShowGoalModal] = useState(false);
	const [goalUniv, setGoalUniv] = useState("");
	const [goalDept, setGoalDept] = useState("");
	const [goalSaving, setGoalSaving] = useState(false);
	const [goalError, setGoalError] = useState("");
	const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
	const [editExamKind, setEditExamKind] = useState<string>(DEFAULT_EXAM_KIND);
	const [editExamDetail, setEditExamDetail] = useState("");
	const [editExamDate, setEditExamDate] = useState("");
	const [editScoreInput, setEditScoreInput] = useState("");
	const [editGradeInput, setEditGradeInput] = useState("");
	const [recordMutateError, setRecordMutateError] = useState("");
	const [savingRecordId, setSavingRecordId] = useState<number | null>(null);
	const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);

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
		const reqData = (await reqRes.json()) as {
			student?: {
				id: string;
				name: string;
				academy?: string;
				grade?: string | null;
				targetUniversity?: string;
				targetDepartment?: string;
			};
		};

		if (!reqRes.ok || !reqData.student) {
			setAuth("guest");
			setStudentLabel("");
			setStudentInfo(null);
			setRecords([]);
			setIsLoading(false);
			return;
		}

		setAuth("user");
		setStudentLabel(`${reqData.student.name} (${reqData.student.id})`);
		const tu = (reqData.student.targetUniversity ?? "").trim();
		const td = (reqData.student.targetDepartment ?? "").trim();
		setStudentInfo({
			academy: reqData.student.academy ?? "-",
			grade: reqData.student.grade ?? null,
			targetUniversity: tu,
			targetDepartment: td,
		});
		setGoalUniv(tu);
		setGoalDept(td);

		const exRes = await fetch("/api/exam-records", { cache: "no-store" });
		const exData = (await exRes.json()) as {
			records?: ExamRecord[];
			message?: string;
		};

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

	const handleLogout = useCallback(async () => {
		try {
			await fetch("/api/auth/student-logout", { method: "POST", credentials: "same-origin" });
		} finally {
			await supabase.auth.signOut();
			setAuth("guest");
			setStudentLabel("");
			setStudentInfo(null);
			setRecords([]);
			router.replace("/login");
		}
	}, [router]);

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

		const score = Number.parseInt(scoreInput, 10);
		const grade = Number.parseInt(gradeInput, 10);

		if (!examDate.trim()) {
			setError("응시일을 선택해 주세요.");
			return;
		}
		if (examKind === EXAM_KIND_OTHER && !examDetail.trim()) {
			setError("사설/기타 선택 시 상세 시험 이름을 입력해 주세요.");
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
				examKind,
				examDetail: examKind === EXAM_KIND_OTHER ? examDetail.trim() : null,
				examDate: examDate.trim(),
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

		setExamKind(DEFAULT_EXAM_KIND);
		setExamDetail("");
		setExamDate("");
		setScoreInput("");
		setGradeInput("");
		setMessage("성적이 등록되었습니다.");
		setIsSubmitting(false);
		setShowExamModal(false);
		await loadExamRecords();
	};

	const handleGoalSave = async (event: FormEvent) => {
		event.preventDefault();
		setGoalError("");
		setGoalSaving(true);
		const response = await fetch("/api/student/profile", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				targetUniversity: goalUniv.trim(),
				targetDepartment: goalDept.trim(),
			}),
		});
		const result = (await response.json()) as { message?: string };
		setGoalSaving(false);

		if (!response.ok) {
			setGoalError(result.message ?? "저장에 실패했습니다.");
			return;
		}

		setStudentInfo((prev) =>
			prev
				? {
						...prev,
						targetUniversity: goalUniv.trim(),
						targetDepartment: goalDept.trim(),
					}
				: prev,
		);
		setShowGoalModal(false);
	};

	const startEditRecord = (row: ExamRecord) => {
		setRecordMutateError("");
		setEditingRecordId(row.id);
		const kind = normalizeExamKindForForm(row.exam_kind);
		setEditExamKind(kind);
		setEditExamDetail(kind === EXAM_KIND_OTHER ? (row.exam_detail ?? row.exam_name).trim() : "");
		setEditExamDate(row.exam_date || "");
		setEditScoreInput(String(row.score));
		setEditGradeInput(String(row.grade));
	};

	const cancelEditRecord = () => {
		setEditingRecordId(null);
		setRecordMutateError("");
	};

	const saveEditRecord = async (event: FormEvent) => {
		event.preventDefault();
		if (editingRecordId === null) return;
		setRecordMutateError("");

		const score = Number.parseInt(editScoreInput, 10);
		const grade = Number.parseInt(editGradeInput, 10);
		if (!editExamDate.trim()) {
			setRecordMutateError("응시일을 선택해 주세요.");
			return;
		}
		if (editExamKind === EXAM_KIND_OTHER && !editExamDetail.trim()) {
			setRecordMutateError("사설/기타 선택 시 상세 시험 이름을 입력해 주세요.");
			return;
		}
		if (!Number.isFinite(score) || !Number.isInteger(score)) {
			setRecordMutateError("점수는 정수로 입력해 주세요.");
			return;
		}
		if (!Number.isFinite(grade) || !Number.isInteger(grade)) {
			setRecordMutateError("등급은 정수로 입력해 주세요.");
			return;
		}

		setSavingRecordId(editingRecordId);
		const response = await fetch("/api/exam-records", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: editingRecordId,
				examKind: editExamKind,
				examDetail: editExamKind === EXAM_KIND_OTHER ? editExamDetail.trim() : null,
				examDate: editExamDate.trim(),
				score,
				grade,
			}),
		});
		const result = (await response.json()) as { message?: string };
		setSavingRecordId(null);

		if (!response.ok) {
			setRecordMutateError(result.message ?? "성적 수정에 실패했습니다.");
			return;
		}

		cancelEditRecord();
		await loadExamRecords();
	};

	const deleteRecord = async (id: number) => {
		if (!window.confirm("이 성적을 삭제할까요?")) return;
		setRecordMutateError("");
		setDeletingRecordId(id);
		const response = await fetch("/api/exam-records", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});
		const result = (await response.json()) as { message?: string };
		setDeletingRecordId(null);

		if (!response.ok) {
			setRecordMutateError(result.message ?? "성적 삭제에 실패했습니다.");
			return;
		}

		setEditingRecordId((cur) => (cur === id ? null : cur));
		await loadExamRecords();
	};

	const displayName = studentLabel.split(" (")[0] || "";
	const profileInitial = (displayName || "학").charAt(0);

	return (
		<main className="relative min-h-screen min-h-[100dvh] bg-app-sage pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-zinc-800">
			<AppTopBar
				title="마이페이지"
				right={
					<Link
						href="/#announcements"
						className="comic-border flex h-9 w-9 touch-manipulation items-center justify-center rounded-full bg-white text-zinc-900 shadow-sm transition hover:bg-zinc-50"
						aria-label="공지사항"
					>
						<Bell className="h-4 w-4" strokeWidth={2.5} />
					</Link>
				}
			/>

			<div className={`${STUDENT_APP_SHELL} space-y-4 pt-3 sm:space-y-5 sm:pt-4`}>
				<div
					className={`${studentComicCard} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}
				>
					<p className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-zinc-700">
						나의 성적을 확인하고 기록할 수 있습니다.
					</p>
					{auth === "user" ? (
						<button
							type="button"
							onClick={() => void handleLogout()}
							className="comic-border inline-flex min-h-10 shrink-0 touch-manipulation items-center justify-center self-stretch rounded-xl border border-zinc-200/90 bg-white px-4 text-sm font-extrabold tracking-tight text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.99] sm:self-auto"
						>
							로그아웃
						</button>
					) : null}
				</div>

				{auth === "guest" ? (
					<section className={`${studentComicCard} p-5 md:p-6`}>
						<p className="text-sm text-zinc-600">성적을 보려면 학생 로그인이 필요합니다.</p>
						<Link
							href="/login"
							className="mt-4 inline-flex min-h-11 touch-manipulation items-center rounded-xl bg-brand px-5 text-sm font-semibold tracking-tight text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover active:scale-[0.99]"
						>
							로그인하기
						</Link>
					</section>
				) : null}

				{auth === "unknown" ? (
					<section className={`${studentComicCard} p-5 md:p-6`}>
						<p className="text-sm text-zinc-600">불러오는 중입니다…</p>
					</section>
				) : null}

				{auth === "user" ? (
					<>
						<section className={`${studentComicCard} p-5 md:p-6`}>
							<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<div className="flex items-center gap-4">
									<div className="comic-border flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-2xl font-extrabold tracking-tight text-zinc-900 md:h-20 md:w-20 md:text-3xl">
										{profileInitial}
									</div>
									<div className="min-w-0">
										<p className="text-lg font-bold text-zinc-900">{displayName || "학생"}</p>
										{studentLabel ? <p className="mt-0.5 text-xs text-zinc-500">{studentLabel}</p> : null}
										{studentInfo ? (
											<ul className="mt-2 space-y-1 text-xs text-zinc-600">
												<li>
													<span className="font-semibold text-zinc-500">수강 학원</span> {studentInfo.academy}
												</li>
												<li>
													<span className="font-semibold text-zinc-500">학년</span> {studentInfo.grade ?? "—"}
												</li>
												<li>
													<span className="font-semibold text-zinc-500">목표대학</span>{" "}
													{studentInfo.targetUniversity || "미입력"}
												</li>
												<li>
													<span className="font-semibold text-zinc-500">희망학과</span>{" "}
													{studentInfo.targetDepartment || "미입력"}
												</li>
											</ul>
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
							<p className="mt-4 text-xs text-zinc-500">학원·학년은 가입 정보를 기준으로 표시됩니다.</p>
							<div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
								<button
									type="button"
									onClick={() => {
										setGoalError("");
										setGoalUniv(studentInfo?.targetUniversity ?? "");
										setGoalDept(studentInfo?.targetDepartment ?? "");
										setShowGoalModal(true);
									}}
									className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl border border-zinc-200/90 bg-white px-4 text-sm font-extrabold tracking-tight text-zinc-900 shadow-md transition hover:bg-zinc-50 active:translate-x-px active:translate-y-px active:shadow-sm"
								>
									목표대학
								</button>
								<button
									type="button"
									onClick={() => {
										setError("");
										setMessage("");
										setShowExamModal(true);
									}}
									className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold tracking-tight text-white shadow-md shadow-brand/20 transition hover:bg-brand-hover active:scale-[0.99]"
								>
									성적 등록
								</button>
							</div>
							{message ? (
								<p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>
							) : null}
						</section>

						<section className={`${studentComicCard} p-5 md:p-6`}>
							<h2 className="text-base font-extrabold tracking-tight text-zinc-900">성적 추이</h2>
							<ExamTrendChartLazy records={records} className="mt-3" />
						</section>

						<section className={`${studentComicCard} p-5 md:p-6`}>
							<h2 className="text-base font-extrabold tracking-tight text-zinc-900">내 성적</h2>
							{isLoading ? <p className="mt-3 text-sm text-zinc-600">불러오는 중입니다…</p> : null}
							{!isLoading && error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
							{recordMutateError ? (
								<p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
									{recordMutateError}
								</p>
							) : null}
							{!isLoading && !error && records.length === 0 ? (
								<p className="mt-3 text-sm text-zinc-500">등록된 성적이 없습니다.</p>
							) : null}
							<ul className="mt-3 space-y-2">
								{records.map((row) => (
									<li
										key={row.id}
										className="rounded-xl border border-zinc-200/90 bg-zinc-50 px-3 py-3 shadow-sm transition hover:bg-white"
									>
										{editingRecordId === row.id ? (
											<form className="space-y-2" onSubmit={saveEditRecord}>
												<ExamScoreFormFields
													examKind={editExamKind}
													onExamKindChange={setEditExamKind}
													examDetail={editExamDetail}
													onExamDetailChange={setEditExamDetail}
													examDate={editExamDate}
													onExamDateChange={setEditExamDate}
													scoreInput={editScoreInput}
													onScoreInputChange={setEditScoreInput}
													gradeInput={editGradeInput}
													onGradeInputChange={setEditGradeInput}
													selectId={`mypage-edit-kind-${row.id}`}
													dateId={`mypage-edit-date-${row.id}`}
												/>
												<div className="flex flex-wrap gap-2">
													<button
														type="submit"
														disabled={savingRecordId === row.id}
														className="rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active disabled:opacity-45"
													>
														{savingRecordId === row.id ? "저장 중…" : "저장"}
													</button>
													<button
														type="button"
														onClick={cancelEditRecord}
														className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800"
													>
														취소
													</button>
												</div>
											</form>
										) : (
											<>
												<div className="flex items-start justify-between gap-2">
													<div>
														<p className="text-sm font-semibold text-zinc-900">{row.exam_name}</p>
														<p className="mt-0.5 text-xs text-zinc-500">
															응시일 {row.exam_date ? toKoreanDate(`${row.exam_date}T12:00:00`) : "-"}
															{showPostDates ? ` · 등록 ${toKoreanDate(row.created_at)}` : ""}
														</p>
													</div>
													<div className="flex shrink-0 items-center gap-1">
														<button
															type="button"
															onClick={() => startEditRecord(row)}
															className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
															aria-label="성적 수정"
														>
															<Pencil className="h-4 w-4" />
														</button>
														<button
															type="button"
															onClick={() => void deleteRecord(row.id)}
															disabled={deletingRecordId === row.id}
															className="rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
															aria-label="성적 삭제"
														>
															<Trash2 className="h-4 w-4" />
														</button>
													</div>
												</div>
												<p className="mt-1 text-sm text-zinc-700">
													점수 <span className="font-medium text-zinc-900">{row.score}</span>
													{" · "}
													등급 <span className="font-medium text-zinc-900">{row.grade}</span>
												</p>
											</>
										)}
									</li>
								))}
							</ul>
						</section>
					</>
				) : null}
			</div>

			{auth === "user" && showGoalModal ? (
				<div
					className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
					role="dialog"
					aria-modal="true"
					aria-labelledby="goal-modal-title"
					onClick={() => setShowGoalModal(false)}
				>
					<div
						className="card-float w-full max-w-md rounded-[1.25rem] border border-zinc-200 bg-white p-5 shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 id="goal-modal-title" className="text-lg font-bold text-zinc-900">
							목표대학·희망학과
						</h2>
						<p className="mt-1 text-xs text-zinc-500">수능 이후 지원 계획에 맞게 수정할 수 있습니다.</p>
						<form className="mt-4 space-y-3" onSubmit={handleGoalSave}>
							<div>
								<label htmlFor="goal-univ" className="text-xs font-semibold text-zinc-500">
									목표대학
								</label>
								<input
									id="goal-univ"
									type="text"
									value={goalUniv}
									onChange={(e) => setGoalUniv(e.target.value)}
									placeholder="예: 서울대학교"
									className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand"
								/>
							</div>
							<div>
								<label htmlFor="goal-dept" className="text-xs font-semibold text-zinc-500">
									희망학과
								</label>
								<input
									id="goal-dept"
									type="text"
									value={goalDept}
									onChange={(e) => setGoalDept(e.target.value)}
									placeholder="예: 국어국문학과"
									className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand"
								/>
							</div>
							{goalError ? (
								<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{goalError}</p>
							) : null}
							<div className="flex flex-wrap gap-2 pt-1">
								<button
									type="submit"
									disabled={goalSaving}
									className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-45"
								>
									{goalSaving ? "저장 중…" : "저장"}
								</button>
								<button
									type="button"
									onClick={() => setShowGoalModal(false)}
									className="inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
								>
									닫기
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}

			{auth === "user" && showExamModal ? (
				<div
					className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
					role="dialog"
					aria-modal="true"
					aria-labelledby="exam-modal-title"
					onClick={() => !isSubmitting && setShowExamModal(false)}
				>
					<div
						className="card-float max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.25rem] border border-zinc-200 bg-white p-5 shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 id="exam-modal-title" className="text-lg font-bold text-zinc-900">
							성적 등록
						</h2>
						<form className="mt-4 space-y-3" onSubmit={handleSubmit}>
							<ExamScoreFormFields
								examKind={examKind}
								onExamKindChange={setExamKind}
								examDetail={examDetail}
								onExamDetailChange={setExamDetail}
								examDate={examDate}
								onExamDateChange={setExamDate}
								scoreInput={scoreInput}
								onScoreInputChange={setScoreInput}
								gradeInput={gradeInput}
								onGradeInputChange={setGradeInput}
								selectId="mypage-exam-kind-modal"
								dateId="mypage-exam-date-modal"
							/>
							{error ? (
								<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
							) : null}
							<div className="flex flex-wrap gap-2 pt-1">
								<button
									type="submit"
									disabled={isSubmitting}
									className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-hover disabled:opacity-45"
								>
									{isSubmitting ? "등록 중..." : "등록하기"}
								</button>
								<button
									type="button"
									disabled={isSubmitting}
									onClick={() => setShowExamModal(false)}
									className="inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
								>
									닫기
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}

			<BottomTabNav active="mypage" />
		</main>
	);
}
