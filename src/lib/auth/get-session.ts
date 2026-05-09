import { createClient } from "../db/supabase-server";

export async function getSession(): Promise<{
  user_id: string;
  user_email: string;
  user_name: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    console.error(error?.message);
    throw new Error("No active session");
  }

  const { data: user_info } = await supabase
    .from("users")
    .select("email, user_id")
    .eq("auth_id", user.id);

  return {
    user_id: user_info?.[0].user_id,
    user_email: user_info?.[0].email,
    user_name: user.user_metadata.full_name,
  };
}
