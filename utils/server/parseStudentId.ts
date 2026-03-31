import { isValidUuid } from "@/utils/uuidValidation";

export function parseStudentIdParam(searchParams: URLSearchParams): string | null {
	const raw = searchParams.get("studentId");
	if (raw === null || raw === "") return null;
	const id = raw.trim();
	return isValidUuid(id) ? id : null;
}
