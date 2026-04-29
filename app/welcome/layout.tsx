import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./_styles.css";

const welcomeSerif = Noto_Serif_KR({
	subsets: ["latin"],
	weight: ["400", "600", "700"],
	variable: "--font-welcome-serif",
	display: "swap",
});

const welcomeSans = Noto_Sans_KR({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-welcome-sans",
	display: "swap",
});

export const metadata: Metadata = {
	title: "수능 국어 이정관",
	description: "맹목적인 읽기를 멈추다. 수능 국어 이정관의 본질적 접근.",
};

export default function WelcomeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<div
			className={`${welcomeSerif.variable} ${welcomeSans.variable} welcome-root min-h-screen bg-white text-[#0a0a0a] antialiased`}
		>
			{children}
		</div>
	);
}
