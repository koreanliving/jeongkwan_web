"use client";

import Link from "next/link";
import { FileText, Home, MessageSquareText, PlayCircle, UserRound } from "lucide-react";
import { STUDENT_APP_SHELL } from "@/lib/appShell";

const TABS = [
	{ id: "home" as const, label: "홈", href: "/", Icon: Home },
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
	return (
		<nav className="fixed inset-x-0 bottom-0 z-10 touch-manipulation border-t border-slate-200/90 bg-white pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.06)]">
			<ul className={`${STUDENT_APP_SHELL} grid w-full grid-cols-5 gap-0.5`}>
				{TABS.map(({ id, label, href, Icon }) => {
					const isActive = active === id;
					return (
						<li key={id}>
							<Link
								href={href}
								aria-current={isActive ? "page" : undefined}
								className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-medium transition sm:text-[11px] ${
									isActive ? "text-brand" : "text-slate-400 hover:text-slate-600"
								}`}
							>
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
