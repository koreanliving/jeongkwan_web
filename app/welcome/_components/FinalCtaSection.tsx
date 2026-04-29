"use client";

import { Reveal } from "./Reveal";

export function FinalCtaSection() {
	return (
		<section className="border-t border-black/[0.06] bg-white py-14 sm:py-[4.5rem] lg:py-20">
			<div className="mx-auto max-w-6xl px-5 sm:px-10">
				<Reveal>
					<p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-neutral-500">Next step</p>
					<div className="mt-10 lg:flex lg:items-end lg:justify-between lg:gap-16">
						<h2 className="welcome-serif max-w-[20ch] text-[clamp(2rem,5.5vw,3.75rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[#0a0a0a]">
							1등급으로의 1년,
							<br />
							함께 시작합시다.
						</h2>
						<div className="mt-10 max-w-xl lg:mt-0 lg:text-right">
							<p className="break-keep text-[15px] leading-[1.85] text-neutral-600 sm:text-[17px]">
								수강 신청과 커리큘럼 상담은 언제든 편하게 연락주세요.
							</p>
							<div className="mt-10 flex flex-col gap-6 lg:items-end lg:gap-5">
								<p className="welcome-serif text-[1.05rem] font-semibold text-[#0a0a0a] sm:text-[1.125rem]">
									이정관
								</p>
								<a
									href="tel:010-2708-7696"
									className="inline-flex w-fit text-sm font-semibold text-[#0a0a0a] underline decoration-black/25 underline-offset-[10px] transition hover:decoration-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a0a0a]"
								>
									Tel · 010-2708-7696
								</a>
								<a
									href="mailto:c0ng@naver.com"
									className="inline-flex w-fit text-sm font-semibold text-[#0a0a0a] underline decoration-black/25 underline-offset-[10px] transition hover:decoration-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a0a0a]"
								>
									Email · c0ng@naver.com
								</a>
							</div>
						</div>
					</div>
				</Reveal>
				<Reveal delayMs={100}>
					<p className="mt-16 text-[13px] leading-relaxed text-neutral-500 lg:mt-20 lg:text-right">
						* 수업 중에는 문자 남겨 주시면 확인 후 연락드립니다.
					</p>
				</Reveal>
			</div>
		</section>
	);
}
