import Link from "next/link";
import { CurriculumSection } from "./_components/CurriculumSection";
import { FinalCtaSection } from "./_components/FinalCtaSection";
import { HeroSection } from "./_components/HeroSection";
import { PhilosophySection } from "./_components/PhilosophySection";
import { StickyHeader } from "./_components/StickyHeader";
import { TestimonialsSection } from "./_components/TestimonialsSection";

export default function WelcomePage() {
	return (
		<>
			<StickyHeader />
			<main>
				<HeroSection />
				<PhilosophySection />
				<CurriculumSection />
				<TestimonialsSection />
				<FinalCtaSection />
			</main>
			<footer className="border-t border-black/[0.06] bg-white">
				<div className="flex justify-center px-5 pb-3 pt-5 sm:pb-4 sm:pt-6">
					<Link
						href="/auth/signup"
						className="inline-flex min-h-[52px] items-center justify-center rounded-full border-2 border-[#0B1B3A] bg-[#0B1B3A] px-7 py-3.5 text-[17px] font-semibold text-white shadow-[0_2px_8px_rgb(11_27_58/0.25)] transition hover:border-[#0a1730] hover:bg-[#0a1730] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1B3A] sm:min-h-14 sm:px-8 sm:py-4 sm:text-[18px]"
					>
						회원가입
					</Link>
				</div>
				<div className="border-t border-black/[0.06] py-5 text-center text-[16.5px] font-medium uppercase tracking-[0.24em] text-neutral-400 sm:py-6">
					<p>수능 국어는 이정관</p>
				</div>
			</footer>
		</>
	);
}
