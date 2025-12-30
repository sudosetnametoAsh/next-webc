import { headers } from "next/headers";

type SessionPayload = {
  email: string;
  role: string;
  name: string;
  id: string;
  iat: number;
  exp: number;
};

export async function getSession(): Promise<SessionPayload> {
  const header = await headers();
  const payload = header.get("x-session");

  if (!payload) {
    throw new Error("Session not found in headers");
  }

  try {
    return JSON.parse(payload);
  } catch {
    throw new Error("Invalid session payload");
  }
}
