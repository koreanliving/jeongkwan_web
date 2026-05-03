import { NextRequest, NextResponse } from "next/server";
import { getParentSession } from "@/utils/server/parentSession";
import { supabaseAdmin } from "@/utils/server/supabaseAdmin";
import { hasUnreadAdminReply } from "@/utils/requestReplyUnread";

export async function GET(_request: NextRequest) {
	const session = await getParentSession(_request);
	if (!session) {
		return NextResponse.json({ count: 0 });
	}

	const { data, error } = await supabaseAdmin
		.from("parent_requests")
		.select("admin_last_response_at, requester_read_at")
		.eq("parent_id", session.id)
		.eq("is_deleted", false);

	if (error) {
		return NextResponse.json({ message: "확인에 실패했습니다.", detail: error.message }, { status: 500 });
	}

	const count = (data ?? []).filter((row) =>
		hasUnreadAdminReply(
			row as { admin_last_response_at: string | null; requester_read_at: string | null },
		),
	).length;

	return NextResponse.json({ count });
}
