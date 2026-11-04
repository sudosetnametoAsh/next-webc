import { ClientNotEnrolledError } from "./client-enrollment";
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
  
  // Resolve the current identity instead of trusting a JWT issued before removal/re-enrollment.
  let user_id: string | undefined;
  let department =
    payload.department ||
    (user.user_metadata as any)?.department ||
    (user.user_metadata as any)?.custom_claims?.department ||
    "";
  if (["staff", "student", "admin", "all"].includes(department.trim().toLowerCase())) {
    department = "";
  }

  // Resolve the current enrollment from the authenticated identity
  if (!user_id) {
    const { data: userData, error: identityError } = await supabase
      .from("users")
      .select("user_id")
      .eq("auth_id", user.id)
      .maybeSingle();
    
    if (identityError) throw new Error("Unable to verify enrollment");
    if (userData) {
      user_id = userData.user_id;
    } else if (user.email) {
      // Secondary fallback: Match by pre-enrolled email
      const { data: userByEmail, error: emailError } = await supabase
        .from("users")
        .select("user_id")
        .ilike("email", user.email)
        .maybeSingle();

      if (emailError) throw new Error("Unable to verify enrollment");
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

  const roles = (user.user_metadata as any)?.custom_claims?.roles;
  if (!user_id && !(Array.isArray(roles) && roles.includes("Admin"))) {
    throw new ClientNotEnrolledError();
  }

  return {
    user_id: user_id || user.id,
    user_email: payload.email || user.email || "",
    user_name: payload.user_metadata?.full_name || (user.user_metadata as any)?.full_name || user.email || "",
    department: department,
  };
}
