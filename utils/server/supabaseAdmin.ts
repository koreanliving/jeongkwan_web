import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트. **Service Role** 키만 사용합니다.
 *
 * anon 키로는 `auth.admin.*` 가 동작하지 않으며("User not allowed"),
 * `profiles` 등 RLS 테이블 관리자 조회도 막힙니다.
 *
 * .env.local → `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API → service_role)
 *
 * 첫 접근 시에만 초기화해, 빌드 환경에서 키가 없을 때 모듈 로드만으로는 실패하지 않게 합니다.
 */
let _admin: SupabaseClient | null = null;

function getSupabaseAdminInternal(): SupabaseClient {
	if (_admin) {
		return _admin;
	}
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error(
			"SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다. .env.local 에 service_role 키를 추가해 주세요. " +
				"(anon 키만으로는 가입 승인·학생 목록이 동작하지 않습니다.)",
		);
	}
	_admin = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
	return _admin;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
	get(_target, prop, _receiver) {
		const client = getSupabaseAdminInternal();
		const value = Reflect.get(client, prop, client);
		if (typeof value === "function") {
			return value.bind(client);
		}
		return value;
	},
});
