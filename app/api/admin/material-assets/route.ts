import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

function safeFileName(name: string) {
	return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isImageFile(file: File): boolean {
	return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}

export async function POST(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file");
		if (!(file instanceof File) || file.size === 0) {
			return NextResponse.json({ message: "업로드할 이미지가 필요합니다." }, { status: 400 });
		}

		if (!isImageFile(file)) {
			return NextResponse.json({ message: "이미지 파일(png, jpg, webp, gif)만 올릴 수 있습니다." }, { status: 400 });
		}

		const rawMaterialId = formData.get("materialId");
		const materialId = typeof rawMaterialId === "string" ? Number(rawMaterialId) : null;
		if (rawMaterialId && (!Number.isInteger(materialId) || materialId === null || materialId < 1)) {
			return NextResponse.json({ message: "자료 ID가 올바르지 않습니다." }, { status: 400 });
		}

		const folder = materialId ? String(materialId) : `draft-${Date.now()}`;
		const path = `${folder}/embed/${Date.now()}-${safeFileName(file.name)}`;
		const { error } = await supabaseAdmin.storage.from("materials").upload(path, file, {
			cacheControl: "3600",
			upsert: false,
			contentType: file.type || "application/octet-stream",
		});

		if (error) {
			return NextResponse.json({ message: error.message || "이미지 업로드에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ path });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
