"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Upload, Save, Link2, Video, Trash2 } from "lucide-react";
import { supabase } from "../../utils/supabase";

type Category = "문학" | "비문학";

type MaterialItem = {
	id: number;
	title: string;
	category: Category;
	file_url: string | null;
	file_name: string | null;
	created_at: string;
};

type VideoItem = {
	id: number;
	title: string;
	video_url: string;
	category: Category;
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

function getYoutubeEmbedUrl(videoUrl: string) {
	try {
		const parsed = new URL(videoUrl);

		if (parsed.hostname.includes("youtu.be")) {
			const videoId = parsed.pathname.replace("/", "");
			return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
		}

		if (parsed.hostname.includes("youtube.com")) {
			if (parsed.pathname.startsWith("/embed/")) {
				return videoUrl;
			}

			const videoId = parsed.searchParams.get("v");
			return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
		}

		return null;
	} catch {
		return null;
	}
}

function toStoragePath(fileUrl: string | null) {
	if (!fileUrl) {
		return null;
	}

	if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
		try {
			const parsed = new URL(fileUrl);
			const marker = "/storage/v1/object/public/materials/";
			const index = parsed.pathname.indexOf(marker);
			if (index === -1) {
				return null;
			}
			return decodeURIComponent(parsed.pathname.slice(index + marker.length));
		} catch {
			return null;
		}
	}

	return fileUrl;
}

function getErrorMessage(error: unknown, fallback: string) {
	if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
		return error.message;
	}

	return fallback;
}

