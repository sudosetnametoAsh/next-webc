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

  // Verify Supabase session
  const supabase = await createClient();
  const {
    data: { session: sbSession },
    error,
  } = await supabase.auth.getSession();

  // If Supabase session is signed out / absent, do not trust orphaned token
  if (!sbSession || error) {
    throw new Error("No active session");
  }

  // If valid session_token exists, use it
  if (token) {
    const session = await verifySessionToken(token);
    if (session) {
      return session;
    }
  }

  // Fallback to Supabase auth payload
  try {
    const payload = jwtDecode<CustomPayload>(sbSession.access_token);
    let user_id = payload.user_id;
    let department = payload.department || "";

    if (!user_id) {
      const { data: userData } = await supabase
        .from("users")
        .select("user_id")
        .eq("auth_id", sbSession.user.id)
        .maybeSingle();

      if (userData?.user_id) {
        user_id = userData.user_id;
      }
    }

    let role: Role = "Student";
    const customRoles =
      payload.user_metadata?.custom_claims?.roles ||
      sbSession.user.user_metadata?.custom_claims?.roles ||
      payload.roles;

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

    if (!department && role === "Staff" && user_id) {
      const { data: deptData } = await supabase
        .from("clearance_templates")
        .select("clearance_departments(dept_name)")
        .eq("staff_id", user_id)
        .limit(1)
        .maybeSingle();

      if (deptData?.clearance_departments) {
        const d = deptData.clearance_departments as unknown as { dept_name: string } | { dept_name: string }[];
        department = Array.isArray(d) ? d[0]?.dept_name || "" : d?.dept_name || "";
      }
    }

    return {
      user_id: user_id || sbSession.user.id,
      user_email: payload.email || sbSession.user.email || "",
      user_name:
        payload.user_metadata?.full_name ||
        sbSession.user.user_metadata?.full_name ||
        "",
      role,
      department,
    };
  } catch (err) {
    throw new Error("No active session");
  }
}
