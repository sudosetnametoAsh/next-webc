import { jwtDecode } from "jwt-decode";
import { createClient } from "../db/supabase-server";

type CustomPayload = {
  user_id?: string;
  email: string;
  user_metadata: {
    full_name: string;
  };
  department?: string;
};

export async function getSession(): Promise<{
  user_id: string;
  user_email: string;
  user_name: string;
  department: string;
}> {
  const supabase = await createClient();

  // Securely authenticate the user with Supabase Auth server (prevents insecure cookie proxy warning)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    if (userError?.message) {
      console.error(userError.message);
    }
    throw new Error("No active session");
  }

  // Obtain session token for JWT decoding without accessing session.user directly
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const payload = session?.access_token
    ? jwtDecode<CustomPayload>(session.access_token)
    : ({} as Partial<CustomPayload>);
  
  let user_id = payload.user_id;
  let department =
    payload.department ||
    (user.user_metadata as any)?.department ||
    (user.user_metadata as any)?.custom_claims?.department ||
    "";
  if (["staff", "student", "admin", "all"].includes(department.trim().toLowerCase())) {
    department = "";
  }

  // Fallback: Fetch user_id from the public.users table if not in JWT
  if (!user_id) {
    const { data: userData } = await supabase
      .from("users")
      .select("user_id")
      .eq("auth_id", user.id)
      .maybeSingle();
    
    if (userData) {
      user_id = userData.user_id;
    } else if (user.email) {
      // Secondary fallback: Match by pre-enrolled email
      const { data: userByEmail } = await supabase
        .from("users")
        .select("user_id")
        .ilike("email", user.email)
        .maybeSingle();

      if (userByEmail) {
        user_id = userByEmail.user_id;
      }
    }
  }

  // Fallback: Fetch department from database if not present in JWT or user metadata
  if (!department && (user_id || user.id)) {
    const effectiveId = user_id || user.id;
    const { data: tmpl } = await supabase
      .from("clearance_templates")
      .select("clearance_departments(dept_name)")
      .eq("staff_id", effectiveId)
      .limit(1)
      .maybeSingle();

    if (tmpl?.clearance_departments) {
      const d = Array.isArray(tmpl.clearance_departments)
        ? tmpl.clearance_departments[0]
        : (tmpl.clearance_departments as any);
      department = d?.dept_name || "";
    }
  }

  if (!user_id) {
     // If still not found, we might be in a state where the user record is not yet linked.
     // For now, we'll use the sub as a last resort or throw.
     // But according to the schema, we need the custom ID for joins.
     console.warn("Custom user_id not found for auth user:", user.id);
  }

  return {
    user_id: user_id || user.id,
    user_email: payload.email || user.email || "",
    user_name: payload.user_metadata?.full_name || (user.user_metadata as any)?.full_name || user.email || "",
    department: department,
  };
}
