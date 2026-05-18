import { jwtDecode } from "jwt-decode";
import { createClient } from "../db/supabase-server";

type CustomPayload = {
  user_id: string;
  email: string;
  user_metadata: {
    full_name: string;
  };
  department: string;
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

  return {
    user_id: payload.user_id,
    user_email: payload.email,
    user_name: payload.user_metadata.full_name,
    department: payload.department,
  };
}
