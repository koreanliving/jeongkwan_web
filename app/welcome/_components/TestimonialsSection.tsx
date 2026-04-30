"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

type Item = {
	label: string;
	sub: string;
	quote: string;
	/** 있으면 max-md에서만 사용(모바일 전용 줄바꿈) */
	quoteMobile?: string;
	meta: string;
};

const items: Item[] = [
	{
		label: "9모 국어 100점",
		sub: "고3 학부모",
		quote: "드디어 처음 보는 100점 만점을 받아왔습니다. \n주 2회 모의고사를 풀고 이정관쌤 해설 수업을 \n충실히 들으며, 읽는 방법 자체가 달라졌습니다.",
		meta: "고3 학부모 · 9모 후기",
	},
	{
		label: "국포자 회생기",
		sub: "고2 학부모",
		quote: "국어는 해도 안 된다던 아이가, 이정관쌤 수업을 듣고 \n'하면 될 것 같다'는 마음이 생겼습니다. 모의고사 성적도 \n올랐고, 우리 아이의 변화를 이끌어주셔서 감사합니다.",
		quoteMobile:
			"국어는 해도 안 된다던 아이가, 이정관쌤 수업을 듣고 '하면 될 것 같다'는 마음이 생겼습니다.\n모의고사 성적도 올랐고, 우리 아이의 변화를 이끌어주셔서 감사합니다.",
		meta: "고2 학부모 · 온라인 수업",
	},
	{
		label: "5모 백분위 99",
		sub: "5개월 수강",
		quote: "첫 수업 후 낯선 방식인데 신기하게 문제가 풀린다고 했어요. 5개월째 수업을 이어오며 3모 백분위 97, 5모 백분위 99라는 결과를 얻었습니다.",
		meta: "고2 학부모 · 5개월 수강",
	},
	{
		label: "4등급 → 6모 94점",
		sub: "고3 학부모",
		quote: "고1 3평 턱걸이 4등급에서 6개월 수업 후 고3 6모 94점. 가르쳐주신 대로 풀었더니 문제가 풀린다고 합니다. \n이정관쌤께 진심으로 감사드립니다.",
		meta: "고3 학부모 · 6개월 수강",
	},
	{
		label: "수능 백분위 97",
		sub: "수능 응시생",
		quote: "선생님의 방식을 평소에 잘 체화한 덕분에 수능 백분위 97이라는 결과를 쟁취했습니다. \n끊임없이 노력하는 모든 학생에게 진심으로 추천합니다.",
		meta: "수능 응시생 · 2025학년도 수능",
	},
];

const doubled = [...items, ...items];
/** 모바일 스와이프용 길이 확보 */
const tripled = [...items, ...items, ...items];

function itemButtonClass(isActive: boolean) {
	return `flex shrink-0 cursor-default items-baseline gap-2 border-r border-black/[0.08] px-8 transition-colors sm:px-12 snap-start ${isActive ? "text-[#0a0a0a]" : "text-neutral-400"}`;
}

