import { jwtVerify, SignJWT } from "jose";

export type Role = "Admin" | "Staff" | "Department" | "Student";

export interface AppSession {
  user_id: string;
  user_email: string;
  user_name: string;
  role: Role;
  department: string;
}

export const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "webc-clearance-system-super-secure-session-secret-key-32b"
);

export async function createSessionToken(session: AppSession): Promise<string> {
  return new SignJWT({
    id: session.user_id,
    email: session.user_email,
    name: session.user_name,
    role: session.role,
    department: session.department || "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SESSION_SECRET);
}

export async function verifySessionToken(token: string): Promise<AppSession | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return {
      user_id: (payload.id as string) || (payload.sub as string) || "",
      user_email: (payload.email as string) || "",
      user_name: (payload.name as string) || "",
      role: (payload.role as Role) || "Student",
      department: (payload.department as string) || "",
    };
  } catch {
    return null;
  }
}
