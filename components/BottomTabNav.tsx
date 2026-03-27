"use client";

import Link from "next/link";
import { FileText, Home, MessageSquareText, PlayCircle, UserRound } from "lucide-react";

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
		<nav className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200/70 bg-white/92 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2.5 shadow-[0_-6px_28px_-12px_rgba(43,91,63,0.07)] backdrop-blur-lg">
			<ul className="mx-auto grid w-full max-w-sm grid-cols-5 gap-1 px-2">
				{TABS.map(({ id, label, href, Icon }) => {
					const isActive = active === id;
					return (
						<li key={id}>
							<Link
								href={href}
								aria-current={isActive ? "page" : undefined}
								className={`flex w-full flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 text-[11px] transition-colors ${
									isActive
										? "font-semibold text-brand"
										: "font-medium text-nav-muted hover:text-zinc-600"
								}`}
							>
								<Icon
									className="h-5 w-5 shrink-0"
									strokeWidth={isActive ? 2.35 : 2}
									aria-hidden
								/>
								<span>{label}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
