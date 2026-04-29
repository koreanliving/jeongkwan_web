import { NextResponse } from "next/server";
import { clearParentAuthCookies } from "@/utils/server/parentSession";

export async function POST() {
	const res = NextResponse.json({ ok: true });
	clearParentAuthCookies(res);
	return res;
}
