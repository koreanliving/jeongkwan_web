"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const SHARED_PASSWORD = "0000";
const AUTH_COOKIE_NAME = "student_auth";

export default function LoginPage() {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (password === SHARED_PASSWORD) {
			document.cookie = `${AUTH_COOKIE_NAME}=true; path=/; max-age=604800; samesite=lax`;
			router.replace("/");
			return;
		}

		setError("비밀번호가 올바르지 않습니다. 다시 입력해 주세요.");
	};

	return (
		<main className="flex min-h-screen items-center justify-center bg-zinc-100 px-5 py-10 text-zinc-900">
			<section className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.35)]">
				<h1 className="text-center text-2xl font-bold tracking-tight">수강생 인증</h1>

				<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
					<label className="block text-sm font-medium text-zinc-700" htmlFor="password">
						공통 비밀번호
					</label>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(event) => {
							setPassword(event.target.value);
							setError("");
						}}
						placeholder="비밀번호를 입력하세요"
						className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
						required
					/>

					{error ? <p className="text-sm text-rose-600">{error}</p> : null}

					<button
						type="submit"
						className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
					>
						확인
					</button>
				</form>
			</section>
		</main>
	);
}
