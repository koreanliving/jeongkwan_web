import { NextRequest, NextResponse } from "next/server";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
import { isAdminRequest } from "@/utils/server/adminSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

type Category = "문학" | "비문학";

function normalizeCategory(value: unknown): Category | null {
	if (value === "문학" || value === "비문학") return value;
	return null;
}

export async function POST(request: NextRequest) {
	if (!(await isAdminRequest(request))) {
		return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 401 });
	}

	try {
		const body = (await request.json()) as {
			title?: unknown;
			videoUrl?: unknown;
			category?: unknown;
		};

		const title = typeof body.title === "string" ? body.title.trim() : "";
		const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl.trim() : "";
		const category = normalizeCategory(body.category);

		if (!title) {
			return NextResponse.json({ message: "영상 제목은 필수입니다." }, { status: 400 });
		}
		if (!category) {
			return NextResponse.json({ message: "영상 분류가 올바르지 않습니다." }, { status: 400 });
		}
		if (!getYoutubeEmbedUrl(videoUrl)) {
			return NextResponse.json({ message: "유효한 유튜브 링크를 입력해 주세요." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("videos").insert({
			title,
			video_url: videoUrl,
			category,
		});

		if (error) {
			return NextResponse.json({ message: error.message || "영상 등록에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
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
			return NextResponse.json({ message: "유효한 영상 ID가 필요합니다." }, { status: 400 });
		}

		const { error } = await supabaseAdmin.from("videos").delete().eq("id", id);
		if (error) {
			return NextResponse.json({ message: error.message || "영상 삭제에 실패했습니다." }, { status: 500 });
		}

		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ message: "요청 데이터가 올바르지 않습니다." }, { status: 400 });
	}
}
