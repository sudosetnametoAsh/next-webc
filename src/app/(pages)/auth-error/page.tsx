import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ShieldAlert, ArrowRight, UserCheck, HelpCircle } from "lucide-react";
import AzureSignOutButton from "@/components/auth/azure-sign-out-button";
import { verifySessionToken } from "@/lib/auth/session-token";

interface AuthErrorPageProps {
  searchParams: Promise<{
    reason?: string;
  }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const reason = params?.reason;

  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  const session = token ? await verifySessionToken(token) : null;

  const errorConfig: Record<
    string,
    {
      badge: string;
      title: string;
      description: string;
      guidance: string;
    }
  > = {
    admin_required: {
      badge: "Institutional Administrator Required",
      title: "Restricted Administrative Console",
      description:
        "The section you requested is restricted to designated Institutional Administrators and System Operators. Your current credential does not have administrative privileges.",
      guidance:
        "If you are a student or faculty member, please return to your designated workspace. If you need administrative clearance, contact the campus IT Services or Registrar.",
    },
    faculty_required: {
      badge: "Faculty & Staff Authorization Required",
      title: "Department Clearance Portal Restricted",
      description:
        "This clearance management workstation is accessible only to authorized academic department heads, faculty signatories, and clearance staff members.",
      guidance:
        "Students completing semester clearance should proceed to the Student Clearance Portal. To switch to a designated staff account, please sign out below.",
    },
    student_required: {
      badge: "Student Verification Required",
      title: "Student Clearance Portal Restricted",
      description:
        "This clearance portal is designated for enrolled students completing their academic, financial, and institutional clearance requirements.",
      guidance:
        "Administrative and faculty personnel should access clearance workflows through their respective Department or Admin consoles.",
    },
  };

  const currentConfig = (reason && errorConfig[reason]) || {
    badge: "Access Denied",
    title: "Unauthorized Access Request",
    description:
      "Your current account does not have permission to access the requested institutional resource.",
    guidance:
      "Please verify your credentials or switch to an authorized institutional account with the proper role permissions.",
  };

  let portalUrl = "/";
  let portalLabel = "Return to Sign In";

  if (session?.role === "Admin") {
    portalUrl = "/admin";
    portalLabel = "Return to Admin Console";
  } else if (session?.role === "Staff" || session?.role === "Department") {
    portalUrl = "/department";
    portalLabel = "Return to Department Portal";
  } else if (session?.role === "Student") {
    portalUrl = "/student";
    portalLabel = "Return to Student Portal";
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between text-foreground">
      {/* Top Institutional Header */}
      <header className="w-full bg-[#0B192C] text-white border-b border-[#0B192C]/80 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/stilogo.png"
              alt="STI Logo"
              width={38}
              height={38}
              className="object-contain rounded"
              priority
            />
            <div>
              <span className="text-sm font-semibold tracking-wide uppercase text-[#F59E0B] block leading-tight">
                STI College
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Online Clearance Verification System
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono hidden sm:block">
            Security Gateway &bull; Edge RBAC
          </div>
        </div>
      </header>

      {/* Main Error Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#0B192C] px-8 pt-8 pb-7 text-white relative">
            <div className="flex items-start justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-xs font-semibold uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                <span>{currentConfig.badge}</span>
              </div>
              <span className="text-xs font-mono text-slate-400">HTTP 403</span>
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {currentConfig.title}
            </h1>
          </div>

          <div className="px-8 py-6 space-y-6">
            {/* Description */}
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
              {currentConfig.description}
            </p>

            {/* User Session Info (if logged in) */}
            {session && (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0B192C] text-white flex items-center justify-center font-bold text-sm">
                    {session.user_name ? session.user_name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-none mb-1">
                      {session.user_name || session.user_email}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {session.user_email}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F59E0B]/20 text-slate-900 dark:text-amber-300 border border-[#F59E0B]/40">
                    Role: {session.role}
                  </span>
                  {session.department && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {session.department}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Guidance Alert */}
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 flex gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
              <HelpCircle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-950 dark:text-amber-100 block mb-0.5">Recommended Action:</span>
                <span>{currentConfig.guidance}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href={portalUrl}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B192C] hover:bg-[#0B192C]/90 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#F59E0B]" />
                <span>{portalLabel}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <AzureSignOutButton className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors cursor-pointer">
                <span>Sign Out / Switch</span>
              </AzureSignOutButton>
            </div>
          </div>

          {/* Footer Info */}
          <div className="bg-slate-50 border-t border-slate-100 px-8 py-3 text-center text-xs text-slate-500">
            STI College Clearance Security &bull; Role-Based Access Control
          </div>
        </div>
      </main>

      {/* Page Footer */}
      <footer className="w-full text-center py-4 text-xs text-slate-400">
        &copy; {new Date().getFullYear()} STI College. All rights reserved.
      </footer>
    </div>
  );
}
