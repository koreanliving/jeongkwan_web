import { NextRequest, NextResponse } from "next/server";
import { logAdminAction } from "@/utils/server/adminActionLog";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

type Category = "문학" | "비문학";
type DisplayStyle = "standard" | "reading";

function safeFileName(name: string) {
	return name.replace(/[^a-zA-Z0-9._-]/g, "_");
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

function asString(value: FormDataEntryValue | null): string {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeCategory(value: string): Category | null {
	if (value === "문학" || value === "비문학") return value;
	return null;
}

function normalizeDisplayStyle(value: string): DisplayStyle {
	return value === "reading" ? "reading" : "standard";
}

function getPdf(formData: FormData): File | null {
	const value = formData.get("file");
	if (!(value instanceof File) || value.size === 0) return null;
	return value;
}

async function uploadPdf(materialId: number, file: File): Promise<string> {
	if (file.type !== "application/pdf") {
		throw new Error("PDF 파일만 업로드할 수 있습니다.");
	}
	const path = `${materialId}/${Date.now()}-${safeFileName(file.name)}`;
	const { error } = await supabaseAdmin.storage.from("materials").upload(path, file, {
		cacheControl: "3600",
		upsert: false,
		contentType: "application/pdf",
	});
	if (error) throw new Error(error.message || "PDF 업로드에 실패했습니다.");
	return path;
}

export async function GET(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	const id = Number(request.nextUrl.searchParams.get("id"));
	if (!Number.isInteger(id) || id < 1) {
		return NextResponse.json({ message: "유효한 자료 ID가 필요합니다." }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("materials")
		.select("id, title, subtitle, content, category, display_style, file_url, file_name, file_size")
		.eq("id", id)
		.maybeSingle();

	if (error || !data) {
		return NextResponse.json({ message: "자료 정보를 불러오지 못했습니다." }, { status: 404 });
	}

	return NextResponse.json({ material: data });
}

export async function POST(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const title = asString(formData.get("title"));
		const subtitle = asString(formData.get("subtitle")) || null;
		const content = asString(formData.get("content"));
		const category = normalizeCategory(asString(formData.get("category")));
		const displayStyle = normalizeDisplayStyle(asString(formData.get("displayStyle")));
		const file = getPdf(formData);

		if (!title) {
			return NextResponse.json({ message: "제목은 필수입니다." }, { status: 400 });
		}
		if (!category) {
			return NextResponse.json({ message: "자료 분류가 올바르지 않습니다." }, { status: 400 });
		}
		if (!content && !file) {
			return NextResponse.json({ message: "본문 또는 PDF 중 하나는 입력해 주세요." }, { status: 400 });
		}

		const { data: inserted, error: insertError } = await supabaseAdmin
			.from("materials")
			.insert({
				title,
				subtitle,
				content,
				category,
				display_style: displayStyle,
			})
			.select("id")
			.single();

		if (insertError || !inserted) {
			return NextResponse.json({ message: "자료 생성에 실패했습니다." }, { status: 500 });
		}

		const materialId = Number((inserted as { id: number }).id);
		try {
			if (file) {
				const filePath = await uploadPdf(materialId, file);
				const { error: updateError } = await supabaseAdmin
					.from("materials")
					.update({ file_url: filePath, file_name: file.name, file_size: file.size })
					.eq("id", materialId);

				if (updateError) {
					await supabaseAdmin.storage.from("materials").remove([filePath]);
					await supabaseAdmin.from("materials").delete().eq("id", materialId);
					return NextResponse.json({ message: "자료는 생성되었지만 PDF 연결에 실패했습니다." }, { status: 500 });
				}
			}

			void logAdminAction(request, { action: "material.create", detail: { materialId } });
			return NextResponse.json({ ok: true, id: materialId });
		} catch (error) {
			await supabaseAdmin.from("materials").delete().eq("id", materialId);
			return NextResponse.json(
				{ message: error instanceof Error ? error.message : "PDF 업로드 중 오류가 발생했습니다." },
				{ status: 500 },
			);
		}
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function PATCH(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const id = Number(asString(formData.get("id")));
		const title = asString(formData.get("title"));
		const subtitle = asString(formData.get("subtitle")) || null;
		const content = asString(formData.get("content"));
		const category = normalizeCategory(asString(formData.get("category")));
		const displayStyle = normalizeDisplayStyle(asString(formData.get("displayStyle")));
		const file = getPdf(formData);

		if (!Number.isInteger(id) || id < 1) {
			return NextResponse.json({ message: "유효한 자료 ID가 필요합니다." }, { status: 400 });
		}
		if (!title) {
			return NextResponse.json({ message: "제목은 필수입니다." }, { status: 400 });
		}
		if (!category) {
			return NextResponse.json({ message: "자료 분류가 올바르지 않습니다." }, { status: 400 });
		}

		const { data: existing, error: existingError } = await supabaseAdmin
			.from("materials")
			.select("file_url")
			.eq("id", id)
			.maybeSingle();

		if (existingError || !existing) {
			return NextResponse.json({ message: "자료 정보를 찾을 수 없습니다." }, { status: 404 });
		}

		const existingFilePath = toStoragePath((existing as { file_url: string | null }).file_url);
		if (!content && !file && !existingFilePath) {
			return NextResponse.json({ message: "본문 또는 PDF 중 하나는 입력해 주세요." }, { status: 400 });
		}

		let newFilePath: string | null = null;
		try {
			const updatePayload: Record<string, unknown> = {
				title,
				subtitle,
				category,
				content,
				display_style: displayStyle,
			};

			if (file) {
				newFilePath = await uploadPdf(id, file);
				updatePayload.file_url = newFilePath;
				updatePayload.file_name = file.name;
				updatePayload.file_size = file.size;
			}

			const { error: updateError } = await supabaseAdmin.from("materials").update(updatePayload).eq("id", id);
			if (updateError) {
				if (newFilePath) {
					await supabaseAdmin.storage.from("materials").remove([newFilePath]);
				}
				return NextResponse.json({ message: updateError.message || "자료 저장에 실패했습니다." }, { status: 500 });
			}

			if (newFilePath && existingFilePath && existingFilePath !== newFilePath) {
				await supabaseAdmin.storage.from("materials").remove([existingFilePath]);
			}

			void logAdminAction(request, { action: "material.update", detail: { materialId: id } });
			return NextResponse.json({ ok: true });
		} catch (error) {
			if (newFilePath) {
				await supabaseAdmin.storage.from("materials").remove([newFilePath]);
			}
			return NextResponse.json(
				{ message: error instanceof Error ? error.message : "저장 중 오류가 발생했습니다." },
				{ status: 500 },
			);
		}
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as { id?: unknown };
		const id = typeof body.id === "number" ? body.id : Number(body.id);
		if (!Number.isInteger(id) || id < 1) {
			return NextResponse.json({ message: "유효한 자료 ID가 필요합니다." }, { status: 400 });
		}

		const { data: existing, error: existingError } = await supabaseAdmin
			.from("materials")
			.select("file_url")
			.eq("id", id)
			.maybeSingle();

		if (existingError || !existing) {
			return NextResponse.json({ message: "자료 정보를 찾을 수 없습니다." }, { status: 404 });
		}

		const storagePath = toStoragePath((existing as { file_url: string | null }).file_url);
		const { error } = await supabaseAdmin.from("materials").delete().eq("id", id);
		if (error) {
			return NextResponse.json({ message: error.message || "자료 삭제에 실패했습니다." }, { status: 500 });
		}

		if (storagePath) {
			await supabaseAdmin.storage.from("materials").remove([storagePath]);
		}

		void logAdminAction(request, { action: "material.delete", detail: { materialId: id } });
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