export function TestimonialsSection() {
	const [active, setActive] = useState<Item>(items[0]);
	const [paused, setPaused] = useState(false);
	const mobileScrollRef = useRef<HTMLDivElement>(null);
	const scrollFrameRef = useRef<number>(0);

	const syncActiveFromScroll = useCallback(() => {
		const el = mobileScrollRef.current;
		if (!el) return;
		const rects = el.getBoundingClientRect();
		const midX = rects.left + rects.width / 2;
		const nodes = el.querySelectorAll<HTMLElement>("[data-marquee-item]");
		let best: Item | null = null;
		let bestDist = Infinity;
		nodes.forEach((node) => {
			const r = node.getBoundingClientRect();
			const cx = r.left + r.width / 2;
			const d = Math.abs(cx - midX);
			if (d < bestDist) {
				bestDist = d;
				const idx = Number(node.dataset.index);
				if (!Number.isNaN(idx)) best = items[idx % items.length];
			}
		});
		if (best) setActive(best);
	}, []);

	useEffect(() => {
		const el = mobileScrollRef.current;
		if (!el) return;
		const onScroll = () => {
			if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
			scrollFrameRef.current = requestAnimationFrame(syncActiveFromScroll);
		};
		el.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			el.removeEventListener("scroll", onScroll);
			if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
		};
	}, [syncActiveFromScroll]);

	return (
		<section className="bg-[#F8F7F2] py-14 text-[#0a0a0a] sm:py-[4.5rem] lg:py-20">
			<div className="mx-auto max-w-6xl px-5 sm:px-10">
				<Reveal>
					<p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-neutral-500">Voices</p>
					<div className="mt-10 lg:flex lg:items-end lg:justify-between lg:gap-20">
						<h2 className="welcome-serif whitespace-nowrap text-[clamp(1.5rem,5.4vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em]">
							결과가 말해주는 수업.
						</h2>
						<p className="mt-8 max-w-xs text-[15px] leading-[1.85] text-neutral-500 sm:text-[16px] lg:mt-0 lg:text-right">
							수업을 들은 학생들이 직접 남긴 말들입니다.
						</p>
					</div>
				</Reveal>

				<div className="mt-16 sm:mt-20 lg:mt-24">
					<div className="border-t border-black/[0.08] pt-12 sm:pt-16">
						<span className="welcome-serif block text-[4.5rem] leading-none text-neutral-200 sm:text-[6.3rem]">"</span>
						<blockquote
							key={active.label}
							className="welcome-serif -mt-6 max-w-3xl text-[clamp(1.08rem,2.304vw,1.8rem)] font-normal leading-[1.2] tracking-[-0.02em] text-[#0a0a0a] transition-opacity duration-300 sm:-mt-8"
						>
							<span className="hidden whitespace-pre-line md:inline">{active.quote}</span>
							<span className="whitespace-pre-line md:hidden">{active.quoteMobile ?? active.quote}</span>
						</blockquote>
						<p className="mt-6 text-[12px] font-medium uppercase tracking-[0.28em] text-neutral-400">
							{active.meta}
						</p>
					</div>
				</div>
			</div>

			<Reveal delayMs={180} className="mt-16 sm:mt-20 lg:mt-24">
				<p className="px-5 pb-2 text-center text-[11px] font-medium text-neutral-500 md:hidden">좌우로 스와이프해 후기를 골라 보세요.</p>

				{/* 모바일: 가로 스크롤(스와이프), 가운데에 가까운 항목이 인용문에 반영 */}
				<div className="marquee-track border-y border-black/[0.06] py-6 md:hidden">
					<div
						ref={mobileScrollRef}
						className="flex w-max snap-x snap-mandatory gap-0 overflow-x-auto overscroll-x-contain touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
						onTouchEnd={syncActiveFromScroll}
					>
						{tripled.map((item, i) => {
							const isActive = active.label === item.label;
							return (
								<button
									key={`mob-${i}-${item.label}`}
									type="button"
									data-marquee-item
									data-index={items.indexOf(item)}
									tabIndex={-1}
									onClick={() => setActive(item)}
									className={itemButtonClass(isActive)}
								>
									<span className="welcome-serif whitespace-nowrap text-[1.05rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-[1.2rem]">
										{item.label}
									</span>
									<span
										className={`whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.22em] ${isActive ? "text-[#0a0a0a]" : "text-neutral-400"}`}
									>
										{item.sub}
									</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* 데스크톱: CSS 마퀴 + 호버 정지 */}
				<div
					className="marquee-track hidden border-y border-black/[0.06] py-6 md:block"
					onMouseEnter={() => setPaused(true)}
					onMouseLeave={() => setPaused(false)}
				>
					<div
						className="animate-marquee gap-0"
						style={{ animationPlayState: paused ? "paused" : "running" }}
					>
						{doubled.map((item, i) => {
							const isReal = i < items.length;
							const isActive = active.label === item.label;
							return (
								<button
									key={i}
									type="button"
									aria-hidden={!isReal}
									tabIndex={isReal ? 0 : -1}
									onMouseEnter={() => isReal && setActive(item)}
									onClick={() => isReal && setActive(item)}
									className={itemButtonClass(isActive)}
								>
									<span className="welcome-serif whitespace-nowrap text-[1.05rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-[1.2rem]">
										{item.label}
									</span>
									<span
										className={`whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.22em] ${isActive ? "text-[#0a0a0a]" : "text-neutral-400"}`}
									>
										{item.sub}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</Reveal>
		</section>
	);
}
