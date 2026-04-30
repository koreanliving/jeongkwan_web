"use client";

import { Reveal } from "./Reveal";

type Season = {
	n: string;
	en: string;
	ko: string;
	period: string;
	tagline: string;
	body: string;
	/** 연한 파스텔 배경 */
	pastel: string;
};

const seasons: Season[] = [
	{
		n: "01",
		en: "SIGHT",
		ko: "시선",
		period: "1월 – 2월",
		tagline: "수능을 보는 눈을 뜨다",
		body: "문장과 비문학의 기초, 평가원의 코드를 읽어내는 올바른 시선을 장착합니다. 평가원 기출을 통해 수능 국어의 기초 능력과 논리 구조를 익힙니다.",
		pastel: "bg-[#EEF3FB]",
	},
	{
		n: "02",
		en: "BREAKTHROUGH",
		ko: "돌파",
		period: "3월 – 5월 +EBS 수능특강",
		tagline: "한계를 부수고 나아가다",
		body: "핵심 기출로 접근법을 몸에 새기고, 빠르고 정확하게 풀어내는 수능 문항 접근론을 익힙니다. EBS 연계 지문을 적용해 6월 모의평가를 정조준합니다.",
		pastel: "bg-[#FDF2EC]",
	},
	{
		n: "03",
		en: "EXPANSION",
		ko: "확장",
		period: "7월 – 8월 +EBS 수능완성",
		tagline: "사고의 지평을 넓히다",
		body: "고난도 지문과 문항을 분석하며 평가원의 변별력 기준을 뛰어넘습니다. EBS 수능완성 지문으로 실전 능력을 한 차원 끌어올리고 9월 모의평가를 대비합니다.",
		pastel: "bg-[#EDF6F0]",
	},
	{
		n: "04",
		en: "SUMMIT",
		ko: "정점",
		period: "FINAL +한수모의고사X이감모의고사",
		tagline: "가장 높은 곳에 서다",
		body: "사설 모의고사(한수·이감 등)를 통해 흔들리지 않는 실전 감각을 완성합니다. 수능 당일, 1년의 모든 흐름이 실력의 정점에서 만나도록 합니다.",
		pastel: "bg-[#F3EEF8]",
	},
];

export function CurriculumSection() {
	return (
		<section className="bg-white py-14 text-[#0a0a0a] sm:py-[4.5rem] lg:py-20">
			<div className="mx-auto max-w-6xl px-5 sm:px-10">
				<Reveal>
					<p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-neutral-500">
						연간 커리 큘럼
					</p>
					<div className="mt-10 lg:flex lg:items-end lg:justify-between lg:gap-16">
						<h2 className="welcome-serif max-w-[18ch] text-[clamp(1.4rem,3.85vw,2.625rem)] font-bold leading-[1.05] tracking-[-0.03em]">
							1년의 길,
							<br />
							네 개의 마디.
						</h2>
						<p className="mt-8 max-w-md break-keep text-[15px] leading-[1.85] text-neutral-600 sm:text-[17px] lg:mt-0 lg:max-w-lg lg:text-right">
							시선으로 시작해, 돌파를 거쳐 사고를 확장하고, 정점에서 마무리합니다. 단계마다 무엇을, 왜,
							어떻게 다루는지 분명합니다.
						</p>
					</div>
				</Reveal>

				<div className="mt-20 grid grid-cols-1 gap-px overflow-hidden rounded-[1.5rem] bg-[#d9d6d1]/80 ring-1 ring-black/[0.06] sm:mt-24 sm:rounded-[2rem] md:grid-cols-2 lg:mt-28">
					{seasons.map((s, i) => (
						<Reveal key={s.n} delayMs={i * 100} className={`${s.pastel} h-full`}>
							<article className="flex h-full flex-col gap-8 px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
								<header className="flex items-baseline justify-between gap-3">
									<p className="font-mono text-xs tabular-nums tracking-widest text-neutral-400">
										SEASON {s.n}
									</p>
									<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-400">
										{s.en}
									</p>
								</header>

								<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
									<h3 className="welcome-serif shrink-0 text-[clamp(1.4rem,3.08vw,2.1rem)] font-bold leading-[1.02] tracking-[-0.03em]">
										{s.ko}
									</h3>
									<p className="welcome-serif max-w-full text-right text-[clamp(0.8rem,1.2vw,1rem)] leading-snug text-neutral-600 break-keep sm:max-w-[58%]">
										{s.tagline}
									</p>
								</div>

								<p className="text-[14px] leading-[1.85] text-neutral-600 sm:text-[15px]">{s.body}</p>

								<p className="mt-auto text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-400">
									{s.period}
								</p>
							</article>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}
