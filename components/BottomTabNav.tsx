"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Home, MessageSquareText, PlayCircle, UserRound } from "lucide-react";
import { STUDENT_APP_SHELL } from "@/lib/appShell";

export const STUDENT_INBOX_READ_EVENT = "student-inbox-read";

const TABS = [
	{ id: "home" as const, label: "홈", href: "/student", Icon: Home },
	{ id: "video" as const, label: "영상", href: "/video", Icon: PlayCircle },
	{ id: "material" as const, label: "자료", href: "/material", Icon: FileText },
	{ id: "request" as const, label: "요청", href: "/request", Icon: MessageSquareText },
	{ id: "mypage" as const, label: "마이", href: "/mypage", Icon: UserRound },
];

export type BottomTabId = (typeof TABS)[number]["id"];

type BottomTabNavProps = {
	active: BottomTabId;
};

export function BottomTabNav({ active }: BottomTabNavProps) {
	const [requestBadge, setRequestBadge] = useState(0);

	useEffect(() => {
		let cancelled = false;

		const load = () => {
			void fetch("/api/student/request-reply-badge", { credentials: "same-origin", cache: "no-store" })
				.then((r) => (r.ok ? r.json() : { count: 0 }))
				.then((j: { count?: number }) => {
					if (!cancelled) setRequestBadge(typeof j.count === "number" ? j.count : 0);
				});
		};

		load();
		const onRead = () => load();
		window.addEventListener(STUDENT_INBOX_READ_EVENT, onRead);
		return () => {
			cancelled = true;
			window.removeEventListener(STUDENT_INBOX_READ_EVENT, onRead);
		};
	}, []);

	return (
		<nav className="fixed inset-x-0 bottom-0 z-10 touch-manipulation border-t border-slate-200/90 bg-white pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.06)]">
			<ul className={`${STUDENT_APP_SHELL} grid w-full grid-cols-5 gap-0.5`}>
				{TABS.map(({ id, label, href, Icon }) => {
					const isActive = active === id;
					const showRequestDot = id === "request" && requestBadge > 0;
					return (
						<li key={id}>
							<Link
								href={href}
								aria-current={isActive ? "page" : undefined}
								className={`relative flex w-full flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-medium transition sm:text-[11px] ${
									isActive ? "text-brand" : "text-slate-400 hover:text-slate-600"
								}`}
							>
								{showRequestDot ? (
									<span
										className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm"
										aria-label={`읽지 않은 답변 ${requestBadge}건`}
									>
										{requestBadge > 9 ? "9+" : requestBadge}
									</span>
								) : null}
								<span
									className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
										isActive ? "bg-brand/10 text-brand" : "text-slate-400"
									}`}
								>
									<Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.25 : 2} aria-hidden />
								</span>
								<span>{label}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
