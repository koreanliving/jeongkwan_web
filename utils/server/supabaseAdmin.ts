import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseServerKey = serviceRoleKey || anonKey;

if (!supabaseUrl || !supabaseServerKey) {
	throw new Error("Supabase server environment variables are missing.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServerKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});
