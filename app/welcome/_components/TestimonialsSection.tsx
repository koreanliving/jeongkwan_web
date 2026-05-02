"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

type Item = {
	label: string;
	sub: string;
	quote: string;
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

/** _styles.css 의 welcome-marquee duration 과 반드시 일치 */
const DESKTOP_DURATION_S = 13.33;

function itemBtnCls(isActive: boolean) {
	return `flex shrink-0 cursor-default items-baseline gap-2 border-r border-black/[0.08] px-8 transition-colors sm:px-12 ${
		isActive ? "text-[#0a0a0a]" : "text-neutral-400 hover:text-[#0a0a0a]"
	}`;
}

function ItemContent({ item, isActive }: { item: Item; isActive: boolean }) {
	return (
		<>
			<span className="welcome-serif whitespace-nowrap text-[1.05rem] font-semibold tracking-tight text-[#0a0a0a] sm:text-[1.2rem]">
				{item.label}
			</span>
			<span
				className={`whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.22em] ${
					isActive ? "text-[#0a0a0a]" : "text-neutral-400"
				}`}
			>
				{item.sub}
			</span>
		</>
	);
}

export function TestimonialsSection() {
	const [active, setActive] = useState<Item>(items[0]);

	/* ── 데스크톱: CSS 애니메이션 + JS hover pause/resume ── */
	const desktopInnerRef = useRef<HTMLDivElement>(null);

	const pauseDesktop = () => {
		const el = desktopInnerRef.current;
		if (el) el.style.animationPlayState = "paused";
	};
	const resumeDesktop = () => {
		const el = desktopInnerRef.current;
		if (el) el.style.animationPlayState = "running";
	};

	/* ── 모바일: JS RAF 애니메이션 + 터치 관성 ── */
	const mobileInnerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const inner = mobileInnerRef.current;
		if (!inner) return;
		// 모바일(< 768px)에서만 실행
		if (window.matchMedia("(min-width: 768px)").matches) return;

		let raf = 0;
		let pos = 0; // translateX (px, 항상 음수)
		let halfWidth = 1; // items 한 세트 너비 (doubled 의 절반)
		let speed = 0; // px/ms — 마운트 후 계산
		let lastT = 0;

		let isTouching = false;
		let vel = 0; // px/ms (양수=오른쪽, 음수=왼쪽)
		let touchX0 = 0;
		let pos0 = 0;
		let prevX = 0;
		let prevT = 0;

		/** pos 를 [-halfWidth, 0) 로 래핑하여 DOM 에 적용 */
		const render = (p: number) => {
			let n = p % halfWidth;
			// JS % 는 부호 유지 → 양수면 반 바퀴 뒤로
			if (n > 0) n -= halfWidth;
			if (n < -halfWidth) n += halfWidth;
			pos = n;
			inner.style.transform = `translateX(${n}px)`;
		};

		/** 자동 스크롤 루프 */
		const autoTick = (t: number) => {
			if (isTouching) return;
			const dt = lastT ? t - lastT : 0;
			lastT = t;
			render(pos - speed * dt);
			raf = requestAnimationFrame(autoTick);
		};

		/** 관성(momentum) 루프 — 감속 후 자동 스크롤로 전환 */
		const momentumTick = (t: number) => {
			if (isTouching) return;
			const dt = lastT ? t - lastT : 16;
			lastT = t;
			if (Math.abs(vel) < 0.08) {
				// 관성 소진 → 자동 스크롤 재개
				lastT = 0;
				raf = requestAnimationFrame(autoTick);
				return;
			}
			render(pos + vel * dt);
			vel *= Math.pow(0.93, dt / 16); // 감속 계수
			raf = requestAnimationFrame(momentumTick);
		};

		const onTouchStart = (e: TouchEvent) => {
			isTouching = true;
			cancelAnimationFrame(raf);
			const x = e.touches[0].clientX;
			touchX0 = x;
			pos0 = pos;
			prevX = x;
			prevT = performance.now();
			vel = 0;
		};

		const onTouchMove = (e: TouchEvent) => {
			const x = e.touches[0].clientX;
			const t = performance.now();
			const dt = t - prevT;
			if (dt > 0) vel = (x - prevX) / dt; // 순간 속도 추적
			prevX = x;
			prevT = t;
			render(pos0 + (x - touchX0)); // 손가락과 1:1 이동
		};

		const onTouchEnd = () => {
			isTouching = false;
			lastT = 0;
			if (Math.abs(vel) > 0.08) {
				raf = requestAnimationFrame(momentumTick);
			} else {
				raf = requestAnimationFrame(autoTick);
			}
		};

		// 레이아웃 완료 후 초기화
		const initFrame = requestAnimationFrame(() => {
			halfWidth = inner.scrollWidth / 2;
			// 데스크톱 CSS 속도와 일치시킴
			speed = halfWidth / (DESKTOP_DURATION_S * 1000);
			raf = requestAnimationFrame(autoTick);
		});

		inner.addEventListener("touchstart", onTouchStart, { passive: true });
		inner.addEventListener("touchmove", onTouchMove, { passive: true });
		inner.addEventListener("touchend", onTouchEnd, { passive: true });

		return () => {
			cancelAnimationFrame(initFrame);
			cancelAnimationFrame(raf);
			inner.removeEventListener("touchstart", onTouchStart);
			inner.removeEventListener("touchmove", onTouchMove);
			inner.removeEventListener("touchend", onTouchEnd);
		};
	}, []);

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
						<span className="welcome-serif block text-[4.5rem] leading-none text-neutral-200 sm:text-[6.3rem]">&ldquo;</span>
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
				{/* ── 데스크톱: CSS 마퀴 ── */}
				<div
					className="hidden overflow-hidden border-y border-black/[0.06] py-6 md:block"
					onMouseEnter={pauseDesktop}
					onMouseLeave={resumeDesktop}
				>
					<div ref={desktopInnerRef} className="animate-marquee gap-0">
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
									className={itemBtnCls(isActive)}
								>
									<ItemContent item={item} isActive={isActive} />
								</button>
							);
						})}
					</div>
				</div>

				{/* ── 모바일: JS RAF 마퀴 ── */}
				<div className="overflow-hidden border-y border-black/[0.06] py-6 md:hidden">
					<div
						ref={mobileInnerRef}
						className="flex w-max gap-0"
						style={{ willChange: "transform" }}
					>
						{doubled.map((item, i) => {
							const isReal = i < items.length;
							const isActive = active.label === item.label;
							return (
								<button
									key={`m${i}`}
									type="button"
									aria-hidden={!isReal}
									tabIndex={isReal ? 0 : -1}
									onClick={() => isReal && setActive(item)}
									className={itemBtnCls(isActive)}
								>
									<ItemContent item={item} isActive={isActive} />
								</button>
							);
						})}
					</div>
				</div>
			</Reveal>
		</section>
	);
}
