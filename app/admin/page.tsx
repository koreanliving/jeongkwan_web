"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Upload, Save, Link2 } from "lucide-react";
import { supabase } from "../../utils/supabase";

type Category = "문학" | "비문학";

type MaterialOption = {
	id: number;
	title: string;
	created_at: string;
};

function toKoreanDate(value: string) {
	return new Date(value).toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function safeFileName(name: string) {
	return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function AdminPage() {
	const [materials, setMaterials] = useState<MaterialOption[]>([]);
	const [isLoadingList, setIsLoadingList] = useState(true);
	const [listError, setListError] = useState("");

	const [title, setTitle] = useState("");
	const [category, setCategory] = useState<Category>("문학");
	const [content, setContent] = useState("");
	const [newFile, setNewFile] = useState<File | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [createMessage, setCreateMessage] = useState("");
	const [createError, setCreateError] = useState("");

	const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
	const [attachFile, setAttachFile] = useState<File | null>(null);
	const [isAttaching, setIsAttaching] = useState(false);
	const [attachMessage, setAttachMessage] = useState("");
	const [attachError, setAttachError] = useState("");

	const selectedMaterial = useMemo(
		() => materials.find((item) => item.id === selectedMaterialId) ?? null,
		[materials, selectedMaterialId],
	);

	const fetchMaterials = async () => {
		setIsLoadingList(true);
		setListError("");

		const { data, error } = await supabase
			.from("materials")
			.select("id, title, created_at")
			.order("created_at", { ascending: false })
			.limit(50);

		if (error) {
			setListError("자료 목록을 불러오지 못했습니다.");
			setMaterials([]);
			setIsLoadingList(false);
			return;
		}

		setMaterials((data ?? []) as MaterialOption[]);
		setIsLoadingList(false);
	};

	useEffect(() => {
		fetchMaterials();
	}, []);

	const uploadPdfToStorage = async (materialId: number, file: File) => {
		const cleanedName = safeFileName(file.name);
		const path = `${materialId}/${Date.now()}-${cleanedName}`;

		const { error } = await supabase.storage.from("materials").upload(path, file, {
			cacheControl: "3600",
			upsert: false,
			contentType: "application/pdf",
		});

		if (error) {
			throw error;
		}

		return path;
	};

	const handleCreateMaterial = async (event: FormEvent) => {
		event.preventDefault();

		setCreateError("");
		setCreateMessage("");

		if (!title.trim() || !content.trim()) {
			setCreateError("제목과 본문은 필수입니다.");
			return;
		}

		if (newFile && newFile.type !== "application/pdf") {
			setCreateError("PDF 파일만 업로드할 수 있습니다.");
			return;
		}

		setIsCreating(true);

		const { data: inserted, error: insertError } = await supabase
			.from("materials")
			.insert({
				title: title.trim(),
				content: content.trim(),
				category,
			})
			.select("id")
			.single();

		if (insertError || !inserted) {
			setCreateError("자료 생성에 실패했습니다.");
			setIsCreating(false);
			return;
		}

		try {
			if (newFile) {
				const filePath = await uploadPdfToStorage(inserted.id, newFile);

				const { error: updateError } = await supabase
					.from("materials")
					.update({
						file_url: filePath,
						file_name: newFile.name,
						file_size: newFile.size,
					})
					.eq("id", inserted.id);

				if (updateError) {
					setCreateError("자료는 생성되었지만 PDF 연결에 실패했습니다.");
					setIsCreating(false);
					await fetchMaterials();
					return;
				}
			}

			setTitle("");
			setContent("");
			setCategory("문학");
			setNewFile(null);
			setCreateMessage("자료가 저장되었습니다.");
			await fetchMaterials();
		} catch {
			setCreateError("PDF 업로드 중 오류가 발생했습니다.");
		} finally {
			setIsCreating(false);
		}
	};

	const handleAttachPdf = async (event: FormEvent) => {
		event.preventDefault();

		setAttachError("");
		setAttachMessage("");

		if (!selectedMaterialId) {
			setAttachError("첨부할 자료를 선택해 주세요.");
			return;
		}

		if (!attachFile) {
			setAttachError("PDF 파일을 선택해 주세요.");
			return;
		}

		if (attachFile.type !== "application/pdf") {
			setAttachError("PDF 파일만 업로드할 수 있습니다.");
			return;
		}

		setIsAttaching(true);

		try {
			const filePath = await uploadPdfToStorage(selectedMaterialId, attachFile);
			const { error } = await supabase
				.from("materials")
				.update({
					file_url: filePath,
					file_name: attachFile.name,
					file_size: attachFile.size,
				})
				.eq("id", selectedMaterialId);

			if (error) {
				setAttachError("PDF 연결에 실패했습니다.");
				setIsAttaching(false);
				return;
			}

			setAttachFile(null);
			setAttachMessage("PDF 첨부가 완료되었습니다.");
			await fetchMaterials();
		} catch {
			setAttachError("PDF 업로드 중 오류가 발생했습니다.");
		} finally {
			setIsAttaching(false);
		}
	};

	return (
		<main className="min-h-screen bg-zinc-100 px-4 pb-12 pt-6 text-zinc-800 sm:px-6 sm:pt-8">
			<div className="mx-auto w-full max-w-3xl space-y-5">
				<header className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
					<div className="flex items-center justify-between gap-3">
						<div>
							<h1 className="text-2xl font-bold tracking-tight text-zinc-900">자료실 관리자</h1>
							<p className="mt-1 text-sm text-zinc-600">웹에서 자료 생성과 PDF 첨부를 처리합니다.</p>
						</div>
						<Link
							href="/material"
							className="inline-flex min-h-10 items-center rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
						>
							자료실로
						</Link>
					</div>
				</header>

				<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
					<h2 className="text-lg font-semibold text-zinc-900">새 자료 등록</h2>
					<form className="mt-4 space-y-3" onSubmit={handleCreateMaterial}>
						<input
							type="text"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="자료 제목"
							className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
						/>
						<select
							value={category}
							onChange={(event) => setCategory(event.target.value as Category)}
							className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
						>
							<option value="문학">문학</option>
							<option value="비문학">비문학</option>
						</select>
						<textarea
							value={content}
							onChange={(event) => setContent(event.target.value)}
							rows={7}
							placeholder="본문 (마크다운 가능)"
							className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
						/>
						<div className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5">
							<label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700">
								<Upload className="h-4 w-4" />
								PDF 첨부 (선택)
								<input
									type="file"
									accept="application/pdf"
									onChange={(event) => setNewFile(event.target.files?.[0] ?? null)}
									className="hidden"
								/>
							</label>
							<p className="mt-1 text-xs text-zinc-500">{newFile ? newFile.name : "선택된 파일 없음"}</p>
						</div>

						{createError ? (
							<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{createError}</p>
						) : null}
						{createMessage ? (
							<p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
								{createMessage}
							</p>
						) : null}

						<button
							type="submit"
							disabled={isCreating}
							className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
						>
							<Save className="h-4 w-4" />
							{isCreating ? "저장 중..." : "자료 저장"}
						</button>
					</form>
				</section>

				<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
					<h2 className="text-lg font-semibold text-zinc-900">기존 자료에 PDF 첨부</h2>
					<form className="mt-4 space-y-3" onSubmit={handleAttachPdf}>
						<select
							value={selectedMaterialId ?? ""}
							onChange={(event) => {
								const value = Number(event.target.value);
								setSelectedMaterialId(Number.isFinite(value) && value > 0 ? value : null);
							}}
							className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
						>
							<option value="">자료 선택</option>
							{materials.map((item) => (
								<option key={item.id} value={item.id}>
									#{item.id} {item.title}
								</option>
							))}
						</select>

						{selectedMaterial ? (
							<p className="text-xs text-zinc-500">선택됨: {selectedMaterial.title} ({toKoreanDate(selectedMaterial.created_at)})</p>
						) : null}

						<div className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5">
							<label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700">
								<Link2 className="h-4 w-4" />
								PDF 파일 선택
								<input
									type="file"
									accept="application/pdf"
									onChange={(event) => setAttachFile(event.target.files?.[0] ?? null)}
									className="hidden"
								/>
							</label>
							<p className="mt-1 text-xs text-zinc-500">{attachFile ? attachFile.name : "선택된 파일 없음"}</p>
						</div>

						{attachError ? (
							<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{attachError}</p>
						) : null}
						{attachMessage ? (
							<p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
								{attachMessage}
							</p>
						) : null}

						<button
							type="submit"
							disabled={isAttaching || isLoadingList}
							className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
						>
							<Upload className="h-4 w-4" />
							{isAttaching ? "업로드 중..." : "PDF 첨부"}
						</button>
					</form>

					{isLoadingList ? <p className="mt-3 text-sm text-zinc-500">자료 목록을 불러오는 중...</p> : null}
					{listError ? (
						<p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{listError}</p>
					) : null}
				</section>
			</div>
		</main>
	);
}
