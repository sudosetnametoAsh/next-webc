import { ENROLLMENT_NOTICE } from "@/lib/auth/client-enrollment";

export default function EnrollmentNotice() {
  return (
    <div role="alert" className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-950">
      <p className="mb-1 font-semibold">Account not enrolled</p>
      <p>{ENROLLMENT_NOTICE}</p>
    </div>
  );
}
