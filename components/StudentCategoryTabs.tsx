"use client";

type StudentCategoryTabsProps<T extends string> = {
	tabs: readonly T[];
	active: T;
	onChange: (tab: T) => void;
};

export function StudentCategoryTabs<T extends string>({ tabs, active, onChange }: StudentCategoryTabsProps<T>) {
	return (
		<div className={`rounded-2xl border border-slate-200/90 bg-white p-1 shadow-sm`}>
			<div className="grid grid-cols-3 gap-1">
				{tabs.map((tab) => {
					const isOn = active === tab;
					return (
						<button
							key={tab}
							type="button"
							onClick={() => onChange(tab)}
							className={`min-h-10 touch-manipulation rounded-xl px-2 text-xs font-medium transition sm:min-h-11 sm:text-sm ${
								isOn ? "bg-brand text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
							}`}
						>
							{tab}
						</button>
					);
				})}
			</div>
		</div>
	);
}
