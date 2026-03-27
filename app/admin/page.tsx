"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, MessageSquareText, Pencil, Save, Trash2, Upload, UserRound, Video } from "lucide-react";
import type { ExamRecord, Memo } from "@/utils/examRecordsMemos";
import { supabase } from "../../utils/supabase";
import { parseStructuredMaterialContent } from "../../utils/materialParser";

type Category = "문학" | "비문학";
type AdminTab = "materials" | "videos" | "main" | "members" | "requests";

type MaterialItem = {
	id: number;
	title: string;
	subtitle: string | null;
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
	title: string;
	content: string;
	created_at: string;
};

type HomeSetting = {
	id: number;
	welcome_title: string;
	welcome_subtitle: string;
	show_post_dates: boolean;
};

type StudentItem = {
	id: string;
	username: string;
	name: string;
	academy: string;
	phone: string;
	is_approved: boolean;
	created_at: string;
};

type StudentRequestItem = {
	id: number;
	student_id: string;
	student_code: string;
	student_name: string;
	request_type: "보강영상" | "질문" | "상담";
	title: string;
	content: string;
	status: "접수" | "처리중" | "완료";
	admin_reply: string | null;
	support_video_url: string | null;
	is_deleted: boolean;
	created_at: string;
	updated_at: string;
};

type SignupRequestItem = {
	id: number;
	student_id: string;
	password: string;
	student_name: string;
	academy: "서정학원" | "다올105" | "라파에듀" | "입시왕";
	phone: string;
	grade: string;
	recent_test: string | null;
	recent_grade: string | null;
	selected_subject: string | null;
	status: "대기" | "승인" | "거절";
	admin_note: string | null;
	created_at: string;
	updated_at: string;
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
			const id = parsed.pathname.replace("/", "");
			return id ? `https://www.youtube.com/embed/${id}` : null;
		}
		if (parsed.hostname.includes("youtube.com")) {
			if (parsed.pathname.startsWith("/embed/")) return videoUrl;
			const id = parsed.searchParams.get("v");
			return id ? `https://www.youtube.com/embed/${id}` : null;
		}
		return null;
	} catch {
		return null;
	}
}

function toStoragePath(fileUrl: string | null) {
	if (!fileUrl) return null;
	if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
		try {
			const parsed = new URL(fileUrl);
			const marker = "/storage/v1/object/public/materials/";
			const idx = parsed.pathname.indexOf(marker);
			if (idx === -1) return null;
			return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
		} catch {
			return null;
		}
	}
	return fileUrl;
}

