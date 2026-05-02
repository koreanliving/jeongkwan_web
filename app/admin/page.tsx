"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ClipboardList, ImagePlus, MessageSquareText, Pencil, Save, Trash2, Upload, UserRound, Users, Video } from "lucide-react";
import { ExamScoreFormFields } from "@/components/ExamScoreFormFields";
import { ExamTrendChartLazy } from "@/components/ExamTrendChartLazy";
import type { ExamRecord, Memo } from "@/utils/examRecordsMemos";
import type { MaterialViewRow } from "@/app/api/admin/student-material-views/route";
import { EXAM_KIND_OPTIONS, EXAM_KIND_OTHER, normalizeExamKindForForm } from "@/utils/examKinds";
import { supabase } from "../../utils/supabase";

const ADMIN_DEFAULT_EXAM_KIND = EXAM_KIND_OPTIONS[0];
import { insertMaterialImageIntoJson } from "../../utils/materialContentInsertImage";
import { insertMaterialFigureTagAtCursor } from "../../utils/materialTaggedFigure";
import { parseMaterialContent } from "../../utils/materialParser";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
import { toKoreanDate } from "@/utils/dateFormat";

type Category = "문학" | "비문학";
type AdminTab = "materials" | "videos" | "main" | "members" | "groups" | "requests";

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
	signup_grade?: string | null;
	target_university?: string | null;
	target_department?: string | null;
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

type ParentSignupRequestItem = {
	id: number;
	username: string;
	parent_name: string;
	phone: string;
	student_name: string;
	academy: string;
	status: "대기" | "승인" | "거절";
	admin_note: string | null;
	created_at: string;
	updated_at: string;
};

type ParentAccountItem = {
	id: string;
	username: string;
	name: string;
	phone: string;
	linked_student_id: string;
	student_name: string;
	student_username: string;
	is_approved: boolean;
	created_at: string;
};

