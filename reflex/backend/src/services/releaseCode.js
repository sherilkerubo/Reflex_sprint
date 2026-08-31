import bcrypt from "bcryptjs";

// 6-digit OTP as specified: "System generates a secure 6-digit OTP code,
// stores its cryptographic hash in release_code_hash".
export function generateReleaseCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashReleaseCode(code) {
  return bcrypt.hash(code, 10);
}

export async function verifyReleaseCode(code, hash) {
  if (!hash) return false;
  return bcrypt.compare(code, hash);
}
