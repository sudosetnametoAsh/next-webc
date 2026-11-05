import { periodAccessDenial, type PeriodAccess } from "@/lib/academic-periods/access";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase-server";
import { readClientEnrollment, requiresClientEnrollment } from "@/lib/auth/client-enrollment";
import { RoleRouter } from "@/modules/auth/domain/role-router";

export async function GET(request?: NextRequest) {
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
    if (!roles.includes("Admin")) {
      const area = request?.nextUrl.searchParams.get("area") === "department" && roles.includes("Department") ? "department" : "client";
      const { data, error: accessError } = await supabase.rpc("period_access");
      if (accessError || !data) return NextResponse.json({ code: "PERIOD_CHECK_FAILED" }, { status: 503, headers });
      const denial = periodAccessDenial(data as PeriodAccess, area);
      if (denial) return NextResponse.json({ code: denial, access: data }, { status: 403, headers });
    }
    return NextResponse.json({ enrolled: true }, { headers });
  } catch {
    return NextResponse.json({ code: "ENROLLMENT_CHECK_FAILED" }, { status: 503, headers });
  }
}
