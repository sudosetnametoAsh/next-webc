import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { createClient } from "../db/supabase-server";
import { verifySessionToken, AppSession, Role } from "./session-token";

export type { AppSession, Role };

type CustomPayload = {
  user_id?: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    custom_claims?: {
      roles?: string[];
    };
  };
  roles?: string[];
  department?: string;
};

export async function getSession(): Promise<AppSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    const session = await verifySessionToken(token);
    if (session) {
      return session;
    }
  }

  // Fallback to Supabase auth for backwards compatibility if transitioning
  try {
    const supabase = await createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (!session || error) {
      throw new Error("No active session");
    }

    const payload = jwtDecode<CustomPayload>(session.access_token);
    let user_id = payload.user_id;
    const department = payload.department || "";

    // Fallback: Fetch user_id from the public.users table if not in JWT
    if (!user_id) {
      const { data: userData } = await supabase
        .from("users")
        .select("user_id")
        .eq("auth_id", session.user.id)
        .maybeSingle();

      if (userData) {
        user_id = userData.user_id;
      }
    }

    if (!user_id) {
      console.warn("Custom user_id not found for auth user:", session.user.id);
    }

    let role: Role = "Student";
    const customRoles =
      payload.user_metadata?.custom_claims?.roles || payload.roles;
    if (customRoles) {
      const r = Array.isArray(customRoles) ? customRoles[0] : (customRoles as unknown as string);
      if (typeof r === "string") {
        if (r.toLowerCase().includes("admin")) role = "Admin";
        else if (
          r.toLowerCase().includes("staff") ||
          r.toLowerCase().includes("department")
        )
          role = "Staff";
      }
    }

    return {
      user_id: user_id || session.user.id,
      user_email: payload.email || session.user.email || "",
      user_name:
        payload.user_metadata?.full_name ||
        session.user.user_metadata?.full_name ||
        "",
      role,
      department,
    };
  } catch (err) {
    if (err instanceof Error && err.message !== "No active session") {
      console.error("Supabase getSession fallback error:", err.message);
    }
    throw new Error("No active session");
  }
}
