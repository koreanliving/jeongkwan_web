"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const HERO = {
	src: "/assets/profile.JPG",
	alt: "이정관 선생님",
};

export function HeroSection() {
	const [imgFailed, setImgFailed] = useState(false);
	const [reduceMotion, setReduceMotion] = useState(false);

	useEffect(() => {
		setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	}, []);

	const photoMotion = !reduceMotion ? "md:animate-hero-ken-burns" : "";

	return (
		<section className="relative w-full overflow-hidden bg-black">
			<div className="relative flex min-h-[100svh] w-full flex-col bg-black md:min-h-[95vh] lg:min-h-screen">
				{/* 사진: 모바일은 상체 위주 높이 제한, md+ 풀블리드 */}
				<div
					className="relative w-full shrink-0 overflow-hidden bg-neutral-950 max-md:h-[min(42svh,360px)] max-md:max-h-[46vh] max-md:min-h-[248px] md:absolute md:inset-0 md:h-full md:max-h-none md:min-h-[95vh] lg:min-h-screen"
				>
					{!imgFailed ? (
						<Image
							src={HERO.src}
							alt={HERO.alt}
							fill
							className={`object-center max-md:object-contain max-md:object-[58%_18%] md:object-cover md:object-[center_22%] ${photoMotion}`}
							sizes="100vw"
							priority
							onError={() => setImgFailed(true)}
						/>
					) : (
						<div className="absolute inset-0 bg-neutral-900" />
					)}

					<div
						className="pointer-events-none absolute inset-0"
						style={{
							background:
								"linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.14) 100%)",
						}}
						aria-hidden
					/>

					{/* 이력: 사진 영역 기준 우하단 */}
					<ul
						className="absolute bottom-2 right-0 z-10 flex max-md:pr-5 list-none flex-col items-end space-y-0 text-right md:bottom-3 md:right-36 md:pr-0"
						aria-label="강사 경력"
					>
						{["입시왕 수능 국어 강사", "라파에듀 수능 국어 강사", "서정학원 수능 국어 강사", "다올 105 수능 국어 강사"].map((line) => (
							<li key={line} className="text-[12px] font-medium leading-[1.35] tracking-wide text-white/65 sm:text-[13.5px]">
								{line}
							</li>
						))}
					</ul>
				</div>

				{/* 카피: 모바일은 사진 아래 블랙 영역, md+는 오버레이 */}
				<div className="relative z-[2] mt-auto flex min-h-0 flex-1 flex-col justify-end bg-black px-5 pb-8 pt-5 md:absolute md:inset-0 md:mt-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0">
					<div className="mx-auto w-full max-w-6xl md:px-5 md:pb-[min(16vh,7rem)] lg:px-10 lg:pb-[min(14vh,6.5rem)]">
						<h1 className="welcome-serif break-keep whitespace-nowrap text-[clamp(0.875rem,4.165vw,3.185rem)] font-bold leading-[0.97] tracking-[-0.03em] text-white [text-shadow:0_4px_60px_rgb(0_0_0/0.5)]">
							국어의 본질을 꿰뚫는 가장 확실한 시선
						</h1>

						<div className="mt-6 sm:mt-8">
							<p className="break-keep text-[12.5px] leading-relaxed text-white/72 sm:text-[15px] sm:leading-[1.8]">
								<span className="block">— 단순한 문제 풀이가 아니라, 평가원의 언어를 해독합니다.</span>
								<span className="mt-2 block">국어 1등급, 1년이면 충분합니다.</span>
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
