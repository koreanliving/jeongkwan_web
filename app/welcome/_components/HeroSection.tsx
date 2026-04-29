"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const HERO = {
	src: "/assets/profile.JPG",
	alt: "이정관 선생님",
	objectPosition: "center 22%" as const,
};

export function HeroSection() {
	const [imgFailed, setImgFailed] = useState(false);
	const [reduceMotion, setReduceMotion] = useState(false);

	useEffect(() => {
		setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	}, []);

	return (
		<section className="relative w-full overflow-hidden bg-black">
			<div className="relative min-h-[100svh] w-full sm:min-h-[95vh] lg:min-h-screen">
				{!imgFailed ? (
					<Image
						src={HERO.src}
						alt={HERO.alt}
						fill
						className={`object-cover ${!reduceMotion ? "animate-hero-ken-burns" : ""}`}
						style={{ objectPosition: HERO.objectPosition }}
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

			<div className="absolute inset-0 flex flex-col justify-end">
				<div className="mx-auto w-full max-w-6xl px-5 pb-[min(15vh,6rem)] sm:px-10 sm:pb-[min(16vh,7rem)] lg:pb-[min(14vh,6.5rem)]">
					<h1 className="welcome-serif break-keep whitespace-nowrap text-[clamp(1.25rem,5.95vw,4.55rem)] font-bold leading-[0.97] tracking-[-0.03em] text-white [text-shadow:0_4px_60px_rgb(0_0_0/0.5)]">
						맹목적인 읽기를 멈추다.
					</h1>

					<div className="mt-6 sm:mt-8">
						<p className="break-keep text-[12.5px] leading-relaxed text-white/72 sm:text-[15px] sm:leading-[1.8]">
							<span className="block">
								— 단순한 문제 풀이가 아니라, 평가원의 언어를 해독합니다.
							</span>
							<span className="mt-2 block">국어 1등급, 1년이면 충분합니다.</span>
						</p>
					</div>
				</div>
			</div>

			{/* 우측 하단 이력 */}
			<ul className="absolute bottom-2 right-24 list-none space-y-0 text-right sm:bottom-3 sm:right-36" aria-label="강사 경력">
				{["입시왕 수능 국어 강사", "라파에듀 수능 국어 강사", "서정학원 수능 국어 강사", "다올 105 수능 국어 강사"].map((line) => (
					<li key={line} className="text-[12px] font-medium leading-[1.35] tracking-wide text-white/65 sm:text-[13.5px]">
						{line}
					</li>
				))}
			</ul>
			</div>
		</section>
	);
}
