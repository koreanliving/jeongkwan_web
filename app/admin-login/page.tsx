"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setIsSubmitting(true);

		const response = await fetch("/api/auth/admin-login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ password }),
		});

		if (response.ok) {
			router.replace("/admin");
			return;
		}

		const result = (await response.json()) as { message?: string };
		setError(result.message ?? "관리자 코드가 올바르지 않습니다.");
		setIsSubmitting(false);
	};

	return (
		<main className="flex min-h-screen items-center justify-center bg-zinc-100 px-5 py-10 text-zinc-900">
			<section className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.35)]">
				<h1 className="text-center text-2xl font-bold tracking-tight">관리자 인증</h1>
				<p className="mt-2 text-center text-sm text-zinc-500">관리자 전용 입장 코드</p>

				<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
					<label className="block text-sm font-medium text-zinc-700" htmlFor="admin-password">
						관리자 코드
					</label>
					<input
						id="admin-password"
						type="password"
						value={password}
						onChange={(event) => {
							setPassword(event.target.value);
							setError("");
						}}
						placeholder="관리자 코드를 입력하세요"
						className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
						required
					/>

					{error ? <p className="text-sm text-rose-600">{error}</p> : null}

					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active"
					>
						{isSubmitting ? "확인 중..." : "관리자 로그인"}
					</button>
				</form>

				<div className="mt-4 text-center">
					<Link href="/login" className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-700">
						학생 로그인으로 돌아가기
					</Link>
				</div>
			</section>
		</main>
	);
}
