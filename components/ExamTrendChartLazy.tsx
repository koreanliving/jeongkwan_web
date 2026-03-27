"use client";

import dynamic from "next/dynamic";
import type { ExamRecord } from "@/utils/examRecordsMemos";

function ChartSkeleton() {
	return (
		<div className="flex min-h-[200px] w-full items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/90">
			<div className="flex flex-col items-center gap-2">
				<div className="h-2 w-24 animate-pulse rounded-full bg-zinc-200" />
				<div className="h-[120px] w-full max-w-[280px] animate-pulse rounded-xl bg-zinc-100" />
				<p className="text-xs text-zinc-500">차트 로딩 중…</p>
			</div>
		</div>
	);
}

const ExamTrendChartDynamic = dynamic(
	() => import("./ExamTrendChart").then((mod) => ({ default: mod.ExamTrendChart })),
	{
		ssr: false,
		loading: () => <ChartSkeleton />,
	},
);

type ExamTrendChartLazyProps = {
	records: ExamRecord[];
	className?: string;
};

/**
 * Recharts 번들을 이 컴포넌트가 마운트될 때만 로드합니다.
 * 바깥 `className`은 레이아웃(여백·테두리)용으로 유지합니다.
 */
export function ExamTrendChartLazy({ records, className }: ExamTrendChartLazyProps) {
	return (
		<div className={className}>
			<ExamTrendChartDynamic records={records} />
		</div>
	);
}
