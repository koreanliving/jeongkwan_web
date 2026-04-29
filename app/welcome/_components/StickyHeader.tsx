"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function StickyHeader() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 12);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header
			className={`sticky top-0 z-50 w-full transition-[background-color,backdrop-filter] duration-500 ease-out ${
				scrolled ? "bg-white/85 backdrop-blur-xl" : "bg-transparent"
			}`}
		>
			<div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-10 sm:py-6">
				<Link
					href="/welcome"
					className="text-[19.5px] font-semibold tracking-[0.1em] text-[#0a0a0a] uppercase transition-opacity hover:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a0a0a]"
				>
					수능 국어는 이정관
				</Link>
				<nav className="flex items-center gap-3 sm:gap-4" aria-label="주요 링크">
					<Link
						href="/login"
						className="inline-flex min-h-10 items-center justify-center rounded-full border-2 border-[#0B1B3A]/22 bg-white/95 px-4 py-2 text-[13px] font-semibold text-[#0a0a0a] shadow-[0_1px_3px_rgb(0_0_0/0.08)] transition hover:border-[#0B1B3A]/35 hover:bg-[#f8fafc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1B3A] sm:px-5 sm:py-2.5"
					>
						로그인
					</Link>
					<Link
						href="/auth/signup"
						className="inline-flex min-h-10 items-center justify-center rounded-full border-2 border-[#0B1B3A] bg-[#0B1B3A] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgb(11_27_58/0.25)] transition hover:border-[#0a1730] hover:bg-[#0a1730] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1B3A] sm:px-5 sm:py-2.5"
					>
						회원가입
					</Link>
				</nav>
			</div>
		</header>
	);
}
