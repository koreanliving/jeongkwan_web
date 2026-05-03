import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";

function clientMetaFromRequest(request: NextRequest | null): { ip: string | null; userAgent: string | null } {
	if (!request) {
		return { ip: null, userAgent: null };
	}
	const forwarded = request.headers.get("x-forwarded-for");
	const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
	const userAgent = request.headers.get("user-agent") || null;
	return { ip, userAgent };
}

/** 관리자 API 성공 후 호출. 실패해도 응답에는 영향 없음. */
export async function logAdminAction(
	request: NextRequest | null,
	entry: { action: string; detail?: Record<string, unknown> },
): Promise<void> {
	try {
		const { ip, userAgent } = clientMetaFromRequest(request);
		const { error } = await supabaseAdmin.from("admin_action_logs").insert({
			action: entry.action,
			detail: entry.detail ?? null,
			ip,
			user_agent: userAgent,
		});
		if (error) {
			console.error("[admin_action_logs]", error.message);
		}
	} catch (e) {
		console.error("[logAdminAction]", e);
	}
}
