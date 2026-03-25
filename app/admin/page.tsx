"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Link2, Save, Trash2, Upload, Video } from "lucide-react";
import { supabase } from "../../utils/supabase";

type Category = "문학" | "비문학";
type AdminTab = "materials" | "videos" | "main";

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

type AnnouncementItem = {
	id: number;
	content: string;
	created_at: string;
};

type HomeSetting = {
	id: number;
	welcome_title: string;
	welcome_subtitle: string;
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
	const [activeTab, setActiveTab] = useState<AdminTab>("materials");

	const [materials, setMaterials] = useState<MaterialItem[]>([]);
	const [videos, setVideos] = useState<VideoItem[]>([]);
	const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
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

	const [homeTitle, setHomeTitle] = useState("강의실에 오신 것을 환영합니다!");
	const [homeSubtitle, setHomeSubtitle] = useState("오늘도 즐거운 배움이 가득한 하루를 시작해 보세요.");
	const [mainSettingMessage, setMainSettingMessage] = useState("");
	const [mainSettingError, setMainSettingError] = useState("");
	const [isSavingMainSetting, setIsSavingMainSetting] = useState(false);

	const [newAnnouncement, setNewAnnouncement] = useState("");
	const [announcementMessage, setAnnouncementMessage] = useState("");
	const [announcementError, setAnnouncementError] = useState("");
	const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
	const [isSavingAnnouncementId, setIsSavingAnnouncementId] = useState<number | null>(null);
	const [isDeletingAnnouncementId, setIsDeletingAnnouncementId] = useState<number | null>(null);

	const selectedMaterial = useMemo(
		() => materials.find((item) => item.id === selectedMaterialId) ?? null,
		[materials, selectedMaterialId],
	);

	const fetchAdminData = async () => {
		setIsLoadingList(true);
		setListError("");

		const [materialResult, videoResult, announcementResult, settingResult] = await Promise.all([
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
			supabase.from("announcements").select("id, content, created_at").order("created_at", { ascending: false }).limit(20),
			supabase.from("home_settings").select("id, welcome_title, welcome_subtitle").eq("id", 1).maybeSingle(),
		]);

		if (materialResult.error || videoResult.error || announcementResult.error) {
			setListError("목록을 불러오지 못했습니다.");
			setMaterials([]);
			setVideos([]);
			setAnnouncements([]);
			setIsLoadingList(false);
			return;
		}

		if (settingResult.error && settingResult.error.code !== "PGRST116") {
			setMainSettingError("메인 설정을 불러오지 못했습니다. home_settings 테이블을 확인해 주세요.");
		}

		if (settingResult.data) {
			const setting = settingResult.data as HomeSetting;
			setHomeTitle(setting.welcome_title || "강의실에 오신 것을 환영합니다!");
			setHomeSubtitle(setting.welcome_subtitle || "오늘도 즐거운 배움이 가득한 하루를 시작해 보세요.");
		}

		setMaterials((materialResult.data ?? []) as MaterialItem[]);
		setVideos((videoResult.data ?? []) as VideoItem[]);
		setAnnouncements((announcementResult.data ?? []) as AnnouncementItem[]);
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

	const handleSaveMainSetting = async (event: FormEvent) => {
		event.preventDefault();
		setMainSettingError("");
		setMainSettingMessage("");

		if (!homeTitle.trim() || !homeSubtitle.trim()) {
			setMainSettingError("환영 문구 제목과 내용을 모두 입력해 주세요.");
			return;
		}

		setIsSavingMainSetting(true);
		const { error } = await supabase.from("home_settings").upsert(
			{
				id: 1,
				welcome_title: homeTitle.trim(),
				welcome_subtitle: homeSubtitle.trim(),
			},
			{ onConflict: "id" },
		);

		if (error) {
			setMainSettingError("메인 설정 저장에 실패했습니다. home_settings 테이블을 확인해 주세요.");
			setIsSavingMainSetting(false);
			return;
		}

		setMainSettingMessage("메인 설정이 저장되었습니다.");
		setIsSavingMainSetting(false);
	};

	const handleCreateAnnouncement = async (event: FormEvent) => {
		event.preventDefault();
		setAnnouncementError("");
		setAnnouncementMessage("");

		if (!newAnnouncement.trim()) {
			setAnnouncementError("공지 내용을 입력해 주세요.");
			return;
		}

		setIsCreatingAnnouncement(true);
		const { error } = await supabase.from("announcements").insert({ content: newAnnouncement.trim() });
		if (error) {
			setAnnouncementError(error.message || "공지 등록에 실패했습니다.");
			setIsCreatingAnnouncement(false);
			return;
		}

		setNewAnnouncement("");
		setAnnouncementMessage("공지사항이 등록되었습니다.");
		setIsCreatingAnnouncement(false);
		await fetchAdminData();
	};

	const handleUpdateAnnouncement = async (id: number, contentValue: string) => {
		setAnnouncementError("");
		setAnnouncementMessage("");
		if (!contentValue.trim()) {
			setAnnouncementError("공지 내용은 비워둘 수 없습니다.");
			return;
		}

		setIsSavingAnnouncementId(id);
		const { error } = await supabase.from("announcements").update({ content: contentValue.trim() }).eq("id", id);
		if (error) {
			setAnnouncementError(error.message || "공지 수정에 실패했습니다.");
			setIsSavingAnnouncementId(null);
			return;
		}

		setAnnouncementMessage("공지사항이 수정되었습니다.");
		setIsSavingAnnouncementId(null);
		await fetchAdminData();
	};

	const handleDeleteAnnouncement = async (id: number) => {
		const ok = window.confirm("정말 이 공지사항을 삭제할까요?");
		if (!ok) return;

		setAnnouncementError("");
		setAnnouncementMessage("");
		setIsDeletingAnnouncementId(id);
		const { error } = await supabase.from("announcements").delete().eq("id", id);
		if (error) {
			setAnnouncementError(error.message || "공지 삭제에 실패했습니다.");
			setIsDeletingAnnouncementId(null);
			return;
		}

		setAnnouncementMessage("공지사항이 삭제되었습니다.");
		setIsDeletingAnnouncementId(null);
		await fetchAdminData();
	};

	return (
		<main className="min-h-screen bg-zinc-100 px-4 pb-12 pt-6 text-zinc-800 sm:px-6 sm:pt-8">
			<div className="mx-auto w-full max-w-4xl space-y-5">
				<header className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h1 className="text-2xl font-bold tracking-tight text-zinc-900">자료실 관리자</h1>
							<p className="mt-1 text-sm text-zinc-600">자료 업로드, 영상 업로드, 메인 설정을 분리해서 관리합니다.</p>
						</div>
						<Link
							href="/material"
							className="inline-flex min-h-10 items-center rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
						>
							자료실로
						</Link>
					</div>

					<div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-zinc-200/70 p-1.5">
						<button
							type="button"
							onClick={() => setActiveTab("materials")}
							className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
								activeTab === "materials" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-white/80"
							}`}
						>
							자료 업로드
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("videos")}
							className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
								activeTab === "videos" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-white/80"
							}`}
						>
							영상 업로드
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("main")}
							className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
								activeTab === "main" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-white/80"
							}`}
						>
							메인 설정
						</button>
					</div>
				</header>

				{activeTab === "materials" ? (
					<>
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
									rows={10}
									placeholder="파싱형 원문 텍스트 전체를 붙여 넣어도 되고, 일반 텍스트를 입력해도 됩니다."
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
						</section>

						<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
							<h2 className="text-lg font-semibold text-zinc-900">자료 목록</h2>
							{deleteError ? (
								<p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{deleteError}</p>
							) : null}
							{deleteMessage ? (
								<p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{deleteMessage}</p>
							) : null}
							<div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
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
								{!isLoadingList && materials.length === 0 ? <p className="text-xs text-zinc-500">등록된 자료가 없습니다.</p> : null}
							</div>
						</section>
					</>
				) : null}

				{activeTab === "videos" ? (
					<>
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
									placeholder="유튜브 링크"
									className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
								/>
								{videoError ? (
									<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{videoError}</p>
								) : null}
								{videoMessage ? (
									<p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{videoMessage}</p>
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
							<h2 className="text-lg font-semibold text-zinc-900">영상 목록</h2>
							<div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
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
								{!isLoadingList && videos.length === 0 ? <p className="text-xs text-zinc-500">등록된 영상이 없습니다.</p> : null}
							</div>
						</section>
					</>
				) : null}

				{activeTab === "main" ? (
					<>
						<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
							<h2 className="text-lg font-semibold text-zinc-900">메인 환영 문구 설정</h2>
							<form className="mt-4 space-y-3" onSubmit={handleSaveMainSetting}>
								<input
									type="text"
									value={homeTitle}
									onChange={(event) => setHomeTitle(event.target.value)}
									placeholder="강의실에 오신 것을 환영합니다!"
									className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
								/>
								<textarea
									rows={3}
									value={homeSubtitle}
									onChange={(event) => setHomeSubtitle(event.target.value)}
									placeholder="환영 문구 하단 설명"
									className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
								/>

								{mainSettingError ? (
									<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{mainSettingError}</p>
								) : null}
								{mainSettingMessage ? (
									<p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mainSettingMessage}</p>
								) : null}

								<button
									type="submit"
									disabled={isSavingMainSetting}
									className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
								>
									<Save className="h-4 w-4" />
									{isSavingMainSetting ? "저장 중..." : "메인 문구 저장"}
								</button>
							</form>
						</section>

						<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
							<h2 className="text-lg font-semibold text-zinc-900">공지사항</h2>
							<form className="mt-4 space-y-3" onSubmit={handleCreateAnnouncement}>
								<textarea
									rows={3}
									value={newAnnouncement}
									onChange={(event) => setNewAnnouncement(event.target.value)}
									placeholder="새 공지사항을 입력하세요."
									className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
								/>

								{announcementError ? (
									<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{announcementError}</p>
								) : null}
								{announcementMessage ? (
									<p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{announcementMessage}</p>
								) : null}

								<button
									type="submit"
									disabled={isCreatingAnnouncement}
									className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
								>
									<Save className="h-4 w-4" />
									{isCreatingAnnouncement ? "등록 중..." : "공지 등록"}
								</button>
							</form>

							<div className="mt-5 space-y-3">
								{announcements.map((item) => (
									<AnnouncementEditor
										key={item.id}
										item={item}
										onSave={handleUpdateAnnouncement}
										onDelete={handleDeleteAnnouncement}
										isSaving={isSavingAnnouncementId === item.id}
										isDeleting={isDeletingAnnouncementId === item.id}
									/>
								))}
								{!isLoadingList && announcements.length === 0 ? (
									<p className="text-sm text-zinc-500">등록된 공지사항이 없습니다.</p>
								) : null}
							</div>
						</section>
					</>
				) : null}

				{listError ? (
					<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{listError}</p>
				) : null}
			</div>
		</main>
	);
}

type AnnouncementEditorProps = {
	item: AnnouncementItem;
	onSave: (id: number, contentValue: string) => Promise<void>;
	onDelete: (id: number) => Promise<void>;
	isSaving: boolean;
	isDeleting: boolean;
};

function AnnouncementEditor({ item, onSave, onDelete, isSaving, isDeleting }: AnnouncementEditorProps) {
	const [editValue, setEditValue] = useState(item.content);

	useEffect(() => {
		setEditValue(item.content);
	}, [item.content, item.id]);

	return (
		<div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
			<p className="mb-2 text-xs text-zinc-500">{toKoreanDate(item.created_at)}</p>
			<textarea
				rows={3}
				value={editValue}
				onChange={(event) => setEditValue(event.target.value)}
				className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
			/>
			<div className="mt-2 flex items-center gap-2">
				<button
					type="button"
					onClick={() => onSave(item.id, editValue)}
					disabled={isSaving}
					className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
				>
					<Save className="h-3.5 w-3.5" />
					{isSaving ? "저장 중..." : "수정 저장"}
				</button>
				<button
					type="button"
					onClick={() => onDelete(item.id)}
					disabled={isDeleting}
					className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
				>
					<Trash2 className="h-3.5 w-3.5" />
					{isDeleting ? "삭제 중..." : "삭제"}
				</button>
			</div>
		</div>
	);
}
