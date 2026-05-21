// import Link from "next/link";
"use client";

import { LogOut } from "lucide-react";

export default function AzureSignOutButton() {
  function handleOnclick() {
    window.location.replace("/api/auth/clear-session");
  }

  return (
    // <Link href={"/api/auth/clear-session"} prefetch={false}>
    //   Sign Out
    // </Link>
    <button className="cursor-pointer" onClick={handleOnclick}>
      <LogOut size={20} color="#ffffff" />
    </button>
  );
}
