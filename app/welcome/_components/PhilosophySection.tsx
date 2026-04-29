"use client";

import { Reveal } from "./Reveal";

const reasons = [
	{
		n: "01",
		title: "문제 풀이만의 반복",
		body: "독해 능력은 단순히 문제를 많이 푸는 것만으로 자라지 않습니다. 그러나 대부분의 학생은 문제풀이만 반복하며 시간을 흘려보냅니다.",
	},
	{
		n: "02",
		title: "납득되지 않는 해석",
		body: "‘해석이 모호하고 정해진 답이 없는 영역’이라는 인식이 자리잡으면, 문학에 대한 흥미가 사라지고 점수도 함께 무너집니다.",
	},
];

const solutions = [
	{
		n: "03",
		label: "문학",
		title: "주관적 해석이 아닌, 출제자의 해석을 추적합니다.",
		body: "문제 풀이의 핵심은 주관적인 지문 해석이 아니라, 문제와 선지에 담긴 출제자의 해석을 객관적으로 따라가는 것입니다. 시간은 줄이고, 정답률은 끌어올립니다.",
	},
	{
		n: "04",
		label: "독서",
		title: "도구가 아닌, 순수 독해력으로 풀어냅니다.",
		body: "배경 지식이나 여러 가지 독해 도구에 의존하기보다, 문장과 문장을 잇고 다음 문장을 추론해 가며 글을 이해합니다. 빠르고 정확한 독해는 거기서 만들어집니다.",
	},
];


export function PhilosophySection() {
	return (
		<section className="bg-[#0B1B3A] py-14 text-white sm:py-[4.5rem] lg:py-20">
			<div className="mx-auto max-w-6xl px-5 sm:px-10">
				<Reveal>
					<p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">Philosophy</p>
					<h2 className="welcome-serif mt-8 break-keep text-[clamp(2rem,5.5vw,3.75rem)] font-bold leading-[1.08] tracking-[-0.03em]">
						노력해도 성적이 오르지 않는 이유,
						<br />
						그리고 다시 본질로 가는 길.
					</h2>
				</Reveal>

				<Reveal delayMs={120} className="mt-20 sm:mt-24">
					<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Why your score stops</p>
					<div className="mt-8 grid gap-px bg-white/10 sm:grid-cols-2">
						{reasons.map((it, i) => (
							<Reveal key={it.n} delayMs={i * 90} className="bg-[#0B1B3A]">
								<article className="flex h-full flex-col px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
									<p className="font-mono text-xs tabular-nums tracking-widest text-white/35">{it.n}</p>
									<h3 className="welcome-serif mt-6 break-keep text-[1.05rem] font-semibold leading-snug tracking-tight sm:text-[1.15rem]">
										{it.title}
									</h3>
									<p className="mt-6 flex-1 text-[15px] font-normal leading-[1.85] text-white/70">{it.body}</p>
								</article>
							</Reveal>
						))}
					</div>
				</Reveal>

				<Reveal delayMs={120} className="mt-16 sm:mt-20">
					<p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">How we fix it</p>
					<div className="mt-8 grid gap-px bg-white/10 sm:grid-cols-2">
						{solutions.map((it, i) => (
							<Reveal key={it.n} delayMs={i * 90} className="bg-[#0B1B3A]">
								<article className="flex h-full flex-col px-6 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
									<div className="flex items-baseline justify-between gap-3">
										<p className="font-mono text-xs tabular-nums tracking-widest text-white/35">{it.n}</p>
										<p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
											{it.label}
										</p>
									</div>
									<h3 className="welcome-serif mt-6 break-keep text-[1.05rem] font-semibold leading-snug tracking-tight sm:text-[1.15rem]">
										{it.title}
									</h3>
									<p className="mt-6 flex-1 text-[15px] font-normal leading-[1.85] text-white/70">{it.body}</p>
								</article>
							</Reveal>
						))}
					</div>
				</Reveal>
			</div>
		</section>
	);
}
