"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Home, MessageSquareText, PlayCircle } from "lucide-react";

const requestTypes = ["보강영상", "질문", "상담"] as const;
const statuses = ["접수", "처리중", "완료"] as const;

type RequestType = (typeof requestTypes)[number];
type RequestStatus = (typeof statuses)[number];

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

function toKoreanDate(value: string) {
	return new Date(value).toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export default function RequestPage() {
	const [studentLabel, setStudentLabel] = useState("");
	const [requestType, setRequestType] = useState<RequestType>("질문");
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [requests, setRequests] = useState<StudentRequest[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
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
		fetchRequests();
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

	return (
		<main className="relative min-h-screen bg-zinc-100 px-5 pb-28 pt-8 text-zinc-800">
			<div className="mx-auto w-full max-w-sm">
				<header className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
					<h1 className="text-2xl font-bold tracking-tight text-zinc-900">요청 센터</h1>
					<p className="mt-2 text-sm text-zinc-600">보강영상, 질문, 상담을 바로 요청할 수 있습니다.</p>
					{studentLabel ? <p className="mt-2 text-xs text-zinc-500">현재 사용자: {studentLabel}</p> : null}
				</header>

				<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
					<h2 className="text-base font-semibold text-zinc-900">새 요청 등록</h2>
					<form className="mt-3 space-y-3" onSubmit={handleSubmit}>
						<select
							value={requestType}
							onChange={(event) => setRequestType(event.target.value as RequestType)}
							className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
						>
							{requestTypes.map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</select>
						<input
							type="text"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="요청 제목"
							className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
						/>
						<textarea
							rows={4}
							value={content}
							onChange={(event) => setContent(event.target.value)}
							placeholder="요청 내용을 자세히 작성해 주세요"
							className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
						/>
						{error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
						{message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
						<button
							type="submit"
							disabled={isSubmitting}
							className="inline-flex min-h-10 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
						>
							{isSubmitting ? "전송 중..." : "요청 보내기"}
						</button>
					</form>
				</section>

				<section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-22px_rgba(0,0,0,0.35)]">
					<h2 className="text-base font-semibold text-zinc-900">내 요청 내역</h2>
					{isLoading ? <p className="mt-3 text-sm text-zinc-600">불러오는 중입니다...</p> : null}
					{!isLoading && requests.length === 0 ? <p className="mt-3 text-sm text-zinc-500">등록된 요청이 없습니다.</p> : null}
					<div className="mt-3 space-y-3">
						{requests.map((item) => (
							<article key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
								<div className="flex items-start justify-between gap-2">
									<div>
										<p className="text-xs text-zinc-500">{item.request_type} · {toKoreanDate(item.created_at)}</p>
										<h3 className="mt-1 text-sm font-semibold text-zinc-900">{item.title}</h3>
									</div>
									<span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white">{item.status}</span>
								</div>
								<p className="mt-2 text-sm text-zinc-700">{item.content}</p>
								{item.admin_reply ? <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-zinc-700">관리자 답변: {item.admin_reply}</p> : null}
								{item.support_video_url ? (
									<a
										href={item.support_video_url}
										target="_blank"
										rel="noreferrer"
										className="mt-2 inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
									>
										보강 영상 링크 열기
									</a>
								) : null}
							</article>
						))}
					</div>
				</section>
			</div>

			<nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 backdrop-blur-md">
				<ul className="mx-auto grid w-full max-w-sm grid-cols-4 gap-2">
					<li>
						<Link href="/" className="flex w-full flex-col items-center justify-center rounded-2xl py-2.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700">
							<Home className="mb-1 h-5 w-5" strokeWidth={2.1} />
							<span>홈</span>
						</Link>
					</li>
					<li>
						<Link href="/video" className="flex w-full flex-col items-center justify-center rounded-2xl py-2.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700">
							<PlayCircle className="mb-1 h-5 w-5" strokeWidth={2.1} />
							<span>영상</span>
						</Link>
					</li>
					<li>
						<Link href="/material" className="flex w-full flex-col items-center justify-center rounded-2xl py-2.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700">
							<FileText className="mb-1 h-5 w-5" strokeWidth={2.1} />
							<span>자료</span>
						</Link>
					</li>
					<li>
						<Link href="/request" aria-current="page" className="flex w-full flex-col items-center justify-center rounded-2xl bg-zinc-900 py-2.5 text-xs font-medium text-white shadow-sm transition">
							<MessageSquareText className="mb-1 h-5 w-5" strokeWidth={2.1} />
							<span>요청</span>
						</Link>
					</li>
				</ul>
			</nav>
		</main>
	);
}
