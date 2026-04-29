/** 미들웨어·API 공통 — Edge 번들에 DB 클라이언트를 끌어들이지 않도록 상수만 분리 */

export const PARENT_AUTH_COOKIE_NAME = "parent_auth";
export const PARENT_ID_COOKIE_NAME = "parent_id";

export const parentGateCookieOptions = {
	path: "/",
	maxAge: 60 * 60 * 24 * 7,
	sameSite: "lax" as const,
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
};
