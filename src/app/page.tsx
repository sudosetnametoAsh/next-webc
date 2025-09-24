"use client";

import SignInButton from "@/components/signin-button";
import useRoleRedirect from "@/hooks/use-role";

export default function Home() {

  useRoleRedirect()

  return (
    <>
      <SignInButton />
    </>
  );
}
