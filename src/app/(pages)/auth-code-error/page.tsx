import { redirect } from "next/navigation";

export default function AuthCodeErrorPage() {
  redirect("/auth-error?reason=missing_code");
}
