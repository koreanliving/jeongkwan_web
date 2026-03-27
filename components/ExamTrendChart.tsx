"use client";

import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { ExamRecord } from "@/utils/examRecordsMemos";
import { formatExamDisplayName } from "@/utils/examKinds";

export type ExamChartPoint = {
	id: number;
	exam_date: string;
	label: string;
	score: number;
	grade: number;
};

function toChartPoints(records: ExamRecord[]): ExamChartPoint[] {
	return [...records]
		.map((r) => ({
			id: r.id,
			exam_date: r.exam_date,
			label: formatExamDisplayName(r.exam_kind, r.exam_detail),
			score: r.score,
			grade: r.grade,
		}))
		.sort((a, b) => a.exam_date.localeCompare(b.exam_date));
}

function shortDateLabel(dateStr: string): string {
	try {
		const d = new Date(`${dateStr}T12:00:00`);
		return `${d.getMonth() + 1}/${d.getDate()}`;
	} catch {
		return dateStr;
	}
}

type TooltipPayload = {
	payload: ExamChartPoint;
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
	if (!active || !payload?.length) return null;
	const p = payload[0].payload;
	return (
		<div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md">
			<p className="font-semibold text-zinc-900">{p.label}</p>
			<p className="mt-1 text-zinc-600">응시일 {p.exam_date}</p>
			<p className="text-zinc-700">
				점수 <span className="font-medium text-zinc-900">{p.score}</span>
				{" · "}
				등급 <span className="font-medium text-zinc-900">{p.grade}</span>
			</p>
		</div>
	);
}

type ExamTrendChartProps = {
	records: ExamRecord[];
	className?: string;
};

export function ExamTrendChart({ records, className }: ExamTrendChartProps) {
	const data = toChartPoints(records);
	if (data.length === 0) {
		return (
			<div
				className={
					className ??
					"flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 text-sm text-zinc-500"
				}
			>
				성적을 입력하면 추이 그래프가 표시됩니다.
			</div>
		);
	}

	const chartData = data.map((p) => ({
		...p,
		xShort: shortDateLabel(p.exam_date),
	}));

	const scores = data.map((d) => d.score);
	const minS = Math.min(...scores);
	const maxS = Math.max(...scores);
	const pad = Math.max(5, Math.round((maxS - minS) * 0.08) || 5);
	const yMin = Math.max(0, minS - pad);
	const yMax = Math.min(100, maxS + pad);

	return (
		<div className={className}>
			<p className="mb-2 text-center text-xs font-medium text-zinc-500">점수 추이 (응시일 순)</p>
			<div className="h-[220px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
						<XAxis
							dataKey="xShort"
							stroke="#71717a"
							fontSize={10}
							interval="preserveStartEnd"
							tick={{ fill: "#52525b" }}
							label={{ value: "응시일(월/일)", position: "insideBottom", offset: -4, fontSize: 10, fill: "#71717a" }}
							height={36}
						/>
						<YAxis
							stroke="#71717a"
							fontSize={10}
							domain={[yMin, yMax]}
							tick={{ fill: "#52525b" }}
							width={40}
							label={{ value: "점수", angle: -90, position: "insideLeft", fontSize: 10, fill: "#71717a" }}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Line
							type="monotone"
							dataKey="score"
							stroke="#2b5b3f"
							strokeWidth={2}
							dot={{ r: 4, fill: "#2b5b3f", stroke: "#fff", strokeWidth: 2 }}
							activeDot={{ r: 6, fill: "#234a36" }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
