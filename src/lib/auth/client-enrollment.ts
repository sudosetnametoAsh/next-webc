import type { SupabaseClient } from "@supabase/supabase-js";

export const ENROLLMENT_NOTICE_URL = "/?notice=not-enrolled";
export const ENROLLMENT_NOTICE = "You are not enrolled in the system. Please contact the administrator to enroll your account.";
export const requiresClientEnrollment = (roles: readonly string[]) =>
  (roles.includes("Client") || roles.includes("Department")) && !roles.includes("Admin");

export function hasClientProfile(identity: { students?: unknown; staffs?: unknown } | null) {
  return Boolean(identity && [identity.students, identity.staffs].some((profile) =>
    Array.isArray(profile) ? profile.length > 0 : Boolean(profile)));
}

export async function readClientEnrollment(supabase: SupabaseClient, authId: string) {
  const { data, error } = await supabase.from("users")
    .select("user_id, students(student_id), staffs(staff_id)")
    .eq("auth_id", authId).maybeSingle();
  if (error) throw new Error("Unable to verify enrollment");
  return hasClientProfile(data);
}

export class ClientNotEnrolledError extends Error {
  constructor() { super(ENROLLMENT_NOTICE); this.name = "ClientNotEnrolledError"; }
}
