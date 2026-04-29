"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const academies = ["서정학원", "다올105", "라파에듀", "입시왕"] as const;

type Academy = (typeof academies)[number];

const fieldClass =
	"w-full rounded-3xl border border-slate-200/90 bg-slate-100/90 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand/45 focus:bg-white focus:ring-2 focus:ring-brand/15";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export default function ParentSignupPage() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [parentName, setParentName] = useState("");
	const [studentName, setStudentName] = useState("");
	const [academy, setAcademy] = useState<Academy>("서정학원");
	const [phone, setPhone] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");

		if (!username.trim() || !password.trim() || !passwordConfirm.trim() || !parentName.trim() || !studentName.trim() || !phone.trim()) {
			setError("필수 입력란을 확인해 주세요.");
			return;
		}
		if (!/^[a-zA-Z0-9_]{4,20}$/.test(username.trim())) {
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
		const response = await fetch("/api/auth/parent-signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				username: username.trim(),
				password,
				parentName: parentName.trim(),
				studentName: studentName.trim(),
				academy,
				phone: phone.trim(),
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
					<h1 className="mt-4 text-center text-xl font-bold tracking-tight text-brand">학부모 가입 신청이 접수되었습니다</h1>
					<p className="mt-3 text-center text-sm font-medium leading-relaxed text-slate-600">
						관리자 검토·승인 후 학부모 로그인을 이용할 수 있습니다. 잠시만 기다려 주세요.
					</p>
					<Link
						href="/parent-login"
						className="mt-8 block w-full rounded-3xl bg-brand py-3.5 text-center text-sm font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand-hover active:bg-brand-active"
					>
						학부모 로그인 페이지로
					</Link>
				</section>
			</main>
		);
	}

	return (
		<main className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-app-sage px-5 py-10 pb-14 text-slate-900">
			<section className="w-full max-w-[22rem] rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_24px_50px_-28px_rgba(30,58,138,0.18)] sm:max-w-sm sm:p-8">
				<h1 className="text-center text-2xl font-bold tracking-tight text-brand">학부모 회원가입</h1>
				<p className="mt-2 text-center text-sm font-medium text-slate-500">자녀 수강 정보로 신청합니다</p>
				<p className="mt-1 text-center text-xs text-slate-400">승인 후 같은 아이디로 학부모 로그인을 이용하세요.</p>

				<form className="mt-8 space-y-4" onSubmit={handleSubmit}>
					<div>
						<label className={labelClass} htmlFor="p-username">
							학부모 아이디
						</label>
						<input
							id="p-username"
							type="text"
							value={username}
							onChange={(event) => {
								setUsername(event.target.value);
								setError("");
							}}
							placeholder="영문/숫자/_ 4~20자"
							className={fieldClass}
							autoComplete="username"
							required
						/>
					</div>
					<div>
						<label className={labelClass} htmlFor="p-password">
							비밀번호
						</label>
						<input
							id="p-password"
							type="password"
							value={password}
							onChange={(event) => {
								setPassword(event.target.value);
								setError("");
							}}
							placeholder="6자 이상"
							className={fieldClass}
							autoComplete="new-password"
							required
						/>
					</div>
					<div>
						<label className={labelClass} htmlFor="p-password2">
							비밀번호 확인
						</label>
						<input
							id="p-password2"
							type="password"
							value={passwordConfirm}
							onChange={(event) => {
								setPasswordConfirm(event.target.value);
								setError("");
							}}
							placeholder="비밀번호 재입력"
							className={fieldClass}
							autoComplete="new-password"
							required
						/>
					</div>
					<div>
						<label className={labelClass} htmlFor="p-parent-name">
							학부모 이름
						</label>
						<input
							id="p-parent-name"
							type="text"
							value={parentName}
							onChange={(event) => {
								setParentName(event.target.value);
								setError("");
							}}
							placeholder="홍길동"
							className={fieldClass}
							required
						/>
					</div>
					<div>
						<label className={labelClass} htmlFor="p-student-name">
							자녀(학생) 이름
						</label>
						<input
							id="p-student-name"
							type="text"
							value={studentName}
							onChange={(event) => {
								setStudentName(event.target.value);
								setError("");
							}}
							placeholder="자녀 이름"
							className={fieldClass}
							required
						/>
					</div>
					<div>
						<label className={labelClass} htmlFor="p-academy">
							자녀 수강 학원
						</label>
						<select
							id="p-academy"
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
						<label className={labelClass} htmlFor="p-phone">
							연락처
						</label>
						<input
							id="p-phone"
							type="tel"
							value={phone}
							onChange={(event) => {
								setPhone(event.target.value);
								setError("");
							}}
							placeholder="010-1234-5678"
							className={fieldClass}
							autoComplete="tel"
							required
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
						{isSubmitting ? "처리 중..." : "가입 신청"}
					</button>
				</form>

				<div className="mt-6 flex flex-col items-center gap-2 border-t border-slate-100 pt-6 text-center">
					<Link
						href="/parent-login"
						className="text-sm font-semibold text-brand transition hover:text-brand-hover hover:underline underline-offset-4"
					>
						학부모 로그인
					</Link>
					<Link href="/login" className="text-xs font-medium text-slate-400 transition hover:text-slate-600">
						수강생(학생) 로그인
					</Link>
				</div>
			</section>
		</main>
	);
}
