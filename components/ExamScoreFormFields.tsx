"use client";

import { EXAM_KIND_OPTIONS, EXAM_KIND_OTHER } from "@/utils/examKinds";

type ExamScoreFormFieldsProps = {
	examKind: string;
	onExamKindChange: (value: string) => void;
	examDetail: string;
	onExamDetailChange: (value: string) => void;
	examDate: string;
	onExamDateChange: (value: string) => void;
	scoreInput: string;
	onScoreInputChange: (value: string) => void;
	gradeInput: string;
	onGradeInputChange: (value: string) => void;
	/** mypage vs admin subtle class tweaks */
	dense?: boolean;
	selectId?: string;
	dateId?: string;
};

export function ExamScoreFormFields({
	examKind,
	onExamKindChange,
	examDetail,
	onExamDetailChange,
	examDate,
	onExamDateChange,
	scoreInput,
	onScoreInputChange,
	gradeInput,
	onGradeInputChange,
	dense,
	selectId = "exam-kind",
	dateId = "exam-date",
}: ExamScoreFormFieldsProps) {
	const inputClass = dense
		? "w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs outline-none transition focus:border-zinc-500"
		: "w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500";

	return (
		<div className="space-y-3">
			<div>
				<label className={dense ? "mb-1 block text-[11px] font-medium text-zinc-700" : "mb-1 block text-sm font-medium text-zinc-700"} htmlFor={selectId}>
					시험 종류
				</label>
				<select
					id={selectId}
					value={examKind}
					onChange={(e) => onExamKindChange(e.target.value)}
					className={inputClass}
				>
					{EXAM_KIND_OPTIONS.map((opt) => (
						<option key={opt} value={opt}>
							{opt}
						</option>
					))}
				</select>
			</div>

			{examKind === EXAM_KIND_OTHER ? (
				<div>
					<label
						className={dense ? "mb-1 block text-[11px] font-medium text-zinc-700" : "mb-1 block text-sm font-medium text-zinc-700"}
						htmlFor={`${selectId}-detail`}
					>
						상세 시험 이름
					</label>
					<input
						id={`${selectId}-detail`}
						type="text"
						value={examDetail}
						onChange={(e) => onExamDetailChange(e.target.value)}
						placeholder="예: 한수 모의고사 1회, OO학원 실전"
						className={inputClass}
					/>
				</div>
			) : null}

			<div>
				<label className={dense ? "mb-1 block text-[11px] font-medium text-zinc-700" : "mb-1 block text-sm font-medium text-zinc-700"} htmlFor={dateId}>
					응시일 <span className="text-rose-600">*</span>
				</label>
				<input
					id={dateId}
					type="date"
					value={examDate}
					onChange={(e) => onExamDateChange(e.target.value)}
					required
					className={inputClass}
				/>
			</div>

			<div className="grid grid-cols-2 gap-2">
				<div>
					<label
						className={dense ? "mb-1 block text-[11px] font-medium text-zinc-700" : "mb-1 block text-sm font-medium text-zinc-700"}
						htmlFor={`${dateId}-score`}
					>
						점수
					</label>
					<input
						id={`${dateId}-score`}
						type="number"
						inputMode="numeric"
						value={scoreInput}
						onChange={(e) => onScoreInputChange(e.target.value)}
						placeholder="점수"
						className={inputClass}
					/>
				</div>
				<div>
					<label
						className={dense ? "mb-1 block text-[11px] font-medium text-zinc-700" : "mb-1 block text-sm font-medium text-zinc-700"}
						htmlFor={`${dateId}-grade`}
					>
						등급
					</label>
					<input
						id={`${dateId}-grade`}
						type="number"
						inputMode="numeric"
						value={gradeInput}
						onChange={(e) => onGradeInputChange(e.target.value)}
						placeholder="등급"
						className={inputClass}
					/>
				</div>
			</div>
		</div>
	);
}
