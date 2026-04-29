"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const fieldClass =
	"w-full rounded-3xl border border-slate-200/90 bg-slate-100/90 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand/45 focus:bg-white focus:ring-2 focus:ring-brand/15";

export default function ParentLoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setIsSubmitting(true);

		const response = await fetch("/api/auth/parent-login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ username, password }),
		});

		if (response.ok) {
			setIsSubmitting(false);
			router.replace("/parent");
			return;
		}

		const result = (await response.json()) as { message?: string };
		if (result.message?.includes("승인 대기")) {
			setError("가입 신청이 승인 대기 중입니다. 승인 후 로그인할 수 있습니다.");
		} else {
			setError(result.message ?? "아이디 또는 비밀번호가 올바르지 않습니다. 다시 입력해 주세요.");
		}
		setIsSubmitting(false);
	};

	return (
		<main className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-app-sage px-5 py-10 text-slate-900">
			<section className="w-full max-w-[22rem] rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-[0_24px_50px_-28px_rgba(30,58,138,0.18)] sm:max-w-sm sm:p-8">
				<h1 className="text-center text-2xl font-bold tracking-tight text-brand">학부모 로그인</h1>
				<p className="mt-2 text-center text-sm font-medium text-slate-500">승인된 학부모 계정으로 로그인</p>

				<form className="mt-8 space-y-4" onSubmit={handleSubmit}>
					<div>
						<label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="p-login-user">
							아이디
						</label>
						<input
							id="p-login-user"
							type="text"
							value={username}
							onChange={(event) => {
								setUsername(event.target.value);
								setError("");
							}}
							placeholder="가입 시 아이디"
							className={fieldClass}
							autoComplete="username"
							required
						/>
					</div>

					<div>
						<label className="mb-1.5 block text-xs font-semibold text-slate-600" htmlFor="p-login-pass">
							비밀번호
						</label>
						<input
							id="p-login-pass"
							type="password"
							value={password}
							onChange={(event) => {
								setPassword(event.target.value);
								setError("");
							}}
							placeholder="비밀번호"
							className={fieldClass}
							autoComplete="current-password"
							required
						/>
					</div>

					{error ? (
						<p className="rounded-2xl border border-rose-200/90 bg-rose-50 px-3 py-2.5 text-center text-sm text-rose-700">{error}</p>
					) : null}

					<button
						type="submit"
						disabled={isSubmitting}
						className="mt-2 w-full rounded-3xl bg-brand py-3.5 text-sm font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-45"
					>
						{isSubmitting ? "확인 중..." : "로그인"}
					</button>
				</form>

				<div className="mt-6 flex flex-col items-center gap-3 border-t border-slate-100 pt-6">
					<Link
						href="/auth/parent-signup"
						className="text-sm font-semibold text-brand transition hover:text-brand-hover hover:underline underline-offset-4"
					>
						학부모 회원가입
					</Link>
					<Link href="/login" className="text-xs font-medium text-slate-400 transition hover:text-slate-600">
						수강생(학생) 로그인
					</Link>
				</div>
			</section>
		</main>
	);
}
