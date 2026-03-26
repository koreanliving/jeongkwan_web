"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const academies = ["서정학원", "다올105", "라파에듀", "입시왕"] as const;
const grades = ["중1", "중2", "중3", "고1", "고2", "고3", "N수"] as const;

type Academy = (typeof academies)[number];

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
			<main className="flex min-h-screen items-center justify-center bg-zinc-100 px-5 py-10 text-zinc-900">
				<section className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.35)]">
					<div className="flex justify-center">
						<CheckCircle2 className="h-12 w-12 text-emerald-600" />
					</div>
					<h1 className="mt-4 text-center text-xl font-bold tracking-tight">가입 신청이 접수되었습니다</h1>
					<p className="mt-3 text-center text-sm text-zinc-600">
						관리자 검토 후 로그인 계정이 생성되면 알려드립니다. 잠시만 기다려 주세요.
					</p>
					<Link
						href="/login"
						className="mt-6 block rounded-2xl bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-zinc-800"
					>
						로그인 페이지로 돌아가기
					</Link>
				</section>
			</main>
		);
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-zinc-100 px-5 py-10 text-zinc-900">
			<section className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.35)]">
				<h1 className="text-center text-2xl font-bold tracking-tight">가입 신청</h1>
				<p className="mt-2 text-center text-sm text-zinc-500">아래 정보를 입력하면 관리자 검토 후 계정을 만들어드립니다.</p>

				<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
					<div>
						<label className="block text-sm font-medium text-zinc-700" htmlFor="studentId">
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
							className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-zinc-700" htmlFor="password">
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
							className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-zinc-700" htmlFor="passwordConfirm">
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
							className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-zinc-700" htmlFor="studentName">
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
							className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-zinc-700" htmlFor="academy">
							수강 학원
						</label>
						<select
							id="academy"
							value={academy}
							onChange={(event) => setAcademy(event.target.value as Academy)}
							className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
						>
							{academies.map((opt) => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-zinc-700" htmlFor="phone">
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
							className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-zinc-700" htmlFor="grade">
							학년
						</label>
						<select
							id="grade"
							value={grade}
							onChange={(event) => setGrade(event.target.value)}
							className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
						>
							{grades.map((opt) => (
								<option key={opt} value={opt}>
									{opt}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-zinc-700" htmlFor="recentTest">
							최근 모의고사
						</label>
						<input
							id="recentTest"
							type="text"
							value={recentTest}
							onChange={(event) => setRecentTest(event.target.value)}
							placeholder="2025년 3월 전국 모의고사 (선택)"
							className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-zinc-700" htmlFor="recentGrade">
							등급
						</label>
						<input
							id="recentGrade"
							type="text"
							value={recentGrade}
							onChange={(event) => setRecentGrade(event.target.value)}
							placeholder="2등급 (선택)"
							className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-zinc-700" htmlFor="selectedSubject">
							선택과목
						</label>
						<input
							id="selectedSubject"
							type="text"
							value={selectedSubject}
							onChange={(event) => setSelectedSubject(event.target.value)}
							placeholder="언어와 매체, 화법과 작문 (선택)"
							className="mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
						/>
					</div>

					{error ? (
						<div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
							<AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
							<p className="text-sm text-rose-700">{error}</p>
						</div>
					) : null}

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
					>
						{isSubmitting ? "신청 중..." : "가입 신청하기"}
					</button>
				</form>

				<div className="mt-4 text-center">
					<Link href="/login" className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-700">
						로그인 페이지로 돌아가기
					</Link>
				</div>
			</section>
		</main>
	);
}
