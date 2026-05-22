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
  department: string
}> {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (!session || error) {
    console.error(error?.message);
    throw new Error("No active session");
  }

  const payload = jwtDecode<CustomPayload>(session.access_token);
  
  let user_id = payload.user_id;
  let department = payload.department || "";

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
     // If still not found, we might be in a state where the user record is not yet linked.
     // For now, we'll use the sub as a last resort or throw.
     // But according to the schema, we need the custom ID for joins.
     console.warn("Custom user_id not found for auth user:", session.user.id);
  }

  return {
    user_id: user_id || session.user.id,
    user_email: payload.email,
    user_name: payload.user_metadata.full_name,
    department: department,
  };
}
