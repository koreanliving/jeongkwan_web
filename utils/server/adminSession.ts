import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_AUTH_COOKIE_NAME = "admin_auth";
export const ADMIN_UI_COOKIE_NAME = "admin_ui";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const TOKEN_VERSION = "v1";
const DEFAULT_ADMIN_PASSWORD = "change-admin-password";

export const adminCookieOptions = {
	path: "/" as const,
	maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
	sameSite: "lax" as const,
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
};

export const adminUiCookieOptions = {
	...adminCookieOptions,
	httpOnly: false,
};

export function getConfiguredAdminPassword(): string | null {
	const password = process.env.ADMIN_PASSWORD?.trim() ?? "";
	if (!password || password === DEFAULT_ADMIN_PASSWORD) {
		return null;
	}
	return password;
}

function getAdminSessionSecret(): string | null {
	return process.env.ADMIN_SESSION_SECRET?.trim() || getConfiguredAdminPassword();
}

function base64UrlEncode(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let diff = 0;
	for (let i = 0; i < a.length; i += 1) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}

async function signAdminSessionPayload(payload: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
	return base64UrlEncode(new Uint8Array(signature));
}

export async function createAdminSessionCookieValue(now = Date.now()): Promise<string> {
	const secret = getAdminSessionSecret();
	if (!secret) {
		throw new Error("ADMIN_PASSWORD is not configured.");
	}

	const issuedAt = String(now);
	const expiresAt = String(now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000);
	const payload = `${TOKEN_VERSION}.${issuedAt}.${expiresAt}`;
	const signature = await signAdminSessionPayload(payload, secret);
	return `${payload}.${signature}`;
}

export async function isAdminSessionCookieValueValid(value: string | undefined): Promise<boolean> {
	if (!value) {
		return false;
	}

	const secret = getAdminSessionSecret();
	if (!secret) {
		return false;
	}

	const parts = value.split(".");
	if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) {
		return false;
	}

	const [, issuedAtRaw, expiresAtRaw, signature] = parts;
	const issuedAt = Number(issuedAtRaw);
	const expiresAt = Number(expiresAtRaw);
	if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
		return false;
	}
	if (issuedAt > Date.now() + 60_000 || expiresAt <= Date.now()) {
		return false;
	}

	const payload = `${TOKEN_VERSION}.${issuedAtRaw}.${expiresAtRaw}`;
	const expected = await signAdminSessionPayload(payload, secret);
	return constantTimeEqual(signature, expected);
}

export async function isAdminRequest(request: NextRequest): Promise<boolean> {
	return isAdminSessionCookieValueValid(request.cookies.get(ADMIN_AUTH_COOKIE_NAME)?.value);
}

export function clearAdminAuthCookies(response: NextResponse): void {
	response.cookies.set(ADMIN_AUTH_COOKIE_NAME, "", { ...adminCookieOptions, maxAge: 0 });
	response.cookies.set(ADMIN_UI_COOKIE_NAME, "", { ...adminUiCookieOptions, maxAge: 0 });
}
