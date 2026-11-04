import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase-server";
import { readClientEnrollment, requiresClientEnrollment } from "@/lib/auth/client-enrollment";
import { RoleRouter } from "@/modules/auth/domain/role-router";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401, headers });
    const roles = RoleRouter.parseRoles(user.user_metadata?.custom_claims?.roles);
    if (!roles.length) return NextResponse.json({ code: "FORBIDDEN" }, { status: 403, headers });
    if (requiresClientEnrollment(roles) && !await readClientEnrollment(supabase, user.id)) {
      return NextResponse.json({ code: "NOT_ENROLLED" }, { status: 403, headers });
    }
    return NextResponse.json({ enrolled: true }, { headers });
  } catch {
    return NextResponse.json({ code: "ENROLLMENT_CHECK_FAILED" }, { status: 503, headers });
  }
}