export default function AdminPage() {
	const [materials, setMaterials] = useState<MaterialItem[]>([]);
	const [videos, setVideos] = useState<VideoItem[]>([]);
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

	const [videoTitle, setVideoTitle] = useState("");
	const [videoCategory, setVideoCategory] = useState<Category>("문학");
	const [videoUrl, setVideoUrl] = useState("");
	const [isCreatingVideo, setIsCreatingVideo] = useState(false);
	const [videoMessage, setVideoMessage] = useState("");
	const [videoError, setVideoError] = useState("");

	const [isDeletingMaterialId, setIsDeletingMaterialId] = useState<number | null>(null);
	const [isDeletingVideoId, setIsDeletingVideoId] = useState<number | null>(null);
	const [deleteMessage, setDeleteMessage] = useState("");
	const [deleteError, setDeleteError] = useState("");

	const selectedMaterial = useMemo(
		() => materials.find((item) => item.id === selectedMaterialId) ?? null,
		[materials, selectedMaterialId],
	);

	const fetchAdminData = async () => {
		setIsLoadingList(true);
		setListError("");

		const [materialResult, videoResult] = await Promise.all([
			supabase
				.from("materials")
				.select("id, title, category, file_url, file_name, created_at")
				.order("created_at", { ascending: false })
				.limit(100),
			supabase
				.from("videos")
				.select("id, title, video_url, category, created_at")
				.order("created_at", { ascending: false })
				.limit(100),
		]);

		if (materialResult.error || videoResult.error) {
			setListError("자료 목록을 불러오지 못했습니다.");
			setMaterials([]);
			setVideos([]);
			setIsLoadingList(false);
			return;
		}

		setMaterials((materialResult.data ?? []) as MaterialItem[]);
		setVideos((videoResult.data ?? []) as VideoItem[]);
		setIsLoadingList(false);
	};

	useEffect(() => {
		fetchAdminData();
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

		if (!title.trim()) {
			setCreateError("제목은 필수입니다.");
			return;
		}

		if (!content.trim() && !newFile) {
			setCreateError("본문 또는 PDF 중 하나는 입력해 주세요.");
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
					await fetchAdminData();
					return;
				}
			}

			setTitle("");
			setContent("");
			setCategory("문학");
			setNewFile(null);
			setCreateMessage("자료가 저장되었습니다.");
			await fetchAdminData();
		} catch (error) {
			setCreateError(getErrorMessage(error, "PDF 업로드 중 오류가 발생했습니다."));
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
			await fetchAdminData();
		} catch (error) {
			setAttachError(getErrorMessage(error, "PDF 업로드 중 오류가 발생했습니다."));
		} finally {
			setIsAttaching(false);
		}
	};

	const handleCreateVideo = async (event: FormEvent) => {
		event.preventDefault();

		setVideoError("");
		setVideoMessage("");

		if (!videoTitle.trim()) {
			setVideoError("영상 제목은 필수입니다.");
			return;
		}

		if (!getYoutubeEmbedUrl(videoUrl.trim())) {
			setVideoError("유효한 유튜브 링크를 입력해 주세요.");
			return;
		}

		setIsCreatingVideo(true);

		const { error } = await supabase.from("videos").insert({
			title: videoTitle.trim(),
			video_url: videoUrl.trim(),
			category: videoCategory,
		});

		if (error) {
			setVideoError(error.message || "영상 등록에 실패했습니다.");
			setIsCreatingVideo(false);
			return;
		}

		setVideoTitle("");
		setVideoUrl("");
		setVideoCategory("문학");
		setVideoMessage("영상이 등록되었습니다.");
		setIsCreatingVideo(false);
		await fetchAdminData();
	};

	const handleDeleteMaterial = async (material: MaterialItem) => {
		const ok = window.confirm(`정말 삭제할까요?\n${material.title}`);
		if (!ok) {
			return;
		}

		setDeleteError("");
		setDeleteMessage("");
		setIsDeletingMaterialId(material.id);

		const storagePath = toStoragePath(material.file_url);
		if (storagePath) {
			await supabase.storage.from("materials").remove([storagePath]);
		}

		const { error } = await supabase.from("materials").delete().eq("id", material.id);
		if (error) {
			setDeleteError(error.message || "자료 삭제에 실패했습니다.");
			setIsDeletingMaterialId(null);
			return;
		}

		setDeleteMessage("자료가 삭제되었습니다.");
		setIsDeletingMaterialId(null);
		await fetchAdminData();
	};

	const handleDeleteVideo = async (video: VideoItem) => {
		const ok = window.confirm(`정말 삭제할까요?\n${video.title}`);
		if (!ok) {
			return;
		}

		setDeleteError("");
		setDeleteMessage("");
		setIsDeletingVideoId(video.id);

		const { error } = await supabase.from("videos").delete().eq("id", video.id);
		if (error) {
			setDeleteError(error.message || "영상 삭제에 실패했습니다.");
			setIsDeletingVideoId(null);
			return;
		}

		setDeleteMessage("영상이 삭제되었습니다.");
		setIsDeletingVideoId(null);
		await fetchAdminData();
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
							placeholder="본문 (선택 입력, 비워도 가능)"
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
					<h2 className="text-lg font-semibold text-zinc-900">새 영상 등록</h2>
					<form className="mt-4 space-y-3" onSubmit={handleCreateVideo}>
						<input
							type="text"
							value={videoTitle}
							onChange={(event) => setVideoTitle(event.target.value)}
							placeholder="영상 제목"
							className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
						/>
						<select
							value={videoCategory}
							onChange={(event) => setVideoCategory(event.target.value as Category)}
							className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
						>
							<option value="문학">문학</option>
							<option value="비문학">비문학</option>
						</select>
						<input
							type="url"
							value={videoUrl}
							onChange={(event) => setVideoUrl(event.target.value)}
							placeholder="유튜브 링크 (예: https://www.youtube.com/watch?v=...)"
							className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
						/>

						{videoError ? (
							<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{videoError}</p>
						) : null}
						{videoMessage ? (
							<p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
								{videoMessage}
							</p>
						) : null}

						<button
							type="submit"
							disabled={isCreatingVideo}
							className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
						>
							<Video className="h-4 w-4" />
							{isCreatingVideo ? "등록 중..." : "영상 등록"}
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

				<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
					<h2 className="text-lg font-semibold text-zinc-900">등록된 자료/영상 관리</h2>

					{deleteError ? (
						<p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{deleteError}</p>
					) : null}
					{deleteMessage ? (
						<p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{deleteMessage}</p>
					) : null}

					<div className="mt-4 grid gap-4 md:grid-cols-2">
						<div className="rounded-2xl border border-zinc-200 p-3">
							<h3 className="text-sm font-semibold text-zinc-900">자료 목록</h3>
							<div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
								{materials.map((material) => (
									<div key={material.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
										<p className="text-sm font-medium text-zinc-800">#{material.id} {material.title}</p>
										<p className="mt-0.5 text-xs text-zinc-500">
											{material.category} · {toKoreanDate(material.created_at)}
											{material.file_name ? ` · ${material.file_name}` : ""}
										</p>
										<button
											type="button"
											onClick={() => handleDeleteMaterial(material)}
											disabled={isDeletingMaterialId === material.id}
											className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-300 px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
										>
											<Trash2 className="h-3.5 w-3.5" />
											{isDeletingMaterialId === material.id ? "삭제 중..." : "자료 삭제"}
										</button>
									</div>
								))}
								{!isLoadingList && materials.length === 0 ? (
									<p className="text-xs text-zinc-500">등록된 자료가 없습니다.</p>
								) : null}
							</div>
						</div>

						<div className="rounded-2xl border border-zinc-200 p-3">
							<h3 className="text-sm font-semibold text-zinc-900">영상 목록</h3>
							<div className="mt-2 max-h-72 space-y-2 overflow-y-auto">
								{videos.map((video) => (
									<div key={video.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
										<p className="text-sm font-medium text-zinc-800">#{video.id} {video.title}</p>
										<p className="mt-0.5 text-xs text-zinc-500">{video.category} · {toKoreanDate(video.created_at)}</p>
										<p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{video.video_url}</p>
										<button
											type="button"
											onClick={() => handleDeleteVideo(video)}
											disabled={isDeletingVideoId === video.id}
											className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-300 px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
										>
											<Trash2 className="h-3.5 w-3.5" />
											{isDeletingVideoId === video.id ? "삭제 중..." : "영상 삭제"}
										</button>
									</div>
								))}
								{!isLoadingList && videos.length === 0 ? (
									<p className="text-xs text-zinc-500">등록된 영상이 없습니다.</p>
								) : null}
							</div>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