export default function AdminPage() {
	const [activeTab, setActiveTab] = useState<AdminTab>("materials");

	const [materials, setMaterials] = useState<MaterialItem[]>([]);
	const [videos, setVideos] = useState<VideoItem[]>([]);
	const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

	const [isLoadingList, setIsLoadingList] = useState(true);
	const [listError, setListError] = useState("");

	const [title, setTitle] = useState("");
	const [subtitle, setSubtitle] = useState("");
	const [category, setCategory] = useState<Category>("문학");
	const [content, setContent] = useState("");
	const [newFile, setNewFile] = useState<File | null>(null);
	const [showPreview, setShowPreview] = useState(false);

	const [createError, setCreateError] = useState("");
	const [createMessage, setCreateMessage] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editSubtitle, setEditSubtitle] = useState("");
	const [editCategory, setEditCategory] = useState<Category>("문학");
	const [editContent, setEditContent] = useState("");
	const [editOriginalFileUrl, setEditOriginalFileUrl] = useState<string | null>(null);
	const [editOriginalFileName, setEditOriginalFileName] = useState<string | null>(null);
	const [editNewFile, setEditNewFile] = useState<File | null>(null);
	const [editError, setEditError] = useState("");
	const [isLoadingEditMaterial, setIsLoadingEditMaterial] = useState(false);
	const [isSavingEdit, setIsSavingEdit] = useState(false);

	const [videoTitle, setVideoTitle] = useState("");
	const [videoCategory, setVideoCategory] = useState<Category>("문학");
	const [videoUrl, setVideoUrl] = useState("");
	const [isCreatingVideo, setIsCreatingVideo] = useState(false);
	const [videoError, setVideoError] = useState("");
	const [videoMessage, setVideoMessage] = useState("");

	const [deleteError, setDeleteError] = useState("");
	const [deleteMessage, setDeleteMessage] = useState("");
	const [isDeletingMaterialId, setIsDeletingMaterialId] = useState<number | null>(null);
	const [isDeletingVideoId, setIsDeletingVideoId] = useState<number | null>(null);

	const [homeTitle, setHomeTitle] = useState("강의실에 오신 것을 환영합니다!");
	const [homeSubtitle, setHomeSubtitle] = useState("오늘도 즐거운 배움이 가득한 하루를 시작해 보세요.");
	const [showPostDates, setShowPostDates] = useState(true);
	const [isSavingMain, setIsSavingMain] = useState(false);
	const [mainMessage, setMainMessage] = useState("");
	const [mainError, setMainError] = useState("");

	const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
	const [newAnnouncementContent, setNewAnnouncementContent] = useState("");
	const [announcementMessage, setAnnouncementMessage] = useState("");
	const [announcementError, setAnnouncementError] = useState("");
	const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
	const [isSavingAnnouncementId, setIsSavingAnnouncementId] = useState<number | null>(null);
	const [isDeletingAnnouncementId, setIsDeletingAnnouncementId] = useState<number | null>(null);

	const [students, setStudents] = useState<StudentItem[]>([]);
	const [studentRequests, setStudentRequests] = useState<StudentRequestItem[]>([]);
	const [signupRequests, setSignupRequests] = useState<SignupRequestItem[]>([]);
	const [studentsError, setStudentsError] = useState("");
	const [studentsMessage, setStudentsMessage] = useState("");
	const [signupError, setSignupError] = useState("");
	const [signupMessage, setSignupMessage] = useState("");
	const [requestsError, setRequestsError] = useState("");
	const [requestsMessage, setRequestsMessage] = useState("");
	const [newStudentId, setNewStudentId] = useState("");
	const [newStudentName, setNewStudentName] = useState("");
	const [newStudentPassword, setNewStudentPassword] = useState("");
	const [newStudentAcademy, setNewStudentAcademy] = useState("");
	const [newStudentPhone, setNewStudentPhone] = useState("");
	const [isCreatingStudent, setIsCreatingStudent] = useState(false);
	const [isApprovingStudentId, setIsApprovingStudentId] = useState<string | null>(null);
	const [isDeletingStudentId, setIsDeletingStudentId] = useState<string | null>(null);
	const [isSavingRequestId, setIsSavingRequestId] = useState<number | null>(null);
	const [isProcessingSignupId, setIsProcessingSignupId] = useState<number | null>(null);
	const [isDeletingSignupId, setIsDeletingSignupId] = useState<number | null>(null);
	const [isDeletingRequestId, setIsDeletingRequestId] = useState<number | null>(null);

	const [studentDetailModal, setStudentDetailModal] = useState<StudentItem | null>(null);
	const [detailExamRecords, setDetailExamRecords] = useState<ExamRecord[]>([]);
	const [detailMemos, setDetailMemos] = useState<Memo[]>([]);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailExamError, setDetailExamError] = useState("");
	const [detailMemoError, setDetailMemoError] = useState("");
	const [memoNewContent, setMemoNewContent] = useState("");
	const [memoSubmitting, setMemoSubmitting] = useState(false);
	const [memoFormError, setMemoFormError] = useState("");
	const [memoFormMessage, setMemoFormMessage] = useState("");
	const [modalResetPassword, setModalResetPassword] = useState("");
	const [modalPasswordError, setModalPasswordError] = useState("");
	const [modalPasswordMessage, setModalPasswordMessage] = useState("");
	const [isSavingModalPassword, setIsSavingModalPassword] = useState(false);

	const parsedPreview = useMemo(() => parseStructuredMaterialContent(content), [content]);

	const fetchManagementData = useCallback(async () => {
		const [studentsResponse, requestsResponse, signupResponse] = await Promise.all([
			fetch("/api/admin/students", { cache: "no-store" }),
			fetch("/api/admin/requests", { cache: "no-store" }),
			fetch("/api/admin/signup", { cache: "no-store" }),
		]);

		const studentsResult = (await studentsResponse.json()) as { students?: StudentItem[]; message?: string };
		const requestsResult = (await requestsResponse.json()) as { requests?: StudentRequestItem[]; message?: string };
		const signupResult = (await signupResponse.json()) as { signupRequests?: SignupRequestItem[]; message?: string };

		if (!studentsResponse.ok) {
			setStudentsError(studentsResult.message ?? "학생 목록을 불러오지 못했습니다.");
			setStudents([]);
		} else {
			setStudentsError("");
			setStudents(studentsResult.students ?? []);
		}

		if (!requestsResponse.ok) {
			setRequestsError(requestsResult.message ?? "요청 목록을 불러오지 못했습니다.");
			setStudentRequests([]);
		} else {
			setRequestsError("");
			setStudentRequests(requestsResult.requests ?? []);
		}

		if (!signupResponse.ok) {
			setSignupError(signupResult.message ?? "가입신청 목록을 불러오지 못했습니다.");
			setSignupRequests([]);
		} else {
			setSignupError("");
			setSignupRequests(signupResult.signupRequests ?? []);
		}
	}, []);

	const fetchAdminData = useCallback(async () => {
		setIsLoadingList(true);
		setListError("");

		const [materialResult, videoResult, announcementResult, settingResult] = await Promise.all([
			supabase
				.from("materials")
				.select("id, title, subtitle, category, file_url, file_name, created_at")
				.order("created_at", { ascending: false })
				.limit(100),
			supabase
				.from("videos")
				.select("id, title, video_url, category, created_at")
				.order("created_at", { ascending: false })
				.limit(100),
			supabase.from("announcements").select("id, title, content, created_at").order("created_at", { ascending: false }).limit(30),
			supabase.from("home_settings").select("id, welcome_title, welcome_subtitle, show_post_dates").eq("id", 1).maybeSingle(),
		]);

		if (materialResult.error || videoResult.error || announcementResult.error) {
			setListError("목록을 불러오지 못했습니다.");
			setMaterials([]);
			setVideos([]);
			setAnnouncements([]);
			setIsLoadingList(false);
			return;
		}

		if (settingResult.data) {
			const setting = settingResult.data as HomeSetting;
			setHomeTitle(setting.welcome_title || "강의실에 오신 것을 환영합니다!");
			setHomeSubtitle(setting.welcome_subtitle || "오늘도 즐거운 배움이 가득한 하루를 시작해 보세요.");
			setShowPostDates(setting.show_post_dates ?? true);
		}

		setMaterials((materialResult.data ?? []) as MaterialItem[]);
		setVideos((videoResult.data ?? []) as VideoItem[]);
		setAnnouncements((announcementResult.data ?? []) as AnnouncementItem[]);
		await fetchManagementData();
		setIsLoadingList(false);
	}, [fetchManagementData]);

	useEffect(() => {
		void fetchAdminData();
	}, [fetchAdminData]);

	const uploadPdfToStorage = async (materialId: number, file: File) => {
		const cleanedName = safeFileName(file.name);
		const path = `${materialId}/${Date.now()}-${cleanedName}`;
		const { error } = await supabase.storage.from("materials").upload(path, file, {
			cacheControl: "3600",
			upsert: false,
			contentType: "application/pdf",
		});
		if (error) throw error;
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
				subtitle: subtitle.trim() || null,
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
					.update({ file_url: filePath, file_name: newFile.name, file_size: newFile.size })
					.eq("id", inserted.id);
				if (updateError) {
					setCreateError("자료는 생성되었지만 PDF 연결에 실패했습니다.");
					setIsCreating(false);
					await fetchAdminData();
					return;
				}
			}

			setTitle("");
			setSubtitle("");
			setContent("");
			setCategory("문학");
			setNewFile(null);
			setShowPreview(false);
			setCreateMessage("자료가 저장되었습니다.");
			await fetchAdminData();
		} catch (error) {
			setCreateError(error instanceof Error ? error.message : "PDF 업로드 중 오류가 발생했습니다.");
		} finally {
			setIsCreating(false);
		}
	};

	const closeMaterialEdit = () => {
		setEditingMaterialId(null);
		setEditError("");
		setEditNewFile(null);
		setIsLoadingEditMaterial(false);
	};

	const openMaterialEdit = async (material: MaterialItem) => {
		setEditingMaterialId(material.id);
		setEditError("");
		setEditNewFile(null);
		setIsLoadingEditMaterial(true);
		const { data, error } = await supabase
			.from("materials")
			.select("id, title, subtitle, content, category, file_url, file_name, file_size")
			.eq("id", material.id)
			.single();
		setIsLoadingEditMaterial(false);
		if (error || !data) {
			setEditError("자료 정보를 불러오지 못했습니다.");
			setEditingMaterialId(null);
			return;
		}
		setEditTitle(data.title ?? "");
		setEditSubtitle(data.subtitle ?? "");
		setEditCategory((data.category as Category) || "문학");
		setEditContent(typeof data.content === "string" ? data.content : "");
		setEditOriginalFileUrl(data.file_url ?? null);
		setEditOriginalFileName(data.file_name ?? null);
	};

	const handleSaveMaterialEdit = async (event: FormEvent) => {
		event.preventDefault();
		if (editingMaterialId === null) return;
		setEditError("");
		setDeleteError("");
		setDeleteMessage("");

		if (!editTitle.trim()) {
			setEditError("제목은 필수입니다.");
			return;
		}
		if (editNewFile && editNewFile.type !== "application/pdf") {
			setEditError("PDF 파일만 업로드할 수 있습니다.");
			return;
		}
		const willHavePdf = Boolean(editNewFile || editOriginalFileUrl);
		if (!editContent.trim() && !willHavePdf) {
			setEditError("본문 또는 PDF 중 하나는 입력해 주세요.");
			return;
		}

		setIsSavingEdit(true);
		const base = {
			title: editTitle.trim(),
			subtitle: editSubtitle.trim() || null,
			category: editCategory,
			content: editContent.trim(),
		};

		try {
			if (editNewFile) {
				const oldStoragePath = toStoragePath(editOriginalFileUrl);
				const newPath = await uploadPdfToStorage(editingMaterialId, editNewFile);
				const { error: updateError } = await supabase
					.from("materials")
					.update({
						...base,
						file_url: newPath,
						file_name: editNewFile.name,
						file_size: editNewFile.size,
					})
					.eq("id", editingMaterialId);

				if (updateError) {
					await supabase.storage.from("materials").remove([newPath]);
					setEditError(updateError.message || "자료 저장에 실패했습니다.");
					setIsSavingEdit(false);
					return;
				}

				if (oldStoragePath && oldStoragePath !== newPath) {
					await supabase.storage.from("materials").remove([oldStoragePath]);
				}
			} else {
				const { error: updateError } = await supabase.from("materials").update(base).eq("id", editingMaterialId);
				if (updateError) {
					setEditError(updateError.message || "자료 저장에 실패했습니다.");
					setIsSavingEdit(false);
					return;
				}
			}

			closeMaterialEdit();
			setDeleteMessage("자료가 수정되었습니다.");
			await fetchAdminData();
		} catch (err) {
			setEditError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
		} finally {
			setIsSavingEdit(false);
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
		if (!window.confirm(`정말 삭제할까요?\n${material.title}`)) return;
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
		if (!window.confirm(`정말 삭제할까요?\n${video.title}`)) return;
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
		setMainError("");
		setMainMessage("");
		if (!homeTitle.trim() || !homeSubtitle.trim()) {
			setMainError("환영 문구 제목과 내용을 모두 입력해 주세요.");
			return;
		}
		setIsSavingMain(true);
		const { error } = await supabase.from("home_settings").upsert(
			{ id: 1, welcome_title: homeTitle.trim(), welcome_subtitle: homeSubtitle.trim(), show_post_dates: showPostDates },
			{ onConflict: "id" },
		);
		if (error) {
			setMainError("메인 설정 저장에 실패했습니다.");
			setIsSavingMain(false);
			return;
		}
		setMainMessage("메인 설정이 저장되었습니다.");
		setIsSavingMain(false);
	};

	const handleCreateAnnouncement = async (event: FormEvent) => {
		event.preventDefault();
		setAnnouncementError("");
		setAnnouncementMessage("");
		if (!newAnnouncementTitle.trim() || !newAnnouncementContent.trim()) {
			setAnnouncementError("공지 제목과 내용을 모두 입력해 주세요.");
			return;
		}
		setIsCreatingAnnouncement(true);
		const { error } = await supabase.from("announcements").insert({
			title: newAnnouncementTitle.trim(),
			content: newAnnouncementContent.trim(),
		});
		if (error) {
			setAnnouncementError(error.message || "공지 등록에 실패했습니다.");
			setIsCreatingAnnouncement(false);
			return;
		}
		setNewAnnouncementTitle("");
		setNewAnnouncementContent("");
		setAnnouncementMessage("공지사항이 등록되었습니다.");
		setIsCreatingAnnouncement(false);
		await fetchAdminData();
	};

	const handleUpdateAnnouncement = async (id: number, titleValue: string, contentValue: string) => {
		setAnnouncementError("");
		setAnnouncementMessage("");
		if (!titleValue.trim() || !contentValue.trim()) {
			setAnnouncementError("공지 제목과 내용을 모두 입력해 주세요.");
			return;
		}
		setIsSavingAnnouncementId(id);
		const { error } = await supabase
			.from("announcements")
			.update({ title: titleValue.trim(), content: contentValue.trim() })
			.eq("id", id);
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
		if (!window.confirm("정말 이 공지사항을 삭제할까요?")) return;
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

	const handleCreateStudent = async (event: FormEvent) => {
		event.preventDefault();
		setStudentsError("");
		setStudentsMessage("");

		if (!newStudentId.trim() || !newStudentName.trim() || !newStudentPassword.trim()) {
			setStudentsError("학생 아이디, 이름, 비밀번호를 모두 입력해 주세요.");
			return;
		}

		setIsCreatingStudent(true);
		const response = await fetch("/api/admin/students", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				studentId: newStudentId.trim(),
				name: newStudentName.trim(),
				password: newStudentPassword,
				academy: newStudentAcademy.trim() || "-",
				phone: newStudentPhone.trim().replace(/[-\s]/g, "") || "-",
				isApproved: true,
			}),
		});

		const result = (await response.json()) as { message?: string };
		if (!response.ok) {
			setStudentsError(result.message ?? "학생 추가에 실패했습니다.");
			setIsCreatingStudent(false);
			return;
		}

		setNewStudentId("");
		setNewStudentName("");
		setNewStudentPassword("");
		setNewStudentAcademy("");
		setNewStudentPhone("");
		setStudentsMessage("학생 계정이 추가되었습니다. (Supabase Auth + 프로필)");
		setIsCreatingStudent(false);
		await fetchManagementData();
	};

	const handleApproveStudent = async (student: StudentItem) => {
		setStudentsError("");
		setStudentsMessage("");
		setIsApprovingStudentId(student.id);

		const response = await fetch("/api/admin/students", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: student.id, isApproved: true }),
		});

		const result = (await response.json()) as { message?: string };
		if (!response.ok) {
			setStudentsError(result.message ?? "승인 처리에 실패했습니다.");
			setIsApprovingStudentId(null);
			return;
		}

		setStudentsMessage("학생 계정을 승인했습니다.");
		setIsApprovingStudentId(null);
		await fetchManagementData();
	};

	const handleDeleteStudent = async (student: StudentItem) => {
		if (!window.confirm(`정말 삭제할까요?\nAuth 계정과 프로필이 함께 삭제됩니다.\n${student.name} (${student.username})`)) return;
		setStudentsError("");
		setStudentsMessage("");
		setIsDeletingStudentId(student.id);

		const response = await fetch("/api/admin/students", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: student.id }),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setStudentsError(result.message ?? "학생 삭제에 실패했습니다.");
			setIsDeletingStudentId(null);
			return;
		}

		setStudentsMessage("학생 계정을 삭제했습니다.");
		setIsDeletingStudentId(null);
		if (studentDetailModal?.id === student.id) {
			setStudentDetailModal(null);
		}
		await fetchManagementData();
	};

	const closeStudentDetailModal = () => {
		setStudentDetailModal(null);
		setDetailExamRecords([]);
		setDetailMemos([]);
		setDetailLoading(false);
		setDetailExamError("");
		setDetailMemoError("");
		setMemoNewContent("");
		setMemoFormError("");
		setMemoFormMessage("");
		setModalResetPassword("");
		setModalPasswordError("");
		setModalPasswordMessage("");
	};

	const openStudentDetailModal = async (student: StudentItem) => {
		setStudentDetailModal(student);
		setDetailLoading(true);
		setDetailExamError("");
		setDetailMemoError("");
		setMemoFormError("");
		setMemoFormMessage("");
		setModalResetPassword("");
		setModalPasswordError("");
		setModalPasswordMessage("");
		setDetailExamRecords([]);
		setDetailMemos([]);

		const sid = encodeURIComponent(student.id);
		const [exRes, memRes] = await Promise.all([
			fetch(`/api/exam-records?studentId=${sid}`, { cache: "no-store" }),
			fetch(`/api/memos?studentId=${sid}`, { cache: "no-store" }),
		]);
		const exJson = (await exRes.json()) as { records?: ExamRecord[]; message?: string };
		const memJson = (await memRes.json()) as { memos?: Memo[]; message?: string };

		setDetailLoading(false);

		if (!exRes.ok) {
			setDetailExamError(exJson.message ?? "성적을 불러오지 못했습니다.");
			setDetailExamRecords([]);
		} else {
			setDetailExamRecords(exJson.records ?? []);
		}

		if (!memRes.ok) {
			setDetailMemoError(memJson.message ?? "메모를 불러오지 못했습니다.");
			setDetailMemos([]);
		} else {
			setDetailMemos(memJson.memos ?? []);
		}
	};

	const handleAddStudentMemo = async (event: FormEvent) => {
		event.preventDefault();
		if (!studentDetailModal) return;
		setMemoFormError("");
		setMemoFormMessage("");
		const text = memoNewContent.trim();
		if (!text) {
			setMemoFormError("메모 내용을 입력해 주세요.");
			return;
		}

		setMemoSubmitting(true);
		const res = await fetch("/api/memos", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ studentId: studentDetailModal.id, content: text }),
		});
		const json = (await res.json()) as { message?: string };
		setMemoSubmitting(false);

		if (!res.ok) {
			setMemoFormError(json.message ?? "메모 등록에 실패했습니다.");
			return;
		}

		setMemoNewContent("");
		setMemoFormMessage("메모가 등록되었습니다.");

		const memRes = await fetch(`/api/memos?studentId=${encodeURIComponent(studentDetailModal.id)}`, { cache: "no-store" });
		const memJson = (await memRes.json()) as { memos?: Memo[]; message?: string };
		if (memRes.ok) {
			setDetailMemos(memJson.memos ?? []);
			setDetailMemoError("");
		}
	};

	const handleModalPasswordReset = async () => {
		if (!studentDetailModal) return;
		setModalPasswordError("");
		setModalPasswordMessage("");
		const pw = modalResetPassword.trim();
		if (pw.length < 6) {
			setModalPasswordError("비밀번호는 6자 이상이어야 합니다.");
			return;
		}
		setIsSavingModalPassword(true);
		const response = await fetch("/api/admin/students", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: studentDetailModal.id, password: pw }),
		});
		const result = (await response.json()) as { message?: string };
		setIsSavingModalPassword(false);
		if (!response.ok) {
			setModalPasswordError(result.message ?? "비밀번호 변경에 실패했습니다.");
			return;
		}
		setModalResetPassword("");
		setModalPasswordMessage("비밀번호가 변경되었습니다.");
	};

	const handleSaveRequest = async (
		id: number,
		status: StudentRequestItem["status"],
		adminReply: string,
		supportVideoUrl: string,
	) => {
		setRequestsError("");
		setRequestsMessage("");
		setIsSavingRequestId(id);

		const response = await fetch("/api/admin/requests", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, status, adminReply, supportVideoUrl }),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setRequestsError(result.message ?? "요청 답변 저장에 실패했습니다.");
			setIsSavingRequestId(null);
			return;
		}

		setRequestsMessage("요청 처리 내용이 저장되었습니다.");
		setIsSavingRequestId(null);
		await fetchManagementData();
	};

	const handleApproveSignup = async (item: SignupRequestItem, action: "approve" | "reject") => {
		setSignupError("");
		setSignupMessage("");
		setIsProcessingSignupId(item.id);

		const response = await fetch("/api/admin/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: item.id, action }),
		});
		const result = (await response.json()) as {
			message?: string;
			studentId?: string;
			password?: string;
		};

		if (!response.ok) {
			setSignupError(result.message ?? "가입 신청 처리에 실패했습니다.");
			setIsProcessingSignupId(null);
			return;
		}

		if (action === "approve") {
			setSignupMessage(`승인 완료: ${result.studentId} / 초기비밀번호 ${result.password}`);
		} else {
			setSignupMessage("가입 신청을 거절 처리했습니다.");
		}

		setIsProcessingSignupId(null);
		await fetchManagementData();
	};

	const handleDeleteSignup = async (id: number) => {
		if (!window.confirm("이 가입 신청 내역을 삭제할까요?")) return;
		setIsDeletingSignupId(id);
		setSignupError("");
		setSignupMessage("");

		const response = await fetch("/api/admin/signup", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setSignupError(result.message ?? "가입 신청 삭제에 실패했습니다.");
			setIsDeletingSignupId(null);
			return;
		}

		setSignupMessage("가입 신청 내역을 삭제했습니다.");
		setIsDeletingSignupId(null);
		await fetchManagementData();
	};

	const handleDeleteRequestForAdmin = async (id: number) => {
		if (!window.confirm("이 요청을 관리자 목록에서 완전히 삭제할까요?")) return;
		setIsDeletingRequestId(id);
		setRequestsError("");
		setRequestsMessage("");

		const response = await fetch("/api/admin/requests", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setRequestsError(result.message ?? "요청 삭제에 실패했습니다.");
			setIsDeletingRequestId(null);
			return;
		}

		setRequestsMessage("요청을 관리자 목록에서 삭제했습니다.");
		setIsDeletingRequestId(null);
		await fetchManagementData();
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
						<Link href="/material" className="inline-flex min-h-10 items-center rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">자료실로</Link>
					</div>

					<div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-200/70 p-1.5 sm:grid-cols-5">
						{[
							{ key: "materials", label: "자료 업로드" },
							{ key: "videos", label: "영상 업로드" },
							{ key: "main", label: "메인 설정" },
							{ key: "members", label: "회원관리" },
							{ key: "requests", label: "요청관리" },
						].map((tab) => (
							<button
								key={tab.key}
								type="button"
								onClick={() => setActiveTab(tab.key as AdminTab)}
								className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${activeTab === tab.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-white/80"}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</header>

				{activeTab === "materials" ? (
					<>
						<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
							<h2 className="text-lg font-semibold text-zinc-900">새 자료 등록</h2>
							<form className="mt-4 space-y-3" onSubmit={handleCreateMaterial}>
								<input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="자료 제목" className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
								<input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="자료 부제 (리스트 카드 상단 미리보기 문구)" className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
								<select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500">
									<option value="문학">문학</option>
									<option value="비문학">비문학</option>
								</select>
								<textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} placeholder="파싱형 원문/해설 텍스트를 전체 입력하세요." className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />

								<div className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5">
									<label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700">
										<Upload className="h-4 w-4" /> PDF 첨부 (선택)
										<input type="file" accept="application/pdf" onChange={(e) => setNewFile(e.target.files?.[0] ?? null)} className="hidden" />
									</label>
									<p className="mt-1 text-xs text-zinc-500">{newFile ? newFile.name : "선택된 파일 없음"}</p>
								</div>

								<div className="flex gap-2">
									<button type="button" onClick={() => setShowPreview((v) => !v)} className="inline-flex min-h-10 items-center rounded-xl border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
										{showPreview ? "미리보기 숨기기" : "파싱 미리보기"}
									</button>
									<button type="submit" disabled={isCreating} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
										<Save className="h-4 w-4" />{isCreating ? "저장 중..." : "자료 저장"}
									</button>
								</div>

								{createError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{createError}</p> : null}
								{createMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{createMessage}</p> : null}
							</form>

							{showPreview ? (
								<div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
									<h3 className="text-sm font-semibold text-zinc-900">파싱 미리보기</h3>
									<p className="mt-1 text-xs text-zinc-500">원문/해설 {parsedPreview.pairs.length}세트, 요약블록 {parsedPreview.summary ? "인식" : "미인식"}</p>
									{parsedPreview.summary ? (
										<div className="mt-3 space-y-2 text-sm">
											<p><b>핵심 소재 한줄 요약:</b> {parsedPreview.summary.oneLine || "-"}</p>
											<p><b>직관적인 쉬운 비유:</b> {parsedPreview.summary.analogy || "-"}</p>
											<p><b>기억할 대립항:</b> {parsedPreview.summary.contrast || "-"}</p>
											<p><b>필수 어휘 개수:</b> {parsedPreview.summary.essentialVocab.length}</p>
											<p><b>보조 어휘 개수:</b> {parsedPreview.summary.supportVocab.length}</p>
											<p><b>Q1:</b> {parsedPreview.summary.question1 || "-"}</p>
											<p><b>Q2:</b> {parsedPreview.summary.question2 || "-"}</p>
										</div>
									) : null}
								</div>
							) : null}
						</section>

						<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
							<h2 className="text-lg font-semibold text-zinc-900">자료 목록</h2>
							{deleteError ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{deleteError}</p> : null}
							{deleteMessage ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{deleteMessage}</p> : null}
							<div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
								{materials.map((material) => (
									<div key={material.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
										<p className="text-sm font-medium text-zinc-800">#{material.id} {material.title}</p>
										<p className="mt-0.5 text-xs text-zinc-500">{material.subtitle || "부제 없음"}</p>
										<p className="mt-0.5 text-xs text-zinc-500">{material.category} · {toKoreanDate(material.created_at)}{material.file_name ? ` · ${material.file_name}` : ""}</p>
										<div className="mt-2 flex flex-wrap gap-2">
											<button type="button" onClick={() => void openMaterialEdit(material)} disabled={editingMaterialId !== null} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-zinc-300 px-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60">
												<Pencil className="h-3.5 w-3.5" />자료 수정
											</button>
											<button type="button" onClick={() => handleDeleteMaterial(material)} disabled={isDeletingMaterialId === material.id} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-300 px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
												<Trash2 className="h-3.5 w-3.5" />{isDeletingMaterialId === material.id ? "삭제 중..." : "자료 삭제"}
											</button>
										</div>
									</div>
								))}
							</div>
						</section>

						{editingMaterialId !== null ? (
							<div
								className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
								role="dialog"
								aria-modal="true"
								aria-labelledby="material-edit-title"
								onClick={closeMaterialEdit}
							>
								<div
									className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
									onClick={(e) => e.stopPropagation()}
								>
									<div className="flex items-start justify-between gap-3">
										<h2 id="material-edit-title" className="text-lg font-semibold text-zinc-900">자료 수정</h2>
										<button type="button" onClick={closeMaterialEdit} className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800">
											닫기
										</button>
									</div>

									{isLoadingEditMaterial ? (
										<p className="mt-6 text-sm text-zinc-600">자료 정보를 불러오는 중입니다…</p>
									) : (
										<form className="mt-4 space-y-3" onSubmit={handleSaveMaterialEdit}>
											<input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="자료 제목" className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
											<input type="text" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} placeholder="자료 부제 (리스트 카드 상단 미리보기 문구)" className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
											<select value={editCategory} onChange={(e) => setEditCategory(e.target.value as Category)} className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500">
												<option value="문학">문학</option>
												<option value="비문학">비문학</option>
											</select>
											<textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={10} placeholder="파싱형 원문/해설 텍스트를 전체 입력하세요." className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />

											<p className="text-xs text-zinc-500">
												현재 PDF: {editOriginalFileName || "없음"}
												{editNewFile ? ` → 교체: ${editNewFile.name}` : ""}
											</p>
											<div className="rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5">
												<label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700">
													<Upload className="h-4 w-4" /> 새 PDF로 교체 (선택)
													<input type="file" accept="application/pdf" onChange={(e) => setEditNewFile(e.target.files?.[0] ?? null)} className="hidden" />
												</label>
												<p className="mt-1 text-xs text-zinc-500">{editNewFile ? editNewFile.name : "선택 시 기존 파일은 저장 후 삭제됩니다."}</p>
											</div>

											{editError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{editError}</p> : null}

											<div className="flex flex-wrap gap-2 pt-1">
												<button type="button" onClick={closeMaterialEdit} className="inline-flex min-h-10 items-center rounded-xl border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
													취소
												</button>
												<button type="submit" disabled={isSavingEdit} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
													<Save className="h-4 w-4" />{isSavingEdit ? "저장 중..." : "변경 저장"}
												</button>
											</div>
										</form>
									)}
								</div>
							</div>
						) : null}
					</>
				) : null}

				{activeTab === "videos" ? (
					<>
						<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
							<h2 className="text-lg font-semibold text-zinc-900">새 영상 등록</h2>
							<form className="mt-4 space-y-3" onSubmit={handleCreateVideo}>
								<input type="text" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} placeholder="영상 제목" className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
								<select value={videoCategory} onChange={(e) => setVideoCategory(e.target.value as Category)} className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500">
									<option value="문학">문학</option>
									<option value="비문학">비문학</option>
								</select>
								<input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="유튜브 링크" className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
								{videoError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{videoError}</p> : null}
								{videoMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{videoMessage}</p> : null}
								<button type="submit" disabled={isCreatingVideo} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
									<Video className="h-4 w-4" />{isCreatingVideo ? "등록 중..." : "영상 등록"}
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
										<button type="button" onClick={() => handleDeleteVideo(video)} disabled={isDeletingVideoId === video.id} className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-300 px-2.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
											<Trash2 className="h-3.5 w-3.5" />{isDeletingVideoId === video.id ? "삭제 중..." : "영상 삭제"}
										</button>
									</div>
								))}
							</div>
						</section>
					</>
				) : null}

				{activeTab === "main" ? (
					<>
						<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
							<h2 className="text-lg font-semibold text-zinc-900">메인 환영 문구 설정</h2>
							<form className="mt-4 space-y-3" onSubmit={handleSaveMainSetting}>
								<input type="text" value={homeTitle} onChange={(e) => setHomeTitle(e.target.value)} placeholder="강의실에 오신 것을 환영합니다!" className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
								<textarea rows={3} value={homeSubtitle} onChange={(e) => setHomeSubtitle(e.target.value)} placeholder="환영 문구 하단 설명" className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
								<label className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
									<input type="checkbox" checked={showPostDates} onChange={(e) => setShowPostDates(e.target.checked)} className="h-4 w-4" />
									게시물 날짜 표기 켜기
								</label>
								{mainError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{mainError}</p> : null}
								{mainMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mainMessage}</p> : null}
								<button type="submit" disabled={isSavingMain} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
									<Save className="h-4 w-4" />{isSavingMain ? "저장 중..." : "메인 문구 저장"}
								</button>
							</form>
						</section>

						<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
							<h2 className="text-lg font-semibold text-zinc-900">공지사항</h2>
							<form className="mt-4 space-y-3" onSubmit={handleCreateAnnouncement}>
								<input type="text" value={newAnnouncementTitle} onChange={(e) => setNewAnnouncementTitle(e.target.value)} placeholder="공지 제목" className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
								<textarea rows={3} value={newAnnouncementContent} onChange={(e) => setNewAnnouncementContent(e.target.value)} placeholder="공지 내용" className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500" />
								{announcementError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{announcementError}</p> : null}
								{announcementMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{announcementMessage}</p> : null}
								<button type="submit" disabled={isCreatingAnnouncement} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400">
									<Save className="h-4 w-4" />{isCreatingAnnouncement ? "등록 중..." : "공지 등록"}
								</button>
							</form>
							<div className="mt-5 space-y-3">
								{announcements.map((item) => (
									<AnnouncementEditor
										key={`${item.id}-${item.title}-${item.content}`}
										item={item}
										onSave={handleUpdateAnnouncement}
										onDelete={handleDeleteAnnouncement}
										isSaving={isSavingAnnouncementId === item.id}
										isDeleting={isDeletingAnnouncementId === item.id}
									/>
								))}
							</div>
						</section>
					</>
				) : null}

				{activeTab === "members" ? (
					<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
						<div className="flex items-center gap-2">
							<UserRound className="h-5 w-5 text-zinc-700" />
							<h2 className="text-lg font-semibold text-zinc-900">학생 회원관리</h2>
						</div>

						<p className="mt-2 text-xs text-zinc-500">로그인 이메일: <span className="font-mono">아이디@도메인</span> (도메인은 환경변수 NEXT_PUBLIC_STUDENT_AUTH_EMAIL_DOMAIN, 기본 myapp.com)</p>
						<form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={handleCreateStudent}>
							<input
								type="text"
								value={newStudentId}
								onChange={(e) => setNewStudentId(e.target.value)}
								placeholder="학생 아이디 (username)"
								className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
							/>
							<input
								type="text"
								value={newStudentName}
								onChange={(e) => setNewStudentName(e.target.value)}
								placeholder="학생 이름"
								className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
							/>
							<input
								type="text"
								value={newStudentPassword}
								onChange={(e) => setNewStudentPassword(e.target.value)}
								placeholder="초기 비밀번호 (Auth에만 저장)"
								className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
							/>
							<input
								type="text"
								value={newStudentAcademy}
								onChange={(e) => setNewStudentAcademy(e.target.value)}
								placeholder="학원"
								className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
							/>
							<input
								type="text"
								value={newStudentPhone}
								onChange={(e) => setNewStudentPhone(e.target.value)}
								placeholder="연락처"
								className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500 sm:col-span-2"
							/>
							<button type="submit" disabled={isCreatingStudent} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:col-span-2">
								{isCreatingStudent ? "추가 중..." : "학생 계정 추가 (Auth + 프로필)"}
							</button>
						</form>

						{studentsError ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{studentsError}</p> : null}
						{studentsMessage ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{studentsMessage}</p> : null}

						<div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
							{students.map((student) => (
								<div key={student.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
									<button
										type="button"
										onClick={() => void openStudentDetailModal(student)}
										className="w-full rounded-lg border border-transparent p-1 text-left outline-none ring-zinc-400 transition hover:border-zinc-200 hover:bg-white focus-visible:ring-2"
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<p className="text-sm font-medium text-zinc-900">{student.name} (<b>{student.username}</b>)</p>
												<p className="mt-0.5 text-xs text-zinc-500">{student.academy} · {student.phone}</p>
												<p className="mt-0.5 text-xs text-zinc-500">가입일: {toKoreanDate(student.created_at)}</p>
											</div>
											<span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-zinc-200/80 px-2 py-1 text-[10px] font-semibold text-zinc-600">
												<ClipboardList className="h-3 w-3" />
												상세
											</span>
										</div>
									</button>
									<div className="mt-2 flex flex-wrap items-center gap-2">
										<span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${student.is_approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
											{student.is_approved ? "승인됨" : "승인 대기"}
										</span>
										{!student.is_approved ? (
											<button
												type="button"
												onClick={() => void handleApproveStudent(student)}
												disabled={isApprovingStudentId === student.id}
												className="inline-flex min-h-9 items-center rounded-lg border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
											>
												{isApprovingStudentId === student.id ? "처리 중..." : "승인"}
											</button>
										) : null}
										<button type="button" onClick={() => void handleDeleteStudent(student)} disabled={isDeletingStudentId === student.id} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
											<Trash2 className="h-3.5 w-3.5" />{isDeletingStudentId === student.id ? "삭제 중..." : "삭제 (Auth+프로필)"}
										</button>
									</div>
								</div>
							))}
						</div>

						<div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
							<h3 className="text-sm font-semibold text-zinc-900">가입 신청 리스트</h3>
							{signupError ? <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{signupError}</p> : null}
							{signupMessage ? <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{signupMessage}</p> : null}
							<div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
								{signupRequests.map((item) => (
									<div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3">
										<p className="text-sm font-semibold text-zinc-900">{item.student_name} · {item.academy}</p>
										<p className="mt-1 text-xs text-zinc-600">아이디: <span className="font-mono">{item.student_id}</span> · 비밀번호: <span className="font-mono">{item.password}</span></p>
										<p className="mt-1 text-xs text-zinc-600">연락처: {item.phone} · 학년: {item.grade}</p>
										<p className="mt-1 text-xs text-zinc-500">최근 모의고사: {item.recent_test || "-"} · 등급: {item.recent_grade || "-"}</p>
										<p className="mt-1 text-xs text-zinc-500">선택과목: {item.selected_subject || "-"}</p>
										<p className="mt-1 text-xs text-zinc-500">신청일: {toKoreanDate(item.created_at)}</p>
										<div className="mt-2 flex flex-wrap items-center gap-2">
											<span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.status === "승인" ? "bg-emerald-100 text-emerald-700" : item.status === "거절" ? "bg-rose-100 text-rose-700" : "bg-zinc-200 text-zinc-700"}`}>
												{item.status}
											</span>
											<button
												type="button"
												onClick={() => handleApproveSignup(item, "approve")}
												disabled={item.status !== "대기" || isProcessingSignupId === item.id}
												className="inline-flex min-h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
											>
												{isProcessingSignupId === item.id ? "처리 중..." : "승인"}
											</button>
											<button
												type="button"
												onClick={() => handleApproveSignup(item, "reject")}
												disabled={item.status !== "대기" || isProcessingSignupId === item.id}
												className="inline-flex min-h-9 items-center rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
											>
												거절
											</button>
											<button
												type="button"
												onClick={() => handleDeleteSignup(item.id)}
												disabled={isDeletingSignupId === item.id}
												className="inline-flex min-h-9 items-center rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
											>
												{isDeletingSignupId === item.id ? "삭제 중..." : "신청 삭제"}
											</button>
										</div>
									</div>
								))}
								{signupRequests.length === 0 ? <p className="text-sm text-zinc-500">가입 신청이 없습니다.</p> : null}
							</div>
						</div>
					</section>
				) : null}

				{activeTab === "requests" ? (
					<section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
						<div className="flex items-center gap-2">
							<MessageSquareText className="h-5 w-5 text-zinc-700" />
							<h2 className="text-lg font-semibold text-zinc-900">학생 요청관리</h2>
						</div>
						{requestsError ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{requestsError}</p> : null}
						{requestsMessage ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{requestsMessage}</p> : null}

						<div className="mt-4 space-y-3">
							{studentRequests.map((item) => (
								<RequestEditor
									key={`${item.id}-${item.status}-${item.admin_reply ?? ""}-${item.support_video_url ?? ""}`}
									item={item}
									onSave={handleSaveRequest}
									onDelete={handleDeleteRequestForAdmin}
									isDeleting={isDeletingRequestId === item.id}
									isSaving={isSavingRequestId === item.id}
								/>
							))}
							{studentRequests.length === 0 ? <p className="text-sm text-zinc-500">접수된 요청이 없습니다.</p> : null}
						</div>
					</section>
				) : null}

				{studentDetailModal !== null ? (
					<div
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
						role="dialog"
						aria-modal="true"
						aria-labelledby="student-detail-title"
						onClick={closeStudentDetailModal}
					>
						<div
							className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-start justify-between gap-3">
								<div>
									<h2 id="student-detail-title" className="text-lg font-semibold text-zinc-900">
										{studentDetailModal.name}
									</h2>
									<p className="mt-0.5 text-xs text-zinc-500">프로필 UUID · {studentDetailModal.id}</p>
								</div>
								<button
									type="button"
									onClick={closeStudentDetailModal}
									className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
								>
									닫기
								</button>
							</div>

							<section className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
								<h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">기본 정보</h3>
								<dl className="mt-2 space-y-1 text-sm">
									<div className="flex justify-between gap-2">
										<dt className="text-zinc-500">이름</dt>
										<dd className="font-medium text-zinc-900">{studentDetailModal.name}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-zinc-500">아이디</dt>
										<dd className="font-mono text-zinc-900">{studentDetailModal.username}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-zinc-500">학원</dt>
										<dd className="text-zinc-900">{studentDetailModal.academy}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-zinc-500">연락처</dt>
										<dd className="text-zinc-900">{studentDetailModal.phone}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-zinc-500">승인</dt>
										<dd className={studentDetailModal.is_approved ? "font-medium text-emerald-700" : "font-medium text-amber-700"}>
											{studentDetailModal.is_approved ? "승인됨" : "대기"}
										</dd>
									</div>
								</dl>
							</section>

							<section className="mt-4 border-t border-zinc-100 pt-4">
								<h3 className="text-sm font-semibold text-zinc-900">비밀번호 초기화</h3>
								<p className="mt-1 text-xs text-zinc-500">Supabase Auth에만 반영되며 DB에 평문으로 저장되지 않습니다.</p>
								<div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
									<input
										type="password"
										value={modalResetPassword}
										onChange={(e) => setModalResetPassword(e.target.value)}
										placeholder="새 비밀번호 (6자 이상)"
										className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500 sm:max-w-xs"
										autoComplete="new-password"
									/>
									<button
										type="button"
										onClick={() => void handleModalPasswordReset()}
										disabled={isSavingModalPassword}
										className="inline-flex min-h-9 shrink-0 items-center rounded-xl border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60"
									>
										{isSavingModalPassword ? "저장 중…" : "적용"}
									</button>
								</div>
								{modalPasswordError ? <p className="mt-2 text-sm text-rose-600">{modalPasswordError}</p> : null}
								{modalPasswordMessage ? <p className="mt-2 text-sm text-emerald-700">{modalPasswordMessage}</p> : null}
							</section>

							{detailLoading ? <p className="mt-4 text-sm text-zinc-600">불러오는 중…</p> : null}

							<section className="mt-4 border-t border-zinc-100 pt-4">
								<h3 className="text-sm font-semibold text-zinc-900">성적</h3>
								{detailExamError ? <p className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1.5 text-sm text-rose-700">{detailExamError}</p> : null}
								{!detailLoading && !detailExamError && detailExamRecords.length === 0 ? (
									<p className="mt-2 text-sm text-zinc-500">등록된 성적이 없습니다.</p>
								) : null}
								<ul className="mt-2 max-h-44 space-y-2 overflow-y-auto">
									{detailExamRecords.map((row) => (
										<li key={row.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
											<div className="flex justify-between gap-2">
												<span className="font-medium text-zinc-900">{row.exam_name}</span>
												<span className="shrink-0 text-xs text-zinc-500">{toKoreanDate(row.created_at)}</span>
											</div>
											<p className="mt-1 text-xs text-zinc-600">
												점수 {row.score} · 등급 {row.grade}
											</p>
										</li>
									))}
								</ul>
							</section>

							<section className="mt-5 border-t border-zinc-100 pt-4">
								<h3 className="text-sm font-semibold text-zinc-900">관리자 메모 (타임라인)</h3>
								{detailMemoError ? <p className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1.5 text-sm text-rose-700">{detailMemoError}</p> : null}
								{!detailLoading && !detailMemoError && detailMemos.length === 0 ? (
									<p className="mt-2 text-sm text-zinc-500">메모가 없습니다.</p>
								) : null}
								<ul className="relative mt-3 max-h-52 space-y-0 overflow-y-auto border-l-2 border-zinc-200 pl-4">
									{[...detailMemos]
										.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
										.map((m) => (
											<li key={m.id} className="relative pb-4 last:pb-0">
												<span className="absolute -left-[calc(0.5rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-zinc-400 ring-1 ring-zinc-200" aria-hidden />
												<p className="text-[11px] font-medium text-zinc-500">{toKoreanDate(m.created_at)}</p>
												<p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{m.content}</p>
											</li>
										))}
								</ul>

								<form className="mt-4 space-y-2" onSubmit={handleAddStudentMemo}>
									<textarea
										value={memoNewContent}
										onChange={(e) => setMemoNewContent(e.target.value)}
										rows={3}
										placeholder="새 메모를 입력하세요."
										className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
									/>
									{memoFormError ? <p className="text-sm text-rose-600">{memoFormError}</p> : null}
									{memoFormMessage ? <p className="text-sm text-emerald-700">{memoFormMessage}</p> : null}
									<button
										type="submit"
										disabled={memoSubmitting}
										className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
									>
										<MessageSquareText className="h-3.5 w-3.5" />
										{memoSubmitting ? "등록 중…" : "메모 추가"}
									</button>
								</form>
							</section>
						</div>
					</div>
				) : null}

				{listError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{listError}</p> : null}
			</div>
		</main>
	);
}

type AnnouncementEditorProps = {
	item: AnnouncementItem;
	onSave: (id: number, titleValue: string, contentValue: string) => Promise<void>;
	onDelete: (id: number) => Promise<void>;
	isSaving: boolean;
	isDeleting: boolean;
};

function AnnouncementEditor({ item, onSave, onDelete, isSaving, isDeleting }: AnnouncementEditorProps) {
	const [titleValue, setTitleValue] = useState(item.title || "");
	const [contentValue, setContentValue] = useState(item.content || "");

	return (
		<div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
			<p className="mb-2 text-xs text-zinc-500">{toKoreanDate(item.created_at)}</p>
			<input type="text" value={titleValue} onChange={(e) => setTitleValue(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500" />
			<textarea rows={3} value={contentValue} onChange={(e) => setContentValue(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500" />
			<div className="mt-2 flex items-center gap-2">
				<button type="button" onClick={() => onSave(item.id, titleValue, contentValue)} disabled={isSaving} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60">
					<Save className="h-3.5 w-3.5" />{isSaving ? "저장 중..." : "수정 저장"}
				</button>
				<button type="button" onClick={() => onDelete(item.id)} disabled={isDeleting} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60">
					<Trash2 className="h-3.5 w-3.5" />{isDeleting ? "삭제 중..." : "삭제"}
				</button>
			</div>
		</div>
	);
}

type RequestEditorProps = {
	item: StudentRequestItem;
	onSave: (id: number, status: StudentRequestItem["status"], adminReply: string, supportVideoUrl: string) => Promise<void>;
	onDelete: (id: number) => Promise<void>;
	isSaving: boolean;
	isDeleting: boolean;
};

function RequestEditor({ item, onSave, onDelete, isSaving, isDeleting }: RequestEditorProps) {
	const [status, setStatus] = useState<StudentRequestItem["status"]>(item.status);
	const [adminReply, setAdminReply] = useState(item.admin_reply || "");
	const [supportVideoUrl, setSupportVideoUrl] = useState(item.support_video_url || "");

	return (
		<div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
			<p className="text-xs text-zinc-500">
				{item.request_type} · {item.student_name} ({item.student_code}) · {toKoreanDate(item.created_at)}
			</p>
			{item.is_deleted ? (
				<p className="mt-1 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
					학생 화면에서 삭제됨
				</p>
			) : null}
			<h3 className="mt-1 text-sm font-semibold text-zinc-900">{item.title}</h3>
			<p className="mt-1 text-sm text-zinc-700">{item.content}</p>

			<div className="mt-3 grid gap-2 sm:grid-cols-2">
				<select
					value={status}
					onChange={(e) => setStatus(e.target.value as StudentRequestItem["status"])}
					className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
				>
					<option value="접수">접수</option>
					<option value="처리중">처리중</option>
					<option value="완료">완료</option>
				</select>
				<input
					type="url"
					value={supportVideoUrl}
					onChange={(e) => setSupportVideoUrl(e.target.value)}
					placeholder="보강 영상 링크 (선택)"
					className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
				/>
			</div>

			<textarea
				rows={3}
				value={adminReply}
				onChange={(e) => setAdminReply(e.target.value)}
				placeholder="학생에게 보낼 답변"
				className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
			/>

			<div className="mt-2 flex items-center gap-2">
				<button
					type="button"
					onClick={() => onSave(item.id, status, adminReply, supportVideoUrl)}
					disabled={isSaving}
					className="inline-flex min-h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isSaving ? "저장 중..." : "처리 내용 저장"}
				</button>
				<button
					type="button"
					onClick={() => onDelete(item.id)}
					disabled={isDeleting}
					className="inline-flex min-h-9 items-center rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isDeleting ? "삭제 중..." : "요청 완전 삭제"}
				</button>
			</div>
		</div>
	);
}