type ParentRequestAdminItem = {
	id: number;
	parent_id: string;
	parent_username: string;
	parent_name: string;
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

type ClassGroupAdminItem = {
	id: number;
	name: string;
	description: string | null;
	created_at: string;
	updated_at: string;
	student_ids: string[];
};

type ClassReportItem = {
	id: number;
	group_id: number;
	week_label: string;
	content: string;
	created_at: string;
	updated_at: string;
};

/** 이미지·혼합 블록 편집용 JSON 시작 템플릿 (text 블록 + 요약 필드) */
function defaultMaterialJsonTemplate(): string {
	return JSON.stringify(
		{
			blocks: [
				{
					type: "text",
					content: "첫 번째 원문·지문을 입력하세요.",
					commentary: "읽기 연습 툴팁·기본 스타일 카드 아래 해설",
				},
				{
					type: "text",
					content: "이미지 삽입 후 이어질 문단",
					commentary: "",
				},
			],
			summary: "[학생용 소재 요약본]\n핵심 소재 한줄 요약: ",
		},
		null,
		2,
	);
}

export default function AdminPage() {
	const [activeTab, setActiveTab] = useState<AdminTab>("materials");

	const [materials, setMaterials] = useState<MaterialItem[]>([]);
	const [videos, setVideos] = useState<VideoItem[]>([]);
	const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

	const [listError, setListError] = useState("");

	const [title, setTitle] = useState("");
	const [subtitle, setSubtitle] = useState("");
	const [category, setCategory] = useState<Category>("문학");
	const [content, setContent] = useState("");
	const [displayStyle, setDisplayStyle] = useState<"standard" | "reading">("standard");
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
	const [editDisplayStyle, setEditDisplayStyle] = useState<"standard" | "reading">("standard");
	const [editOriginalFileUrl, setEditOriginalFileUrl] = useState<string | null>(null);
	const [editOriginalFileName, setEditOriginalFileName] = useState<string | null>(null);
	const [editNewFile, setEditNewFile] = useState<File | null>(null);
	const [editError, setEditError] = useState("");
	const [isLoadingEditMaterial, setIsLoadingEditMaterial] = useState(false);
	const [isSavingEdit, setIsSavingEdit] = useState(false);

	const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
	const editContentTextareaRef = useRef<HTMLTextAreaElement>(null);
	const embedFileCreateRef = useRef<HTMLInputElement>(null);
	const embedFileEditRef = useRef<HTMLInputElement>(null);
	const [materialEmbedUploading, setMaterialEmbedUploading] = useState<"create" | "edit" | null>(null);

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
	const [parentRequests, setParentRequests] = useState<ParentRequestAdminItem[]>([]);
	const [parentRequestsError, setParentRequestsError] = useState("");
	const [parentRequestsMessage, setParentRequestsMessage] = useState("");
	const [isSavingParentRequestId, setIsSavingParentRequestId] = useState<number | null>(null);
	const [isDeletingParentRequestId, setIsDeletingParentRequestId] = useState<number | null>(null);
	const [parentSignupRequests, setParentSignupRequests] = useState<ParentSignupRequestItem[]>([]);
	const [parentSignupError, setParentSignupError] = useState("");
	const [parentSignupMessage, setParentSignupMessage] = useState("");
	const [isProcessingParentSignupId, setIsProcessingParentSignupId] = useState<number | null>(null);
	const [isDeletingParentSignupId, setIsDeletingParentSignupId] = useState<number | null>(null);
	const [parentLinkChoice, setParentLinkChoice] = useState<Record<number, string>>({});
	const [parentAccounts, setParentAccounts] = useState<ParentAccountItem[]>([]);
	const [parentAccountsError, setParentAccountsError] = useState("");
	const [parentAccountsMessage, setParentAccountsMessage] = useState("");
	const [parentPasswordDraft, setParentPasswordDraft] = useState<Record<string, string>>({});
	const [isDeletingParentAccountId, setIsDeletingParentAccountId] = useState<string | null>(null);
	const [isSavingParentPasswordId, setIsSavingParentPasswordId] = useState<string | null>(null);
	const [classGroups, setClassGroups] = useState<ClassGroupAdminItem[]>([]);
	const [groupsError, setGroupsError] = useState("");
	const [groupsMessage, setGroupsMessage] = useState("");
	const [newGroupName, setNewGroupName] = useState("");
	const [newGroupDesc, setNewGroupDesc] = useState("");
	const [isCreatingGroup, setIsCreatingGroup] = useState(false);
	const [groupStudentDraft, setGroupStudentDraft] = useState<Record<number, string[]>>({});
	const [groupMetaDraft, setGroupMetaDraft] = useState<Record<number, { name: string; description: string }>>({});
	const [savingGroupId, setSavingGroupId] = useState<number | null>(null);
	const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);
	const [reportGroupId, setReportGroupId] = useState<number | null>(null);
	const [classReports, setClassReports] = useState<ClassReportItem[]>([]);
	const [reportsLoading, setReportsLoading] = useState(false);
	const [newReportWeek, setNewReportWeek] = useState("");
	const [newReportContent, setNewReportContent] = useState("");
	const [isCreatingReport, setIsCreatingReport] = useState(false);
	const [deletingReportId, setDeletingReportId] = useState<number | null>(null);
	const [editingReportId, setEditingReportId] = useState<number | null>(null);
	const [editReportWeek, setEditReportWeek] = useState("");
	const [editReportContent, setEditReportContent] = useState("");
	const [savingReportId, setSavingReportId] = useState<number | null>(null);

	const [studentDetailModal, setStudentDetailModal] = useState<StudentItem | null>(null);
	const [detailExamRecords, setDetailExamRecords] = useState<ExamRecord[]>([]);
	const [detailMemos, setDetailMemos] = useState<Memo[]>([]);
	const [detailMaterialViews, setDetailMaterialViews] = useState<MaterialViewRow[]>([]);
	const [detailMaterialViewsError, setDetailMaterialViewsError] = useState("");
	const [detailMaterialViewsFilter, setDetailMaterialViewsFilter] = useState<"전체" | "문학" | "비문학">("전체");
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
	const [detailExamKind, setDetailExamKind] = useState<string>(ADMIN_DEFAULT_EXAM_KIND);
	const [detailExamDetail, setDetailExamDetail] = useState("");
	const [detailExamDate, setDetailExamDate] = useState("");
	const [detailExamScoreInput, setDetailExamScoreInput] = useState("");
	const [detailExamGradeInput, setDetailExamGradeInput] = useState("");
	const [detailExamSubmitting, setDetailExamSubmitting] = useState(false);
	const [detailExamFormError, setDetailExamFormError] = useState("");
	const [detailExamFormMessage, setDetailExamFormMessage] = useState("");
	const [isDeletingMemoId, setIsDeletingMemoId] = useState<number | null>(null);
	const [detailExamEditingId, setDetailExamEditingId] = useState<number | null>(null);
	const [detailEditExamKind, setDetailEditExamKind] = useState<string>(ADMIN_DEFAULT_EXAM_KIND);
	const [detailEditExamDetail, setDetailEditExamDetail] = useState("");
	const [detailEditExamDate, setDetailEditExamDate] = useState("");
	const [detailEditExamScore, setDetailEditExamScore] = useState("");
	const [detailEditExamGrade, setDetailEditExamGrade] = useState("");
	const [detailExamMutateError, setDetailExamMutateError] = useState("");
	const [detailSavingExamId, setDetailSavingExamId] = useState<number | null>(null);
	const [detailDeletingExamId, setDetailDeletingExamId] = useState<number | null>(null);

	const parsedPreview = useMemo(() => parseMaterialContent(content), [content]);
	const previewTextBlocks = parsedPreview.blocks.filter((b) => b.type === "text").length;
	const previewImageBlocks = parsedPreview.blocks.filter((b) => b.type === "image").length;

	const resolveParentLink = useCallback(
		(item: ParentSignupRequestItem): string => {
			if (item.status !== "대기") return "";
			const manual = parentLinkChoice[item.id];
			if (manual !== undefined) return manual;
			const matches = students.filter((s) => s.is_approved && s.name.trim() === item.student_name.trim());
			return matches.length === 1 ? matches[0].id : "";
		},
		[students, parentLinkChoice],
	);

	const fetchManagementData = useCallback(async () => {
		const [
			studentsResponse,
			requestsResponse,
			signupResponse,
			parentSignupResponse,
			classGroupsResponse,
			parentRequestsResponse,
			parentAccountsResponse,
		] = await Promise.all([
			fetch("/api/admin/students", { cache: "no-store" }),
			fetch("/api/admin/requests", { cache: "no-store" }),
			fetch("/api/admin/signup", { cache: "no-store" }),
			fetch("/api/admin/parent-signup", { cache: "no-store" }),
			fetch("/api/admin/class-groups", { cache: "no-store" }),
			fetch("/api/admin/parent-requests", { cache: "no-store" }),
			fetch("/api/admin/parent-accounts", { cache: "no-store" }),
		]);

		const studentsResult = (await studentsResponse.json()) as {
			students?: StudentItem[];
			message?: string;
			detail?: string;
		};
		const requestsResult = (await requestsResponse.json()) as { requests?: StudentRequestItem[]; message?: string };
		const signupResult = (await signupResponse.json()) as { signupRequests?: SignupRequestItem[]; message?: string };
		const parentSignupResult = (await parentSignupResponse.json()) as {
			parentSignupRequests?: ParentSignupRequestItem[];
			message?: string;
			detail?: string;
		};
		const classGroupsResult = (await classGroupsResponse.json()) as {
			groups?: ClassGroupAdminItem[];
			message?: string;
			detail?: string;
		};
		const parentRequestsResult = (await parentRequestsResponse.json()) as {
			requests?: ParentRequestAdminItem[];
			message?: string;
		};
		const parentAccountsResult = (await parentAccountsResponse.json()) as {
			accounts?: ParentAccountItem[];
			message?: string;
			detail?: string;
		};

		if (!studentsResponse.ok) {
			const base = studentsResult.message ?? "학생 목록을 불러오지 못했습니다.";
			setStudentsError(studentsResult.detail ? `${base} (${studentsResult.detail})` : base);
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

		if (!parentSignupResponse.ok) {
			const base = parentSignupResult.message ?? "학부모 가입신청 목록을 불러오지 못했습니다.";
			setParentSignupError(parentSignupResult.detail ? `${base} (${parentSignupResult.detail})` : base);
			setParentSignupRequests([]);
		} else {
			setParentSignupError("");
			setParentSignupRequests(parentSignupResult.parentSignupRequests ?? []);
		}

		if (!classGroupsResponse.ok) {
			const base = classGroupsResult.message ?? "수업반 목록을 불러오지 못했습니다.";
			setGroupsError(classGroupsResult.detail ? `${base} (${classGroupsResult.detail})` : base);
			setClassGroups([]);
			setGroupStudentDraft({});
			setGroupMetaDraft({});
		} else {
			setGroupsError("");
			const list = classGroupsResult.groups ?? [];
			setClassGroups(list);
			setGroupStudentDraft(Object.fromEntries(list.map((g) => [g.id, [...g.student_ids]])));
			setGroupMetaDraft(
				Object.fromEntries(
					list.map((g) => [g.id, { name: g.name, description: g.description ?? "" }]),
				),
			);
		}

		if (!parentRequestsResponse.ok) {
			setParentRequestsError(parentRequestsResult.message ?? "학부모 문의 목록을 불러오지 못했습니다.");
			setParentRequests([]);
		} else {
			setParentRequestsError("");
			setParentRequests(parentRequestsResult.requests ?? []);
		}

		if (!parentAccountsResponse.ok) {
			const base = parentAccountsResult.message ?? "학부모 계정 목록을 불러오지 못했습니다.";
			setParentAccountsError(parentAccountsResult.detail ? `${base} — ${parentAccountsResult.detail}` : base);
			setParentAccounts([]);
		} else {
			setParentAccountsError("");
			setParentAccounts(parentAccountsResult.accounts ?? []);
		}
	}, []);

	const fetchAdminData = useCallback(async () => {
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
			supabase.from("home_settings").select("id, show_post_dates").eq("id", 1).maybeSingle(),
		]);

		if (materialResult.error || videoResult.error || announcementResult.error) {
			setListError("목록을 불러오지 못했습니다.");
			setMaterials([]);
			setVideos([]);
			setAnnouncements([]);
			return;
		}

		if (settingResult.data) {
			const setting = settingResult.data as HomeSetting;
			setShowPostDates(setting.show_post_dates ?? true);
		}

		setMaterials((materialResult.data ?? []) as MaterialItem[]);
		setVideos((videoResult.data ?? []) as VideoItem[]);
		setAnnouncements((announcementResult.data ?? []) as AnnouncementItem[]);
		await fetchManagementData();
	}, [fetchManagementData]);

	useEffect(() => {
		void fetchAdminData();
	}, [fetchAdminData]);

	useEffect(() => {
		if (activeTab !== "groups") return;
		if (classGroups.length === 0) {
			setReportGroupId(null);
			return;
		}
		setReportGroupId((prev) => (prev !== null && classGroups.some((g) => g.id === prev) ? prev : classGroups[0].id));
	}, [activeTab, classGroups]);

	useEffect(() => {
		setEditingReportId(null);
		setEditReportWeek("");
		setEditReportContent("");
		if (reportGroupId === null) {
			setClassReports([]);
			return;
		}
		let cancelled = false;
		(async () => {
			setReportsLoading(true);
			const res = await fetch(`/api/admin/class-reports?groupId=${reportGroupId}`, { cache: "no-store" });
			const json = (await res.json()) as { reports?: ClassReportItem[] };
			if (!cancelled) {
				setReportsLoading(false);
				if (res.ok) setClassReports(json.reports ?? []);
				else setClassReports([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [reportGroupId]);

	const uploadMaterialEmbedImage = useCallback(async (file: File, materialId: number | null) => {
		const formData = new FormData();
		formData.set("file", file);
		if (materialId !== null) {
			formData.set("materialId", String(materialId));
		}
		const response = await fetch("/api/admin/material-assets", {
			method: "POST",
			body: formData,
		});
		const result = (await response.json()) as { path?: string; message?: string };
		if (!response.ok || !result.path) {
			throw new Error(result.message ?? "이미지 업로드에 실패했습니다.");
		}
		return result.path;
	}, []);

	const applyMaterialJsonTemplate = useCallback(
		(which: "create" | "edit") => {
			const current = which === "create" ? content : editContent;
			if (current.trim() && !window.confirm("현재 본문을 JSON 템플릿으로 바꿉니다. 계속할까요?")) {
				return;
			}
			const tpl = defaultMaterialJsonTemplate();
			if (which === "create") {
				setContent(tpl);
				setCreateError("");
			} else {
				setEditContent(tpl);
				setEditError("");
			}
		},
		[content, editContent],
	);

	const handleMaterialEmbedImageSelected = useCallback(
		async (which: "create" | "edit", file: File | null | undefined) => {
			if (!file) return;
			setMaterialEmbedUploading(which);
			try {
				const path = await uploadMaterialEmbedImage(file, which === "edit" ? editingMaterialId : null);
				const ta = which === "create" ? contentTextareaRef.current : editContentTextareaRef.current;
				const text = which === "create" ? content : editContent;
				const cursor = ta?.selectionStart ?? text.length;
				const alt = file.name.replace(/\.[^.]+$/, "") || "이미지";
				let next = insertMaterialImageIntoJson(text, cursor, path, alt);
				if (next === null) {
					next = insertMaterialFigureTagAtCursor(text, cursor, path);
				}
				if (which === "create") {
					setContent(next);
					setCreateError("");
				} else {
					setEditContent(next);
					setEditError("");
				}
				const marker = `"url": ${JSON.stringify(path)}`;
				const tagMarker = `[그림]${path}`;
				requestAnimationFrame(() => {
					ta?.focus();
					const idxJson = next.indexOf(marker);
					const idxTag = next.indexOf(tagMarker);
					const pos =
						idxJson >= 0
							? Math.min(idxJson + marker.length + 24, next.length)
							: idxTag >= 0
								? Math.min(idxTag + tagMarker.length, next.length)
								: next.length;
					ta?.setSelectionRange(pos, pos);
				});
			} catch (e) {
				const msg = e instanceof Error ? e.message : "이미지 업로드에 실패했습니다.";
				if (which === "create") setCreateError(msg);
				else setEditError(msg);
			} finally {
				setMaterialEmbedUploading(null);
			}
		},
		[content, editContent, editingMaterialId, uploadMaterialEmbedImage],
	);

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
		try {
			const formData = new FormData();
			formData.set("title", title.trim());
			formData.set("subtitle", subtitle.trim());
			formData.set("content", content.trim());
			formData.set("category", category);
			formData.set("displayStyle", displayStyle);
			if (newFile) formData.set("file", newFile);

			const response = await fetch("/api/admin/materials", {
				method: "POST",
				body: formData,
			});
			const result = (await response.json()) as { message?: string };
			if (!response.ok) {
				setCreateError(result.message ?? "자료 생성에 실패했습니다.");
				return;
			}

		setTitle("");
		setSubtitle("");
		setContent("");
		setCategory("문학");
		setDisplayStyle("standard");
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
		const response = await fetch(`/api/admin/materials?id=${material.id}`, { cache: "no-store" });
		const result = (await response.json()) as {
			material?: {
				title?: string | null;
				subtitle?: string | null;
				content?: string | null;
				category?: string | null;
				display_style?: string | null;
				file_url?: string | null;
				file_name?: string | null;
			};
			message?: string;
		};
		setIsLoadingEditMaterial(false);
		if (!response.ok || !result.material) {
			setEditError(result.message ?? "자료 정보를 불러오지 못했습니다.");
			setEditingMaterialId(null);
			return;
		}
		const data = result.material;
		setEditTitle(data.title ?? "");
		setEditSubtitle(data.subtitle ?? "");
		setEditCategory((data.category as Category) || "문학");
		setEditContent(typeof data.content === "string" ? data.content : "");
		setEditDisplayStyle((data.display_style as "standard" | "reading") || "standard");
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
		try {
			const formData = new FormData();
			formData.set("id", String(editingMaterialId));
			formData.set("title", editTitle.trim());
			formData.set("subtitle", editSubtitle.trim());
			formData.set("content", editContent.trim());
			formData.set("category", editCategory);
			formData.set("displayStyle", editDisplayStyle);
			if (editNewFile) formData.set("file", editNewFile);

			const response = await fetch("/api/admin/materials", {
				method: "PATCH",
				body: formData,
			});
			const result = (await response.json()) as { message?: string };
			if (!response.ok) {
				setEditError(result.message ?? "자료 저장에 실패했습니다.");
				return;
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
		const response = await fetch("/api/admin/videos", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title: videoTitle.trim(),
				videoUrl: videoUrl.trim(),
				category: videoCategory,
			}),
		});
		const result = (await response.json()) as { message?: string };
		if (!response.ok) {
			setVideoError(result.message || "영상 등록에 실패했습니다.");
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
		const response = await fetch("/api/admin/materials", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: material.id }),
		});
		const result = (await response.json()) as { message?: string };
		if (!response.ok) {
			setDeleteError(result.message || "자료 삭제에 실패했습니다.");
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
		const response = await fetch("/api/admin/videos", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: video.id }),
		});
		const result = (await response.json()) as { message?: string };
		if (!response.ok) {
			setDeleteError(result.message || "영상 삭제에 실패했습니다.");
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
		setIsSavingMain(true);
		const response = await fetch("/api/admin/settings", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ showPostDates }),
		});
		const result = (await response.json()) as { message?: string };
		if (!response.ok) {
			setMainError(result.message || "표시 설정 저장에 실패했습니다.");
			setIsSavingMain(false);
			return;
		}
		setMainMessage("표시 설정이 저장되었습니다.");
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
		const response = await fetch("/api/admin/announcements", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title: newAnnouncementTitle.trim(),
				content: newAnnouncementContent.trim(),
			}),
		});
		const result = (await response.json()) as { message?: string };
		if (!response.ok) {
			setAnnouncementError(result.message || "공지 등록에 실패했습니다.");
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
		const response = await fetch("/api/admin/announcements", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, title: titleValue.trim(), content: contentValue.trim() }),
		});
		const result = (await response.json()) as { message?: string };
		if (!response.ok) {
			setAnnouncementError(result.message || "공지 수정에 실패했습니다.");
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
		const response = await fetch("/api/admin/announcements", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});
		const result = (await response.json()) as { message?: string };
		if (!response.ok) {
			setAnnouncementError(result.message || "공지 삭제에 실패했습니다.");
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
		setDetailMaterialViews([]);
		setDetailMaterialViewsError("");
		setDetailMaterialViewsFilter("전체");
		setDetailLoading(false);
		setDetailExamError("");
		setDetailMemoError("");
		setMemoNewContent("");
		setMemoFormError("");
		setMemoFormMessage("");
		setModalResetPassword("");
		setModalPasswordError("");
		setModalPasswordMessage("");
		setDetailExamKind(ADMIN_DEFAULT_EXAM_KIND);
		setDetailExamDetail("");
		setDetailExamDate("");
		setDetailExamScoreInput("");
		setDetailExamGradeInput("");
		setDetailExamFormError("");
		setDetailExamFormMessage("");
		setIsDeletingMemoId(null);
		setDetailExamEditingId(null);
		setDetailEditExamKind(ADMIN_DEFAULT_EXAM_KIND);
		setDetailEditExamDetail("");
		setDetailEditExamDate("");
		setDetailEditExamScore("");
		setDetailEditExamGrade("");
		setDetailExamMutateError("");
		setDetailSavingExamId(null);
		setDetailDeletingExamId(null);
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
		setDetailExamKind(ADMIN_DEFAULT_EXAM_KIND);
		setDetailExamDetail("");
		setDetailExamDate("");
		setDetailExamScoreInput("");
		setDetailExamGradeInput("");
		setDetailExamFormError("");
		setDetailExamFormMessage("");
		setDetailExamEditingId(null);
		setDetailEditExamKind(ADMIN_DEFAULT_EXAM_KIND);
		setDetailEditExamDetail("");
		setDetailEditExamDate("");
		setDetailEditExamScore("");
		setDetailEditExamGrade("");
		setDetailExamMutateError("");
		setDetailSavingExamId(null);
		setDetailDeletingExamId(null);
		setDetailExamRecords([]);
		setDetailMemos([]);
		setDetailMaterialViews([]);
		setDetailMaterialViewsError("");
		setDetailMaterialViewsFilter("전체");

		const sid = encodeURIComponent(student.id);
		const [exRes, memRes, mvRes] = await Promise.all([
			fetch(`/api/exam-records?studentId=${sid}`, { cache: "no-store" }),
			fetch(`/api/memos?studentId=${sid}`, { cache: "no-store" }),
			fetch(`/api/admin/student-material-views?studentId=${sid}`, { cache: "no-store" }),
		]);
		const exJson = (await exRes.json()) as { records?: ExamRecord[]; message?: string };
		const memJson = (await memRes.json()) as { memos?: Memo[]; message?: string };
		const mvJson = (await mvRes.json()) as { items?: MaterialViewRow[]; message?: string };

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

		if (!mvRes.ok) {
			setDetailMaterialViewsError(mvJson.message ?? "자료 열람 기록을 불러오지 못했습니다.");
			setDetailMaterialViews([]);
		} else {
			setDetailMaterialViews(mvJson.items ?? []);
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

	const handleAddStudentExam = async (event: FormEvent) => {
		event.preventDefault();
		if (!studentDetailModal) return;
		setDetailExamFormError("");
		setDetailExamFormMessage("");

		const score = Number.parseInt(detailExamScoreInput, 10);
		const grade = Number.parseInt(detailExamGradeInput, 10);

		if (!detailExamDate.trim()) {
			setDetailExamFormError("응시일을 선택해 주세요.");
			return;
		}
		if (detailExamKind === EXAM_KIND_OTHER && !detailExamDetail.trim()) {
			setDetailExamFormError("사설/기타 선택 시 상세 시험 이름을 입력해 주세요.");
			return;
		}
		if (!Number.isFinite(score) || !Number.isInteger(score)) {
			setDetailExamFormError("점수는 정수로 입력해 주세요.");
			return;
		}
		if (!Number.isFinite(grade) || !Number.isInteger(grade)) {
			setDetailExamFormError("등급은 정수로 입력해 주세요.");
			return;
		}

		setDetailExamSubmitting(true);
		const res = await fetch("/api/exam-records", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				studentId: studentDetailModal.id,
				examKind: detailExamKind,
				examDetail: detailExamKind === EXAM_KIND_OTHER ? detailExamDetail.trim() : null,
				examDate: detailExamDate.trim(),
				score,
				grade,
			}),
		});
		const json = (await res.json()) as { message?: string };
		setDetailExamSubmitting(false);

		if (!res.ok) {
			setDetailExamFormError(json.message ?? "성적 등록에 실패했습니다.");
			return;
		}

		setDetailExamKind(ADMIN_DEFAULT_EXAM_KIND);
		setDetailExamDetail("");
		setDetailExamDate("");
		setDetailExamScoreInput("");
		setDetailExamGradeInput("");
		setDetailExamFormMessage("성적이 등록되었습니다.");

		await reloadDetailExams();
	};

	const reloadDetailExams = async () => {
		const modal = studentDetailModal;
		if (!modal) return;
		const exRes = await fetch(`/api/exam-records?studentId=${encodeURIComponent(modal.id)}`, { cache: "no-store" });
		const exJson = (await exRes.json()) as { records?: ExamRecord[]; message?: string };
		if (exRes.ok) {
			setDetailExamRecords(exJson.records ?? []);
			setDetailExamError("");
		}
	};

	const startDetailExamEdit = (row: ExamRecord) => {
		setDetailExamMutateError("");
		setDetailExamEditingId(row.id);
		const kind = normalizeExamKindForForm(row.exam_kind);
		setDetailEditExamKind(kind);
		setDetailEditExamDetail(kind === EXAM_KIND_OTHER ? (row.exam_detail ?? row.exam_name).trim() : "");
		setDetailEditExamDate(row.exam_date || "");
		setDetailEditExamScore(String(row.score));
		setDetailEditExamGrade(String(row.grade));
	};

	const cancelDetailExamEdit = () => {
		setDetailExamEditingId(null);
		setDetailExamMutateError("");
	};

	const handleDetailExamSaveEdit = async (event: FormEvent) => {
		event.preventDefault();
		if (!studentDetailModal || detailExamEditingId === null) return;
		setDetailExamMutateError("");

		const score = Number.parseInt(detailEditExamScore, 10);
		const grade = Number.parseInt(detailEditExamGrade, 10);
		if (!detailEditExamDate.trim()) {
			setDetailExamMutateError("응시일을 선택해 주세요.");
			return;
		}
		if (detailEditExamKind === EXAM_KIND_OTHER && !detailEditExamDetail.trim()) {
			setDetailExamMutateError("사설/기타 선택 시 상세 시험 이름을 입력해 주세요.");
			return;
		}
		if (!Number.isFinite(score) || !Number.isInteger(score)) {
			setDetailExamMutateError("점수는 정수로 입력해 주세요.");
			return;
		}
		if (!Number.isFinite(grade) || !Number.isInteger(grade)) {
			setDetailExamMutateError("등급은 정수로 입력해 주세요.");
			return;
		}

		setDetailSavingExamId(detailExamEditingId);
		const res = await fetch("/api/exam-records", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: detailExamEditingId,
				examKind: detailEditExamKind,
				examDetail: detailEditExamKind === EXAM_KIND_OTHER ? detailEditExamDetail.trim() : null,
				examDate: detailEditExamDate.trim(),
				score,
				grade,
			}),
		});
		const json = (await res.json()) as { message?: string };
		setDetailSavingExamId(null);

		if (!res.ok) {
			setDetailExamMutateError(json.message ?? "성적 수정에 실패했습니다.");
			return;
		}

		cancelDetailExamEdit();
		await reloadDetailExams();
	};

	const handleDetailExamDelete = async (examId: number) => {
		if (!studentDetailModal) return;
		if (!window.confirm("이 성적을 삭제할까요?")) return;
		setDetailExamMutateError("");
		setDetailDeletingExamId(examId);
		const res = await fetch("/api/exam-records", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: examId }),
		});
		const json = (await res.json()) as { message?: string };
		setDetailDeletingExamId(null);

		if (!res.ok) {
			setDetailExamMutateError(json.message ?? "성적 삭제에 실패했습니다.");
			return;
		}

		setDetailExamEditingId((cur) => (cur === examId ? null : cur));
		await reloadDetailExams();
	};

	const handleDeleteStudentMemo = async (memoId: number) => {
		if (!studentDetailModal) return;
		if (!window.confirm("이 메모를 삭제할까요?")) return;
		setMemoFormError("");
		setMemoFormMessage("");
		setIsDeletingMemoId(memoId);

		const res = await fetch("/api/memos", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: memoId }),
		});
		const json = (await res.json()) as { message?: string };
		setIsDeletingMemoId(null);

		if (!res.ok) {
			setMemoFormError(json.message ?? "메모 삭제에 실패했습니다.");
			return;
		}

		setMemoFormMessage("메모를 삭제했습니다.");
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
			detail?: string;
			studentId?: string;
		};

		if (!response.ok) {
			const base = result.message ?? "가입 신청 처리에 실패했습니다.";
			setSignupError(result.detail ? `${base} — ${result.detail}` : base);
			setIsProcessingSignupId(null);
			return;
		}

		if (action === "approve") {
			setSignupMessage(`승인 완료: ${result.studentId}`);
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

	const handleApproveParentSignup = async (item: ParentSignupRequestItem, action: "approve" | "reject") => {
		setParentSignupError("");
		setParentSignupMessage("");
		setIsProcessingParentSignupId(item.id);

		const linkedStudentId = action === "approve" ? resolveParentLink(item) : undefined;
		if (action === "approve" && !linkedStudentId) {
			setParentSignupError(
				"승인 시 연결할 학생을 선택해 주세요. (신청에 적힌 자녀 이름과 정확히 같은 승인 학생이 한 명이면 자동 선택됩니다.)",
			);
			setIsProcessingParentSignupId(null);
			return;
		}

		const response = await fetch("/api/admin/parent-signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: item.id,
				action,
				...(action === "approve" && linkedStudentId ? { linkedStudentId } : {}),
			}),
		});
		const result = (await response.json()) as {
			message?: string;
			detail?: string;
			username?: string;
			linkedStudentId?: string;
		};

		if (!response.ok) {
			const base = result.message ?? "학부모 가입 신청 처리에 실패했습니다.";
			setParentSignupError(result.detail ? `${base} — ${result.detail}` : base);
			setIsProcessingParentSignupId(null);
			return;
		}

		if (action === "approve") {
			setParentSignupMessage(`학부모 승인 완료: ${result.username ?? item.username} · 자녀 프로필 연결됨`);
			setParentLinkChoice((prev) => {
				const next = { ...prev };
				delete next[item.id];
				return next;
			});
		} else {
			setParentSignupMessage("학부모 가입 신청을 거절 처리했습니다.");
		}

		setIsProcessingParentSignupId(null);
		await fetchManagementData();
	};

	const handleDeleteParentSignup = async (id: number) => {
		if (!window.confirm("이 학부모 가입 신청 내역을 삭제할까요?")) return;
		setIsDeletingParentSignupId(id);
		setParentSignupError("");
		setParentSignupMessage("");

		const response = await fetch("/api/admin/parent-signup", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setParentSignupError(result.message ?? "학부모 가입 신청 삭제에 실패했습니다.");
			setIsDeletingParentSignupId(null);
			return;
		}

		setParentSignupMessage("학부모 가입 신청 내역을 삭제했습니다.");
		setIsDeletingParentSignupId(null);
		setParentLinkChoice((prev) => {
			const next = { ...prev };
			delete next[id];
			return next;
		});
		await fetchManagementData();
	};

	const handleResetParentPassword = async (parentId: string) => {
		setParentAccountsError("");
		setParentAccountsMessage("");
		const pw = (parentPasswordDraft[parentId] ?? "").trim();
		if (pw.length < 6) {
			setParentAccountsError("비밀번호는 6자 이상이어야 합니다.");
			return;
		}
		setIsSavingParentPasswordId(parentId);
		const res = await fetch("/api/admin/parent-accounts", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: parentId, password: pw }),
		});
		const result = (await res.json()) as { message?: string; detail?: string };
		setIsSavingParentPasswordId(null);
		if (!res.ok) {
			const base = result.message ?? "비밀번호 변경에 실패했습니다.";
			setParentAccountsError(result.detail ? `${base} — ${result.detail}` : base);
			return;
		}
		setParentPasswordDraft((prev) => {
			const next = { ...prev };
			delete next[parentId];
			return next;
		});
		setParentAccountsMessage("학부모 비밀번호를 변경했습니다.");
		await fetchManagementData();
	};

	const handleDeleteParentAccount = async (parentId: string) => {
		if (
			!window.confirm(
				"이 학부모 계정을 삭제할까요? 연결된 학부모 문의(parent_requests)도 함께 삭제됩니다. 자녀 학생 프로필은 삭제되지 않습니다.",
			)
		) {
			return;
		}
		setIsDeletingParentAccountId(parentId);
		setParentAccountsError("");
		setParentAccountsMessage("");
		const res = await fetch("/api/admin/parent-accounts", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: parentId }),
		});
		const result = (await res.json()) as { message?: string; detail?: string };
		setIsDeletingParentAccountId(null);
		if (!res.ok) {
			const base = result.message ?? "학부모 계정 삭제에 실패했습니다.";
			setParentAccountsError(result.detail ? `${base} — ${result.detail}` : base);
			return;
		}
		setParentPasswordDraft((prev) => {
			const next = { ...prev };
			delete next[parentId];
			return next;
		});
		setParentAccountsMessage("학부모 계정을 삭제했습니다.");
		await fetchManagementData();
	};

	const handleCreateGroup = async (event: FormEvent) => {
		event.preventDefault();
		setGroupsError("");
		setGroupsMessage("");
		const name = newGroupName.trim();
		if (!name) {
			setGroupsError("수업반 이름을 입력해 주세요.");
			return;
		}
		setIsCreatingGroup(true);
		const res = await fetch("/api/admin/class-groups", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, description: newGroupDesc.trim() || null }),
		});
		const result = (await res.json()) as { message?: string; detail?: string };
		setIsCreatingGroup(false);
		if (!res.ok) {
			const base = result.message ?? "수업반 생성에 실패했습니다.";
			setGroupsError(result.detail ? `${base} — ${result.detail}` : base);
			return;
		}
		setNewGroupName("");
		setNewGroupDesc("");
		setGroupsMessage("수업반이 생성되었습니다.");
		await fetchManagementData();
	};

	const handleSaveGroupMeta = async (groupId: number) => {
		setGroupsError("");
		setGroupsMessage("");
		const meta = groupMetaDraft[groupId];
		if (!meta?.name.trim()) {
			setGroupsError("수업반 이름은 비울 수 없습니다.");
			return;
		}
		setSavingGroupId(groupId);
		const res = await fetch("/api/admin/class-groups", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: groupId,
				name: meta.name.trim(),
				description: meta.description.trim() || null,
			}),
		});
		const result = (await res.json()) as { message?: string; detail?: string };
		setSavingGroupId(null);
		if (!res.ok) {
			const base = result.message ?? "저장에 실패했습니다.";
			setGroupsError(result.detail ? `${base} — ${result.detail}` : base);
			return;
		}
		setGroupsMessage("수업반 정보를 저장했습니다.");
		await fetchManagementData();
	};

	const handleSaveGroupStudents = async (groupId: number) => {
		setGroupsError("");
		setGroupsMessage("");
		setSavingGroupId(groupId);
		const res = await fetch("/api/admin/class-groups", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: groupId,
				studentIds: groupStudentDraft[groupId] ?? [],
			}),
		});
		const result = (await res.json()) as { message?: string; detail?: string };
		setSavingGroupId(null);
		if (!res.ok) {
			const base = result.message ?? "저장에 실패했습니다.";
			setGroupsError(result.detail ? `${base} — ${result.detail}` : base);
			return;
		}
		setGroupsMessage("반 소속 학생을 저장했습니다.");
		await fetchManagementData();
	};

	const handleDeleteGroup = async (groupId: number) => {
		if (!window.confirm("이 수업반과 소속·주간 리포트까지 모두 삭제할까요?")) return;
		setGroupsError("");
		setGroupsMessage("");
		setDeletingGroupId(groupId);
		const res = await fetch("/api/admin/class-groups", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: groupId }),
		});
		const result = (await res.json()) as { message?: string; detail?: string };
		setDeletingGroupId(null);
		if (!res.ok) {
			const base = result.message ?? "삭제에 실패했습니다.";
			setGroupsError(result.detail ? `${base} — ${result.detail}` : base);
			return;
		}
		setGroupsMessage("수업반을 삭제했습니다.");
		if (reportGroupId === groupId) setReportGroupId(null);
		await fetchManagementData();
	};

	const handleCreateReport = async (event: FormEvent) => {
		event.preventDefault();
		if (reportGroupId === null) return;
		setGroupsError("");
		setGroupsMessage("");
		const weekLabel = newReportWeek.trim();
		const content = newReportContent.trim();
		if (!weekLabel || !content) {
			setGroupsError("주차 라벨과 수업 내용을 입력해 주세요.");
			return;
		}
		setIsCreatingReport(true);
		const res = await fetch("/api/admin/class-reports", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ groupId: reportGroupId, weekLabel, content }),
		});
		const result = (await res.json()) as { message?: string; detail?: string };
		setIsCreatingReport(false);
		if (!res.ok) {
			const base = result.message ?? "리포트 등록에 실패했습니다.";
			setGroupsError(result.detail ? `${base} — ${result.detail}` : base);
			return;
		}
		setNewReportWeek("");
		setNewReportContent("");
		setGroupsMessage("주간 리포트를 등록했습니다.");
		const reload = await fetch(`/api/admin/class-reports?groupId=${reportGroupId}`, { cache: "no-store" });
		const j = (await reload.json()) as { reports?: ClassReportItem[] };
		if (reload.ok) setClassReports(j.reports ?? []);
	};

	const handleDeleteReport = async (reportId: number) => {
		if (!window.confirm("이 리포트를 삭제할까요?")) return;
		setDeletingReportId(reportId);
		setGroupsError("");
		const res = await fetch("/api/admin/class-reports", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: reportId }),
		});
		const result = (await res.json()) as { message?: string; detail?: string };
		setDeletingReportId(null);
		if (!res.ok) {
			const base = result.message ?? "삭제에 실패했습니다.";
			setGroupsError(result.detail ? `${base} — ${result.detail}` : base);
			return;
		}
		if (editingReportId === reportId) {
			setEditingReportId(null);
			setEditReportWeek("");
			setEditReportContent("");
		}
		setGroupsMessage("리포트를 삭제했습니다.");
		if (reportGroupId !== null) {
			const reload = await fetch(`/api/admin/class-reports?groupId=${reportGroupId}`, { cache: "no-store" });
			const j = (await reload.json()) as { reports?: ClassReportItem[] };
			if (reload.ok) setClassReports(j.reports ?? []);
		}
	};

	const startEditReport = (r: ClassReportItem) => {
		setGroupsError("");
		setEditingReportId(r.id);
		setEditReportWeek(r.week_label);
		setEditReportContent(r.content);
	};

	const cancelEditReport = () => {
		setEditingReportId(null);
		setEditReportWeek("");
		setEditReportContent("");
	};

	const handleSaveReportEdit = async (reportId: number) => {
		setGroupsError("");
		setGroupsMessage("");
		const weekLabel = editReportWeek.trim();
		const content = editReportContent.trim();
		if (!weekLabel || !content) {
			setGroupsError("주차 라벨과 수업 내용을 입력해 주세요.");
			return;
		}
		setSavingReportId(reportId);
		const res = await fetch("/api/admin/class-reports", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: reportId, weekLabel, content }),
		});
		const result = (await res.json()) as { message?: string; detail?: string };
		setSavingReportId(null);
		if (!res.ok) {
			const base = result.message ?? "리포트 수정에 실패했습니다.";
			setGroupsError(result.detail ? `${base} — ${result.detail}` : base);
			return;
		}
		cancelEditReport();
		setGroupsMessage("리포트를 수정했습니다.");
		if (reportGroupId !== null) {
			const reload = await fetch(`/api/admin/class-reports?groupId=${reportGroupId}`, { cache: "no-store" });
			const j = (await reload.json()) as { reports?: ClassReportItem[] };
			if (reload.ok) setClassReports(j.reports ?? []);
		}
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

	const handleSaveParentRequest = async (
		id: number,
		status: ParentRequestAdminItem["status"],
		adminReply: string,
		supportVideoUrl: string,
	) => {
		setParentRequestsError("");
		setParentRequestsMessage("");
		setIsSavingParentRequestId(id);

		const response = await fetch("/api/admin/parent-requests", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, status, adminReply, supportVideoUrl }),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setParentRequestsError(result.message ?? "문의 답변 저장에 실패했습니다.");
			setIsSavingParentRequestId(null);
			return;
		}

		setParentRequestsMessage("문의 처리 내용이 저장되었습니다.");
		setIsSavingParentRequestId(null);
		await fetchManagementData();
	};

	const handleDeleteParentRequestForAdmin = async (id: number) => {
		if (!window.confirm("이 학부모 문의를 관리자 목록에서 완전히 삭제할까요?")) return;
		setIsDeletingParentRequestId(id);
		setParentRequestsError("");
		setParentRequestsMessage("");

		const response = await fetch("/api/admin/parent-requests", {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id }),
		});
		const result = (await response.json()) as { message?: string };

		if (!response.ok) {
			setParentRequestsError(result.message ?? "문의 삭제에 실패했습니다.");
			setIsDeletingParentRequestId(null);
			return;
		}

		setParentRequestsMessage("문의를 관리자 목록에서 삭제했습니다.");
		setIsDeletingParentRequestId(null);
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

					<div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-200/70 p-1.5 sm:grid-cols-3 lg:grid-cols-6">
						{[
							{ key: "materials", label: "자료 업로드" },
							{ key: "videos", label: "영상 업로드" },
							{ key: "main", label: "메인 설정" },
							{ key: "members", label: "회원관리" },
							{ key: "groups", label: "수업반" },
							{ key: "requests", label: "요청관리" },
						].map((tab) => (
							<button
								key={tab.key}
								type="button"
								onClick={() => setActiveTab(tab.key as AdminTab)}
								className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${activeTab === tab.key ? "bg-brand text-white" : "text-zinc-600 hover:bg-white/80"}`}
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
								<div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
								<p className="mb-2 text-xs font-semibold text-zinc-600">표시 스타일</p>
								<div className="flex gap-4">
									<label className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700">
										<input type="radio" name="displayStyle" value="standard" checked={displayStyle === "standard"} onChange={() => setDisplayStyle("standard")} className="accent-brand" />
										기본 스타일
									</label>
									<label className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700">
										<input type="radio" name="displayStyle" value="reading" checked={displayStyle === "reading"} onChange={() => setDisplayStyle("reading")} className="accent-brand" />
										읽기 연습
									</label>
								</div>
								<p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
									<code className="rounded bg-zinc-200/80 px-1">[원문]</code>
									<code className="rounded bg-zinc-200/80 px-1">[해설]</code>
									을 반복하다가 그림을 넣을 자리에 커서를 두고 「이미지 삽입」하면{" "}
									<code className="rounded bg-zinc-200/80 px-1">[그림]업로드경로</code>가 붙습니다. 캡션은{" "}
									<code className="rounded bg-zinc-200/80 px-1">[그림]경로[해설]설명</code> 순으로 이어 쓸 수 있습니다. 요약은{" "}
									<code className="rounded bg-zinc-200/80 px-1">[학생용 소재 요약본]</code>을 본문 아래에 붙입니다. (기본·읽기 연습 동일)
								</p>
							</div>

							<div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
								<p className="text-xs font-semibold text-zinc-800">이미지 삽입 · JSON (선택)</p>
								<p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
									위 태그 방식이 기본입니다. 필요할 때만 「JSON 본문 템플릿」으로 <code className="rounded bg-zinc-100 px-1">blocks</code> 배열을 쓰고, 같은 「이미지 삽입」으로 JSON에도 넣을 수 있습니다.
								</p>
								<div className="mt-2 flex flex-wrap items-center gap-2">
									<button
										type="button"
										onClick={() => applyMaterialJsonTemplate("create")}
										className="inline-flex min-h-9 items-center rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100"
									>
										JSON 본문 템플릿
									</button>
									<button
										type="button"
										disabled={materialEmbedUploading === "create"}
										onClick={() => embedFileCreateRef.current?.click()}
										className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-3 text-xs font-semibold text-brand transition hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
									>
										<ImagePlus className="h-3.5 w-3.5" />
										{materialEmbedUploading === "create" ? "업로드 중…" : "이미지 삽입"}
									</button>
								</div>
								<input
									ref={embedFileCreateRef}
									type="file"
									accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
									className="hidden"
									onChange={(e) => {
										void handleMaterialEmbedImageSelected("create", e.target.files?.[0]);
										e.target.value = "";
									}}
								/>
							</div>

							<textarea
								ref={contentTextareaRef}
								value={content}
								onChange={(e) => setContent(e.target.value)}
								rows={10}
								placeholder={
									displayStyle === "reading"
										? "[원문]...\n[해설]...\n[원문]...\n[해설]...\n(커서) ← 여기서 이미지 삽입 → [그림]경로\n[학생용 소재 요약본]\n핵심 소재 한줄 요약: ..."
										: "[원문]...[해설]... 중간에 「이미지 삽입」으로 [그림]경로 끼우기. 요약은 [학생용 소재 요약본]..."
								}
								className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
							/>

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
									<button type="submit" disabled={isCreating} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-45">
										<Save className="h-4 w-4" />{isCreating ? "저장 중..." : "자료 저장"}
									</button>
								</div>

								{createError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{createError}</p> : null}
								{createMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{createMessage}</p> : null}
							</form>

							{showPreview ? (
								<div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
									<h3 className="text-sm font-semibold text-zinc-900">파싱 미리보기</h3>
									<p className="mt-1 text-xs text-zinc-500">
										형식:{" "}
										{parsedPreview.format === "json"
											? "JSON 블록"
											: parsedPreview.format === "tagged"
												? "태그([원문]/[해설]/[그림])"
												: "텍스트([원문]/[해설])"}
										{" "}
										· 텍스트 블록 {previewTextBlocks}개 · 이미지 블록 {previewImageBlocks}개 · 요약 {parsedPreview.summary ? "인식" : "미인식"}
									</p>
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

										<div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
											<p className="mb-2 text-xs font-semibold text-zinc-600">표시 스타일</p>
											<div className="flex gap-4">
												<label className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700">
													<input type="radio" name="editDisplayStyle" value="standard" checked={editDisplayStyle === "standard"} onChange={() => setEditDisplayStyle("standard")} className="accent-brand" />
													기본 스타일
												</label>
												<label className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-700">
													<input type="radio" name="editDisplayStyle" value="reading" checked={editDisplayStyle === "reading"} onChange={() => setEditDisplayStyle("reading")} className="accent-brand" />
													읽기 연습
												</label>
											</div>
											<p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
												<code className="rounded bg-zinc-200/80 px-1">[원문]</code>
												<code className="rounded bg-zinc-200/80 px-1">[해설]</code>
												반복 중 원하는 위치에 커서 → 「이미지 삽입」→{" "}
												<code className="rounded bg-zinc-200/80 px-1">[그림]경로</code> 생성.{" "}
												<code className="rounded bg-zinc-200/80 px-1">[학생용 소재 요약본]</code>은 하단에 그대로 사용합니다.
											</p>
										</div>

										<div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
											<p className="text-xs font-semibold text-zinc-800">이미지 삽입 · JSON (선택)</p>
											<p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
												태그 방식이 기본입니다. JSON이 필요하면 「JSON 본문 템플릿」 후 같은 버튼으로 삽입합니다.
											</p>
											<div className="mt-2 flex flex-wrap items-center gap-2">
												<button
													type="button"
													onClick={() => applyMaterialJsonTemplate("edit")}
													className="inline-flex min-h-9 items-center rounded-xl border border-zinc-300 bg-zinc-50 px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100"
												>
													JSON 본문 템플릿
												</button>
												<button
													type="button"
													disabled={materialEmbedUploading === "edit"}
													onClick={() => embedFileEditRef.current?.click()}
													className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-3 text-xs font-semibold text-brand transition hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
												>
													<ImagePlus className="h-3.5 w-3.5" />
													{materialEmbedUploading === "edit" ? "업로드 중…" : "이미지 삽입"}
												</button>
											</div>
											<input
												ref={embedFileEditRef}
												type="file"
												accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
												className="hidden"
												onChange={(e) => {
													void handleMaterialEmbedImageSelected("edit", e.target.files?.[0]);
													e.target.value = "";
												}}
											/>
										</div>

										<textarea
											ref={editContentTextareaRef}
											value={editContent}
											onChange={(e) => setEditContent(e.target.value)}
											rows={10}
											placeholder={
												editDisplayStyle === "reading"
													? "[원문]17세기 조선의...\n[해설]가만있을 조선 선비들이...\n\n[학생용 소재 요약본]\n핵심 소재 한줄 요약: ..."
													: "파싱형 원문/해설 텍스트를 전체 입력하세요."
											}
											className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
										/>

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
												<button type="submit" disabled={isSavingEdit} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-45">
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
								<button type="submit" disabled={isCreatingVideo} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-45">
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
							<h2 className="text-lg font-semibold text-zinc-900">표시 설정</h2>
							<p className="mt-1 text-xs text-zinc-500">홈·자료·영상 등 목록에 날짜를 보일지 정합니다.</p>
							<form className="mt-4 space-y-3" onSubmit={handleSaveMainSetting}>
								<label className="flex items-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
									<input type="checkbox" checked={showPostDates} onChange={(e) => setShowPostDates(e.target.checked)} className="h-4 w-4" />
									게시물 날짜 표기 켜기
								</label>
								{mainError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{mainError}</p> : null}
								{mainMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{mainMessage}</p> : null}
								<button type="submit" disabled={isSavingMain} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-45">
									<Save className="h-4 w-4" />{isSavingMain ? "저장 중..." : "표시 설정 저장"}
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
								<button type="submit" disabled={isCreatingAnnouncement} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-45">
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
							<button type="submit" disabled={isCreatingStudent} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-2">
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
												<p className="mt-0.5 text-xs text-zinc-500">
													학원 {student.academy} · 연락처 {student.phone}
													{student.signup_grade ? ` · 학년 ${student.signup_grade}` : ""}
												</p>
												{student.target_university || student.target_department ? (
													<p className="mt-0.5 text-xs text-brand">
														목표대학 {student.target_university?.trim() || "—"}
														{student.target_department ? ` · ${student.target_department}` : ""}
													</p>
												) : null}
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
										<p className="mt-1 text-xs text-zinc-600">아이디: <span className="font-mono">{item.student_id}</span></p>
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

						<div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
							<h3 className="text-sm font-semibold text-zinc-900">학부모 가입 신청</h3>
							<p className="mt-1 text-xs text-zinc-500">
								승인 시 자녀와 연결할 <span className="font-medium">승인된 학생 프로필</span>을 선택하세요. 비밀번호는 신청 시 입력값을 bcrypt 해시로 저장합니다.
							</p>
							{parentSignupError ? (
								<p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{parentSignupError}</p>
							) : null}
							{parentSignupMessage ? (
								<p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{parentSignupMessage}</p>
							) : null}
							<div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
								{parentSignupRequests.map((item) => {
									const linkValue = resolveParentLink(item);
									const approvedStudents = students.filter((s) => s.is_approved);
									return (
										<div key={item.id} className="rounded-xl border border-zinc-200 bg-white p-3">
											<p className="text-sm font-semibold text-zinc-900">
												학부모 {item.parent_name} · 아이디 <span className="font-mono">{item.username}</span>
											</p>
											<p className="mt-1 text-xs text-zinc-600">
												자녀 이름: {item.student_name} · 학원: {item.academy} · 연락처: {item.phone}
											</p>
											<p className="mt-1 text-xs text-zinc-500">신청일: {toKoreanDate(item.created_at)}</p>
											<div className="mt-2">
												<label className="mb-1 block text-[11px] font-semibold text-zinc-600" htmlFor={`parent-link-${item.id}`}>
													연결 학생 (profiles)
												</label>
												<select
													id={`parent-link-${item.id}`}
													value={linkValue}
													onChange={(e) =>
														setParentLinkChoice((prev) => ({
															...prev,
															[item.id]: e.target.value,
														}))
													}
													disabled={item.status !== "대기"}
													className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-xs outline-none transition focus:border-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-100"
												>
													<option value="">— 학생 선택 —</option>
													{approvedStudents.map((s) => (
														<option key={s.id} value={s.id}>
															{s.name} ({s.username}) · {s.academy}
														</option>
													))}
												</select>
											</div>
											<div className="mt-2 flex flex-wrap items-center gap-2">
												<span
													className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
														item.status === "승인"
															? "bg-emerald-100 text-emerald-700"
															: item.status === "거절"
																? "bg-rose-100 text-rose-700"
																: "bg-zinc-200 text-zinc-700"
													}`}
												>
													{item.status}
												</span>
												<button
													type="button"
													onClick={() => void handleApproveParentSignup(item, "approve")}
													disabled={item.status !== "대기" || isProcessingParentSignupId === item.id}
													className="inline-flex min-h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
												>
													{isProcessingParentSignupId === item.id ? "처리 중..." : "승인"}
												</button>
												<button
													type="button"
													onClick={() => void handleApproveParentSignup(item, "reject")}
													disabled={item.status !== "대기" || isProcessingParentSignupId === item.id}
													className="inline-flex min-h-9 items-center rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
												>
													거절
												</button>
												<button
													type="button"
													onClick={() => void handleDeleteParentSignup(item.id)}
													disabled={isDeletingParentSignupId === item.id}
													className="inline-flex min-h-9 items-center rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
												>
													{isDeletingParentSignupId === item.id ? "삭제 중..." : "신청 삭제"}
												</button>
											</div>
										</div>
									);
								})}
								{parentSignupRequests.length === 0 ? <p className="text-sm text-zinc-500">학부모 가입 신청이 없습니다.</p> : null}
							</div>
						</div>

						<div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
							<h3 className="text-sm font-semibold text-zinc-900">승인된 학부모 계정</h3>
							<p className="mt-1 text-xs text-zinc-500">
								학부모 로그인 계정입니다. 비밀번호는 bcrypt 해시로만 저장되며, 아래에서 새 비밀번호를 넣고 「비밀번호 적용」하면 덮어씁니다. 계정 삭제 시 해당 학부모의
								문의 내역도 함께 삭제됩니다. 자녀 학생 계정을 삭제하려면 먼저 연결된 학부모 계정을 삭제해야 할 수 있습니다.
							</p>
							{parentAccountsError ? (
								<p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{parentAccountsError}</p>
							) : null}
							{parentAccountsMessage ? (
								<p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{parentAccountsMessage}</p>
							) : null}
							<div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
								{parentAccounts.map((pa) => (
									<div key={pa.id} className="rounded-xl border border-zinc-200 bg-white p-3">
										<p className="text-sm font-semibold text-zinc-900">
											{pa.name} · 아이디 <span className="font-mono">{pa.username}</span>
										</p>
										<p className="mt-1 text-xs text-zinc-600">
											연결 자녀: {pa.student_name || "—"}
											{pa.student_username ? ` · ${pa.student_username}` : ""} · 연락처 {pa.phone}
										</p>
										<p className="mt-1 text-xs text-zinc-500">
											등록 {toKoreanDate(pa.created_at)}
											{pa.is_approved ? "" : " · 미승인"}
										</p>
										<div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
											<div className="min-w-0 flex-1 sm:max-w-xs">
												<label className="mb-1 block text-[11px] font-semibold text-zinc-600" htmlFor={`parent-pw-${pa.id}`}>
													새 비밀번호 (6자 이상)
												</label>
												<input
													id={`parent-pw-${pa.id}`}
													type="password"
													autoComplete="new-password"
													value={parentPasswordDraft[pa.id] ?? ""}
													onChange={(e) =>
														setParentPasswordDraft((prev) => ({
															...prev,
															[pa.id]: e.target.value,
														}))
													}
													placeholder="초기화할 비밀번호"
													className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-xs outline-none transition focus:border-zinc-500"
												/>
											</div>
											<button
												type="button"
												onClick={() => void handleResetParentPassword(pa.id)}
												disabled={isSavingParentPasswordId === pa.id || isDeletingParentAccountId === pa.id}
												className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
											>
												{isSavingParentPasswordId === pa.id ? "저장 중..." : "비밀번호 적용"}
											</button>
											<button
												type="button"
												onClick={() => void handleDeleteParentAccount(pa.id)}
												disabled={isDeletingParentAccountId === pa.id || isSavingParentPasswordId === pa.id}
												className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
											>
												<Trash2 className="h-3.5 w-3.5" />
												{isDeletingParentAccountId === pa.id ? "삭제 중..." : "계정 삭제"}
											</button>
										</div>
									</div>
								))}
								{parentAccounts.length === 0 ? <p className="text-sm text-zinc-500">등록된 학부모 계정이 없습니다.</p> : null}
							</div>
						</div>
					</section>
				) : null}

				{activeTab === "groups" ? (
					<section className="space-y-5">
						<div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
							<div className="flex items-center gap-2">
								<Users className="h-5 w-5 text-zinc-700" />
								<h2 className="text-lg font-semibold text-zinc-900">수업반 · 학생 배정</h2>
							</div>
							<p className="mt-1 text-xs text-zinc-500">
								반을 만들고 학생을 체크한 뒤 「반 학생 저장」을 누르세요. 반 삭제 시 소속·주간 리포트도 함께 삭제됩니다.
							</p>
							{groupsError ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{groupsError}</p> : null}
							{groupsMessage ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{groupsMessage}</p> : null}

							<form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={handleCreateGroup}>
								<input
									type="text"
									value={newGroupName}
									onChange={(e) => setNewGroupName(e.target.value)}
									placeholder="새 수업반 이름"
									className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500"
								/>
								<input
									type="text"
									value={newGroupDesc}
									onChange={(e) => setNewGroupDesc(e.target.value)}
									placeholder="설명 (선택)"
									className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none transition focus:border-zinc-500 sm:col-span-2"
								/>
								<button
									type="submit"
									disabled={isCreatingGroup}
									className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-45 sm:col-span-2"
								>
									{isCreatingGroup ? "추가 중..." : "수업반 추가"}
								</button>
							</form>

							<div className="mt-5 max-h-[28rem] space-y-3 overflow-y-auto">
								{classGroups.map((g) => {
									const meta = groupMetaDraft[g.id] ?? { name: g.name, description: g.description ?? "" };
									const selected = new Set(groupStudentDraft[g.id] ?? []);
									return (
										<div key={g.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
											<div className="grid gap-2 sm:grid-cols-2">
												<input
													type="text"
													value={meta.name}
													onChange={(e) =>
														setGroupMetaDraft((prev) => ({
															...prev,
															[g.id]: { ...meta, name: e.target.value },
														}))
													}
													className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm outline-none focus:border-zinc-500"
												/>
												<div className="flex flex-wrap gap-2">
													<button
														type="button"
														onClick={() => void handleSaveGroupMeta(g.id)}
														disabled={savingGroupId === g.id}
														className="inline-flex min-h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
													>
														{savingGroupId === g.id ? "저장 중..." : "이름·설명 저장"}
													</button>
													<button
														type="button"
														onClick={() => void handleDeleteGroup(g.id)}
														disabled={deletingGroupId === g.id}
														className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
													>
														<Trash2 className="h-3.5 w-3.5" />
														{deletingGroupId === g.id ? "삭제 중..." : "반 삭제"}
													</button>
												</div>
												<textarea
													value={meta.description}
													onChange={(e) =>
														setGroupMetaDraft((prev) => ({
															...prev,
															[g.id]: { ...meta, description: e.target.value },
														}))
													}
													placeholder="반 설명·특징 (학부모에게 보일 수 있음)"
													rows={2}
													className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm outline-none focus:border-zinc-500 sm:col-span-2"
												/>
											</div>
											<p className="mt-3 text-[11px] font-semibold text-zinc-600">소속 학생</p>
											<div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2">
												{students.length === 0 ? (
													<p className="text-xs text-zinc-500">학생 목록을 불러오지 못했습니다.</p>
												) : (
													students.map((s) => (
														<label key={s.id} className="flex cursor-pointer items-center gap-2 text-xs text-zinc-800">
															<input
																type="checkbox"
																checked={selected.has(s.id)}
																onChange={() => {
																	setGroupStudentDraft((prev) => {
																		const cur = prev[g.id] ?? [];
																		const has = cur.includes(s.id);
																		const next = has ? cur.filter((x) => x !== s.id) : [...cur, s.id];
																		return { ...prev, [g.id]: next };
																	});
																}}
																className="accent-brand"
															/>
															<span>
																{s.name} ({s.username}) · {s.academy}
																{s.is_approved ? "" : " · 미승인"}
															</span>
														</label>
													))
												)}
											</div>
											<button
												type="button"
												onClick={() => void handleSaveGroupStudents(g.id)}
												disabled={savingGroupId === g.id}
												className="mt-2 inline-flex min-h-9 items-center rounded-lg bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
											>
												{savingGroupId === g.id ? "저장 중..." : "반 학생 저장"}
											</button>
										</div>
									);
								})}
								{classGroups.length === 0 ? <p className="text-sm text-zinc-500">등록된 수업반이 없습니다.</p> : null}
							</div>
						</div>

						<div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
							<h2 className="text-lg font-semibold text-zinc-900">주간 수업 리포트</h2>
							<p className="mt-1 text-xs text-zinc-500">반을 고른 뒤 주차 라벨(예: 2026년 4월 4주)과 수업 내용·특징을 입력합니다.</p>
							<div className="mt-3">
								<label className="mb-1 block text-xs font-semibold text-zinc-600" htmlFor="report-group-select">
									대상 수업반
								</label>
								<select
									id="report-group-select"
									value={reportGroupId ?? ""}
									onChange={(e) => setReportGroupId(e.target.value ? Number(e.target.value) : null)}
									className="w-full max-w-md rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
								>
									{classGroups.length === 0 ? <option value="">수업반을 먼저 만드세요</option> : null}
									{classGroups.map((g) => (
										<option key={g.id} value={g.id}>
											{g.name}
										</option>
									))}
								</select>
							</div>

							<form className="mt-4 space-y-2" onSubmit={handleCreateReport}>
								<input
									type="text"
									value={newReportWeek}
									onChange={(e) => setNewReportWeek(e.target.value)}
									placeholder="주차 라벨 (예: 4월 4주차)"
									disabled={reportGroupId === null}
									className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-500 disabled:bg-zinc-100"
								/>
								<textarea
									value={newReportContent}
									onChange={(e) => setNewReportContent(e.target.value)}
									placeholder="이번 주 수업 전반 내용·특징"
									rows={4}
									disabled={reportGroupId === null}
									className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-zinc-500 disabled:bg-zinc-100"
								/>
								<button
									type="submit"
									disabled={reportGroupId === null || isCreatingReport}
									className="inline-flex min-h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-45"
								>
									{isCreatingReport ? "등록 중..." : "리포트 등록"}
								</button>
							</form>

							<div className="mt-5 space-y-3">
								{reportsLoading ? <p className="text-sm text-zinc-500">리포트 불러오는 중…</p> : null}
								{!reportsLoading &&
									classReports.map((r) => (
										<div key={r.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
											{editingReportId === r.id ? (
												<div className="space-y-2">
													<input
														type="text"
														value={editReportWeek}
														onChange={(e) => setEditReportWeek(e.target.value)}
														placeholder="주차 라벨"
														className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
													/>
													<textarea
														value={editReportContent}
														onChange={(e) => setEditReportContent(e.target.value)}
														placeholder="수업 내용·특징"
														rows={4}
														className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
													/>
													<div className="flex flex-wrap gap-2">
														<button
															type="button"
															onClick={() => void handleSaveReportEdit(r.id)}
															disabled={savingReportId === r.id}
															className="inline-flex min-h-8 items-center rounded-lg bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
														>
															{savingReportId === r.id ? "저장 중..." : "저장"}
														</button>
														<button
															type="button"
															onClick={cancelEditReport}
															disabled={savingReportId === r.id}
															className="inline-flex min-h-8 items-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
														>
															취소
														</button>
													</div>
												</div>
											) : (
												<>
													<div className="flex flex-wrap items-start justify-between gap-2">
														<div>
															<p className="text-sm font-semibold text-zinc-900">{r.week_label}</p>
															<p className="mt-1 text-xs text-zinc-500">{toKoreanDate(r.created_at)}</p>
														</div>
														<div className="flex flex-wrap gap-1.5">
															<button
																type="button"
																onClick={() => startEditReport(r)}
																disabled={
																	savingReportId !== null ||
																	deletingReportId === r.id ||
																	(editingReportId !== null && editingReportId !== r.id)
																}
																className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
															>
																<Pencil className="h-3 w-3.5" />
																수정
															</button>
															<button
																type="button"
																onClick={() => void handleDeleteReport(r.id)}
																disabled={deletingReportId === r.id || savingReportId === r.id || editingReportId === r.id}
																className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-rose-300 bg-white px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
															>
																<Trash2 className="h-3 w-3.5" />
																{deletingReportId === r.id ? "삭제 중..." : "삭제"}
															</button>
														</div>
													</div>
													<p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800">{r.content}</p>
												</>
											)}
										</div>
									))}
								{!reportsLoading && reportGroupId !== null && classReports.length === 0 ? (
									<p className="text-sm text-zinc-500">등록된 리포트가 없습니다.</p>
								) : null}
							</div>
						</div>
					</section>
				) : null}

			{activeTab === "requests" ? (
				<section className="space-y-5">
					<div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
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
					</div>

					<div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_14px_35px_-20px_rgba(0,0,0,0.35)]">
						<div className="flex items-center gap-2">
							<MessageSquareText className="h-5 w-5 text-zinc-700" />
							<h2 className="text-lg font-semibold text-zinc-900">학부모 문의관리</h2>
						</div>
						<p className="mt-1 text-xs text-zinc-500">학부모가 제출한 보강영상·질문·상담 문의입니다. 답변 작성 후 「처리 내용 저장」을 누르세요.</p>
						{parentRequestsError ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{parentRequestsError}</p> : null}
						{parentRequestsMessage ? <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{parentRequestsMessage}</p> : null}

						<div className="mt-4 space-y-3">
							{parentRequests.map((item) => (
								<ParentRequestEditor
									key={`${item.id}-${item.status}-${item.admin_reply ?? ""}-${item.support_video_url ?? ""}`}
									item={item}
									onSave={handleSaveParentRequest}
									onDelete={handleDeleteParentRequestForAdmin}
									isDeleting={isDeletingParentRequestId === item.id}
									isSaving={isSavingParentRequestId === item.id}
								/>
							))}
							{parentRequests.length === 0 ? <p className="text-sm text-zinc-500">접수된 학부모 문의가 없습니다.</p> : null}
						</div>
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
								<h3 className="text-xs font-semibold text-zinc-500">기본 정보</h3>
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
										<dt className="text-zinc-500">학년</dt>
										<dd className="text-zinc-900">{studentDetailModal.signup_grade?.trim() || "—"}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-zinc-500">목표대학</dt>
										<dd className="text-right text-zinc-900">{studentDetailModal.target_university?.trim() || "—"}</dd>
									</div>
									<div className="flex justify-between gap-2">
										<dt className="text-zinc-500">희망학과</dt>
										<dd className="text-right text-zinc-900">{studentDetailModal.target_department?.trim() || "—"}</dd>
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
								{detailExamMutateError ? (
									<p className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1.5 text-sm text-rose-700">{detailExamMutateError}</p>
								) : null}
								{!detailLoading && !detailExamError && detailExamRecords.length === 0 ? (
									<p className="mt-2 text-sm text-zinc-500">등록된 성적이 없습니다.</p>
								) : null}
								<ExamTrendChartLazy records={detailExamRecords} className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-2 py-3" />
								<ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
									{detailExamRecords.map((row) => (
										<li key={row.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
											{detailExamEditingId === row.id ? (
												<form className="space-y-2" onSubmit={handleDetailExamSaveEdit}>
													<ExamScoreFormFields
														dense
														examKind={detailEditExamKind}
														onExamKindChange={setDetailEditExamKind}
														examDetail={detailEditExamDetail}
														onExamDetailChange={setDetailEditExamDetail}
														examDate={detailEditExamDate}
														onExamDateChange={setDetailEditExamDate}
														scoreInput={detailEditExamScore}
														onScoreInputChange={setDetailEditExamScore}
														gradeInput={detailEditExamGrade}
														onGradeInputChange={setDetailEditExamGrade}
														selectId={`admin-exam-kind-${row.id}`}
														dateId={`admin-exam-date-${row.id}`}
													/>
													<div className="flex flex-wrap gap-1.5">
														<button
															type="submit"
															disabled={detailSavingExamId === row.id}
															className="rounded-lg bg-brand px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active disabled:opacity-45"
														>
															{detailSavingExamId === row.id ? "저장 중…" : "저장"}
														</button>
														<button
															type="button"
															onClick={cancelDetailExamEdit}
															className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-800"
														>
															취소
														</button>
													</div>
												</form>
											) : (
												<>
													<div className="flex justify-between gap-2">
														<div className="min-w-0">
															<span className="font-medium text-zinc-900">{row.exam_name}</span>
															<p className="mt-0.5 text-[11px] text-zinc-500">
																응시일{" "}
																{row.exam_date ? toKoreanDate(`${row.exam_date}T12:00:00`) : "-"}
															</p>
														</div>
														<div className="flex shrink-0 items-center gap-0.5">
															<span className="sr-only">등록일</span>
															<span className="text-[10px] text-zinc-400">{toKoreanDate(row.created_at)}</span>
															<button
																type="button"
																onClick={() => startDetailExamEdit(row)}
																className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
																aria-label="성적 수정"
															>
																<Pencil className="h-3.5 w-3.5" />
															</button>
															<button
																type="button"
																onClick={() => void handleDetailExamDelete(row.id)}
																disabled={detailDeletingExamId === row.id}
																className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
																aria-label="성적 삭제"
															>
																<Trash2 className="h-3.5 w-3.5" />
															</button>
														</div>
													</div>
													<p className="mt-1 text-xs text-zinc-600">
														점수 {row.score} · 등급 {row.grade}
													</p>
												</>
											)}
										</li>
									))}
								</ul>

								<form className="mt-4 space-y-2 border-t border-zinc-100 pt-4" onSubmit={handleAddStudentExam}>
									<h4 className="text-xs font-semibold text-zinc-700">성적 추가</h4>
									<ExamScoreFormFields
										examKind={detailExamKind}
										onExamKindChange={setDetailExamKind}
										examDetail={detailExamDetail}
										onExamDetailChange={setDetailExamDetail}
										examDate={detailExamDate}
										onExamDateChange={setDetailExamDate}
										scoreInput={detailExamScoreInput}
										onScoreInputChange={setDetailExamScoreInput}
										gradeInput={detailExamGradeInput}
										onGradeInputChange={setDetailExamGradeInput}
										selectId="admin-add-exam-kind"
										dateId="admin-add-exam-date"
									/>
									{detailExamFormError ? <p className="text-sm text-rose-600">{detailExamFormError}</p> : null}
									{detailExamFormMessage ? <p className="text-sm text-emerald-700">{detailExamFormMessage}</p> : null}
									<button
										type="submit"
										disabled={detailExamSubmitting}
										className="inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-45"
									>
										{detailExamSubmitting ? "등록 중…" : "성적 등록"}
									</button>
								</form>
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
												<div className="flex items-start justify-between gap-2">
													<p className="text-[11px] font-medium text-zinc-500">{toKoreanDate(m.created_at)}</p>
													<button
														type="button"
														onClick={() => void handleDeleteStudentMemo(m.id)}
														disabled={isDeletingMemoId === m.id}
														className="shrink-0 rounded-lg p-1 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
														aria-label="메모 삭제"
													>
														<Trash2 className="h-3.5 w-3.5" />
													</button>
												</div>
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
										className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-brand px-3 text-xs font-semibold text-white transition hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:opacity-45"
									>
										<MessageSquareText className="h-3.5 w-3.5" />
										{memoSubmitting ? "등록 중…" : "메모 추가"}
									</button>
								</form>
						</section>

						<section className="mt-4 border-t border-zinc-100 pt-4">
							<h3 className="text-sm font-semibold text-zinc-900">자료 열람 현황</h3>
							<div className="mt-2 flex gap-1">
								{(["전체", "문학", "비문학"] as const).map((cat) => (
									<button
										key={cat}
										type="button"
										onClick={() => setDetailMaterialViewsFilter(cat)}
										className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${detailMaterialViewsFilter === cat ? "bg-zinc-800 text-white" : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"}`}
									>
										{cat}
									</button>
								))}
							</div>
							{detailMaterialViewsError ? (
								<p className="mt-2 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1.5 text-sm text-rose-700">{detailMaterialViewsError}</p>
							) : null}
							{!detailLoading && !detailMaterialViewsError && detailMaterialViews.length === 0 ? (
								<p className="mt-2 text-sm text-zinc-500">자료가 없습니다.</p>
							) : null}
							<ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
								{detailMaterialViews
									.filter((m) => detailMaterialViewsFilter === "전체" || m.category === detailMaterialViewsFilter)
									.map((m) => (
										<li key={m.id} className="flex items-start gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
											{m.viewed ? (
												<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
											) : (
												<Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
											)}
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium text-zinc-900">{m.title}</p>
												<p className="mt-0.5 text-[11px] text-zinc-400">
													{m.category}
													{m.viewed && m.viewed_at ? ` · 열람 ${toKoreanDate(m.viewed_at)}` : " · 미열람"}
												</p>
											</div>
										</li>
									))}
							</ul>
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

type ParentRequestEditorProps = {
	item: ParentRequestAdminItem;
	onSave: (id: number, status: ParentRequestAdminItem["status"], adminReply: string, supportVideoUrl: string) => Promise<void>;
	onDelete: (id: number) => Promise<void>;
	isSaving: boolean;
	isDeleting: boolean;
};

function ParentRequestEditor({ item, onSave, onDelete, isSaving, isDeleting }: ParentRequestEditorProps) {
	const [status, setStatus] = useState<ParentRequestAdminItem["status"]>(item.status);
	const [adminReply, setAdminReply] = useState(item.admin_reply || "");
	const [supportVideoUrl, setSupportVideoUrl] = useState(item.support_video_url || "");

	return (
		<div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
			<p className="text-xs text-zinc-500">
				{item.request_type} · 학부모 {item.parent_name}({item.parent_username}) · {toKoreanDate(item.created_at)}
			</p>
			{item.is_deleted ? (
				<p className="mt-1 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
					학부모 화면에서 삭제됨
				</p>
			) : null}
			<h3 className="mt-1 text-sm font-semibold text-zinc-900">{item.title}</h3>
			<p className="mt-1 text-sm text-zinc-700">{item.content}</p>

			<div className="mt-3 grid gap-2 sm:grid-cols-2">
				<select
					value={status}
					onChange={(e) => setStatus(e.target.value as ParentRequestAdminItem["status"])}
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
				placeholder="학부모에게 보낼 답변"
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
					{isDeleting ? "삭제 중..." : "문의 완전 삭제"}
				</button>
			</div>
		</div>
	);
}
