"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Home, MessageSquareText, Pencil, PlayCircle, Trash2, UserRound } from "lucide-react";
import { ExamScoreFormFields } from "@/components/ExamScoreFormFields";
import { ExamTrendChartLazy } from "@/components/ExamTrendChartLazy";
import { supabase } from "@/utils/supabase";
import { EXAM_KIND_OPTIONS, EXAM_KIND_OTHER, normalizeExamKindForForm } from "@/utils/examKinds";
import type { ExamRecord } from "@/utils/examRecordsMemos";

const DEFAULT_EXAM_KIND = EXAM_KIND_OPTIONS[0];

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
	const [examKind, setExamKind] = useState<string>(DEFAULT_EXAM_KIND);
	const [examDetail, setExamDetail] = useState("");
	const [examDate, setExamDate] = useState("");
	const [scoreInput, setScoreInput] = useState("");
	const [gradeInput, setGradeInput] = useState("");
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [showPostDates, setShowPostDates] = useState(true);
	const [studentLabel, setStudentLabel] = useState("");
	const [studentInfo, setStudentInfo] = useState<{ academy: string; grade: string | null } | null>(null);
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
			student?: { id: string; name: string; academy?: string; grade?: string | null };
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
		setStudentInfo({
			academy: reqData.student.academy ?? "-",
			grade: reqData.student.grade ?? null,
		});

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
		await loadExamRecords();
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
						{studentInfo ? (
							<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
								<h2 className="text-base font-semibold text-zinc-900">학생 정보</h2>
								<dl className="mt-3 space-y-2 text-sm">
									<div className="flex justify-between gap-3 border-b border-zinc-100 pb-2">
										<dt className="text-zinc-500">수강 학원</dt>
										<dd className="text-right font-medium text-zinc-900">{studentInfo.academy}</dd>
									</div>
									<div className="flex justify-between gap-3">
										<dt className="text-zinc-500">학년</dt>
										<dd className="text-right font-medium text-zinc-900">
											{studentInfo.grade ?? "가입 신청 시 기록 없음"}
										</dd>
									</div>
								</dl>
								<p className="mt-3 text-xs text-zinc-500">
									학원은 프로필 기준이며, 학년은 승인된 가입 신청에 적힌 값을 보여 줍니다.
								</p>
							</section>
						) : null}

						<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
							<h2 className="text-base font-semibold text-zinc-900">성적 추이</h2>
							<ExamTrendChartLazy records={records} className="mt-3" />
						</section>

						<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
							<h2 className="text-base font-semibold text-zinc-900">성적 추가</h2>
							<form className="mt-3 space-y-3" onSubmit={handleSubmit}>
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
									selectId="mypage-exam-kind"
									dateId="mypage-exam-date"
								/>
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
									<li key={row.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
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
														className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
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
