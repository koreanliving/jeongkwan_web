import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashParentPassword(plain: string): Promise<string> {
	return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyParentPassword(plain: string, passwordHash: string): Promise<boolean> {
	if (!passwordHash) return false;
	return bcrypt.compare(plain, passwordHash);
}
