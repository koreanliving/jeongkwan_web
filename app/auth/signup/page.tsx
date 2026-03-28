"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const academies = ["서정학원", "다올105", "라파에듀", "입시왕"] as const;
const grades = ["중1", "중2", "중3", "고1", "고2", "고3", "N수"] as const;

type Academy = (typeof academies)[number];

const fieldClass =
	"w-full rounded-3xl border border-slate-200/90 bg-slate-100/90 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand/45 focus:bg-white focus:ring-2 focus:ring-brand/15";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export default function SignupPage() {
	const [studentId, setStudentId] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [studentName, setStudentName] = useState("");
	const [academy, setAcademy] = useState<Academy>("서정학원");
	const [phone, setPhone] = useState("");
	const [grade, setGrade] = useState("고1");
	const [recentTest, setRecentTest] = useState("");
	const [recentGrade, setRecentGrade] = useState("");
	const [selectedSubject, setSelectedSubject] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");

		if (!studentId.trim() || !password.trim() || !passwordConfirm.trim() || !studentName.trim() || !phone.trim()) {
			setError("아이디, 비밀번호, 이름, 연락처는 필수입니다.");
			return;
		}
		if (!/^[a-zA-Z0-9_]{4,20}$/.test(studentId.trim())) {
			setError("아이디는 영문/숫자/_ 조합 4~20자로 입력해 주세요.");
			return;
		}
		if (password !== passwordConfirm) {
			setError("비밀번호가 일치하지 않습니다.");
			return;
		}
		if (password.length < 6) {
			setError("비밀번호는 6자 이상이어야 합니다.");
			return;
		}

		if (!/^\d{10,11}$/.test(phone.replace(/[-\s]/g, ""))) {
			setError("연락처 형식이 올바르지 않습니다. (숫자만 입력)");
			return;
		}

		setIsSubmitting(true);
		const response = await fetch("/api/auth/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				studentId: studentId.trim(),
				password: password,
				studentName: studentName.trim(),
				academy,
				phone: phone.trim(),
				grade,
				recentTest: recentTest.trim() || null,
				recentGrade: recentGrade.trim() || null,
				selectedSubject: selectedSubject.trim() || null,
			}),
		});

		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setError(result.message ?? "가입 신청 중 오류가 발생했습니다.");
			setIsSubmitting(false);
			return;
		}

		setSuccess(true);
		setIsSubmitting(false);
	};

	if (success) {
		return (
			<main className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-app-sage px-5 py-10 text-slate-900">
				<section className="w-full max-w-[22rem] rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_24px_50px_-28px_rgba(30,58,138,0.18)] sm:max-w-sm sm:p-8">
					<div className="flex justify-center">
						<CheckCircle2 className="h-12 w-12 text-brand" strokeWidth={2} />
					</div>
					<h1 className="mt-4 text-center text-xl font-bold tracking-tight text-brand">가입 신청이 접수되었습니다</h1>
					<p className="mt-3 text-center text-sm font-medium leading-relaxed text-slate-600">
						관리자 검토 후 로그인 계정이 생성되면 알려드립니다. 잠시만 기다려 주세요.
					</p>
					<Link
						href="/login"
						className="mt-8 block w-full rounded-3xl bg-brand py-3.5 text-center text-sm font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand-hover active:bg-brand-active"
					>
						로그인 페이지로 돌아가기
					</Link>
				</section>
			</main>
		);
	}

	return (
		<main className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-app-sage px-5 py-10 pb-14 text-slate-900">
			<section className="w-full max-w-[22rem] rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_24px_50px_-28px_rgba(30,58,138,0.18)] sm:max-w-sm sm:p-8">
				<h1 className="text-center text-2xl font-bold tracking-tight text-brand">회원가입</h1>
				<p className="mt-2 text-center text-sm font-medium text-slate-500">수능국어 학습을 시작하세요</p>
				<p className="mt-1 text-center text-xs text-slate-400">아래 정보를 입력하면 관리자 검토 후 계정을 만들어드립니다.</p>

				<form className="mt-8 space-y-4" onSubmit={handleSubmit}>
					<div>
						<label className={labelClass} htmlFor="studentId">
							아이디
						</label>
						<input
							id="studentId"
							type="text"
							value={studentId}
							onChange={(event) => {
								setStudentId(event.target.value);
								setError("");
							}}
							placeholder="예: honggildong01"
							className={fieldClass}
							required
						/>
					</div>
					<div>
						<label className={labelClass} htmlFor="password">
							비밀번호
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(event) => {
								setPassword(event.target.value);
								setError("");
							}}
							placeholder="비밀번호 (6자 이상)"
							className={fieldClass}
							required
						/>
					</div>
					<div>
						<label className={labelClass} htmlFor="passwordConfirm">
							비밀번호 확인
						</label>
						<input
							id="passwordConfirm"
							type="password"
							value={passwordConfirm}
							onChange={(event) => {
								setPasswordConfirm(event.target.value);
								setError("");
							}}
							placeholder="비밀번호 재입력"
							className={fieldClass}
							required
						/>
					</div>
					<div>
						<label className={labelClass} htmlFor="studentName">
							학생 이름
						</label>
						<input
							id="studentName"
							type="text"
							value={studentName}
							onChange={(event) => {
								setStudentName(event.target.value);
								setError("");
							}}
							placeholder="홍길동"
							className={fieldClass}
							required
						/>
					</div>

					<div>
						<label className={labelClass} htmlFor="academy">
							수강 학원
						</label>
						<select
							id="academy"
							value={academy}
							onChange={(event) => setAcademy(event.target.value as Academy)}
							className={fieldClass}
						>
							{academies.map((opt) => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className={labelClass} htmlFor="phone">
							연락처
						</label>
						<input
							id="phone"
							type="tel"
							value={phone}
							onChange={(event) => {
								setPhone(event.target.value);
								setError("");
							}}
							placeholder="010-1234-5678"
							className={fieldClass}
							required
						/>
					</div>

					<div>
						<label className={labelClass} htmlFor="grade">
							학년
						</label>
						<select id="grade" value={grade} onChange={(event) => setGrade(event.target.value)} className={fieldClass}>
							{grades.map((opt) => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className={labelClass} htmlFor="recentTest">
							최근 모의고사
						</label>
						<input
							id="recentTest"
							type="text"
							value={recentTest}
							onChange={(event) => setRecentTest(event.target.value)}
							placeholder="2025년 3월 전국 모의고사 (선택)"
							className={fieldClass}
						/>
					</div>

					<div>
						<label className={labelClass} htmlFor="recentGrade">
							등급
						</label>
						<input
							id="recentGrade"
							type="text"
							value={recentGrade}
							onChange={(event) => setRecentGrade(event.target.value)}
							placeholder="2등급 (선택)"
							className={fieldClass}
						/>
					</div>

					<div>
						<label className={labelClass} htmlFor="selectedSubject">
							선택과목
						</label>
						<input
							id="selectedSubject"
							type="text"
							value={selectedSubject}
							onChange={(event) => setSelectedSubject(event.target.value)}
							placeholder="언어와 매체, 화법과 작문 (선택)"
							className={fieldClass}
						/>
					</div>

					{error ? (
						<div className="flex gap-2 rounded-2xl border border-rose-200/90 bg-rose-50 px-4 py-3">
							<AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
							<p className="text-sm text-rose-700">{error}</p>
						</div>
					) : null}

					<button
						type="submit"
						disabled={isSubmitting}
						className="mt-2 w-full rounded-3xl bg-brand py-3.5 text-sm font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-45"
					>
						{isSubmitting ? "처리 중..." : "회원가입"}
					</button>
				</form>

				<div className="mt-6 border-t border-slate-100 pt-6 text-center">
					<Link href="/login" className="text-sm font-semibold text-slate-500 transition hover:text-brand">
						로그인
					</Link>
				</div>
			</section>
		</main>
	);
}
