"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
	children: ReactNode;
	className?: string;
	delayMs?: number;
};

export function Reveal({ children, className = "", delayMs = 0 }: RevealProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const obs = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						setVisible(true);
						obs.disconnect();
					}
				}
			},
			{ rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, []);

	return (
		<div
			ref={ref}
			className={`welcome-reveal transition-all duration-700 ease-out motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
				visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
			} ${className}`}
			style={{ transitionDelay: visible && delayMs > 0 ? `${delayMs}ms` : "0ms" }}
		>
			{children}
		</div>
	);
}
