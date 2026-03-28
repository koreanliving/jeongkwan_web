"use client";

import type { ReactNode } from "react";
import { STUDENT_APP_SHELL } from "@/lib/appShell";

type AppTopBarProps = {
	title: string;
	right?: ReactNode;
};

export function AppTopBar({ title, right }: AppTopBarProps) {
	return (
		<header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md">
			<div
				className={`${STUDENT_APP_SHELL} flex min-h-14 items-center justify-between gap-3 py-3 pt-[max(0.5rem,env(safe-area-inset-top))]`}
			>
				<h1 className="text-lg font-semibold tracking-tight text-slate-800">{title}</h1>
				{right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
			</div>
		</header>
	);
}
