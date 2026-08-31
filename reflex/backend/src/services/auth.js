import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createUser, getUserByPhone, publicUser } from "../store/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "reflex-dev-secret-change-me";

function issueToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
}

// Sign-up: creates the account with a hashed password. One phone number =
// one account, so this fails if the phone is already registered — use
// login() for returning users instead.
export async function register({ name, phone, role, password }) {
  if (!name || !phone || !role || !password) {
    throw new Error("name, phone, role, and password are required");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  const existing = getUserByPhone(phone);
  if (existing) {
    throw new Error("An account with this phone number already exists — log in instead");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser({ name, phone, role, passwordHash });
  return { user: publicUser(user), token: issueToken(user) };
}

// Log in an existing account with phone + password.
export async function login({ phone, password }) {
  if (!phone || !password) throw new Error("phone and password are required");
  const user = getUserByPhone(phone);
  if (!user || !user.password_hash) {
    throw new Error("No account found for that phone number");
  }
  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    throw new Error("Incorrect password");
  }
  return { user: publicUser(user), token: issueToken(user) };
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
