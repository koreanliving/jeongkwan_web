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

	return (
		<section className="relative w-full overflow-hidden bg-black">
			<div className="relative min-h-[100svh] w-full sm:min-h-[95vh] lg:min-h-screen">
				{!imgFailed ? (
					/* 모바일: 이미지를 70% 크기로 줄여 얼굴이 잘리지 않도록, sm 이상은 원래대로 */
					<div className="absolute inset-0 flex items-start justify-center sm:contents">
						<div className="relative h-[70%] w-[70%] sm:absolute sm:inset-0 sm:h-full sm:w-full">
							<Image
								src={HERO.src}
								alt={HERO.alt}
								fill
								className={`object-cover max-md:object-[42%_22%] md:object-[center_22%] ${!reduceMotion ? "animate-hero-ken-burns" : ""}`}
								sizes="100vw"
								priority
								onError={() => setImgFailed(true)}
							/>
						</div>
					</div>
				) : (
					<div className="absolute inset-0 bg-neutral-900" />
				)
				}

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
					<h1 className="welcome-serif break-keep whitespace-nowrap text-[clamp(0.875rem,4.165vw,3.185rem)] font-bold leading-[0.97] tracking-[-0.03em] text-white [text-shadow:0_4px_60px_rgb(0_0_0/0.5)]">
					국어의 본질을 꿰뚫는 가장 확실한 시선
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

		{/* 이력: 우측 정렬, 모바일은 화면 오른쪽과 동일 여백(px-5) */}
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
		</section>
	);
}
