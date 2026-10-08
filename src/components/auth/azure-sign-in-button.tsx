"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/db/supabase-client";
import { Loader2 } from "lucide-react";

export default function AzureLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleAzureLogin = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "email profile",
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        console.error("Error logging in:", error.message);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleAzureLogin}
      disabled={isLoading}
      aria-label="Continue with Microsoft Entra ID"
      className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:bg-slate-50 hover:border-slate-400 hover:shadow active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#0B192C]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-750 dark:hover:border-slate-600 dark:focus:ring-amber-400/20 disabled:opacity-60 cursor-pointer"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-600 dark:text-slate-300" />
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 21 21"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <rect x="1" y="1" width="9" height="9" fill="#F25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
          <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
          <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
        </svg>
      )}
      <span className="tracking-tight">
        {isLoading ? "Authenticating..." : "Continue with Microsoft Entra ID"}
      </span>
    </button>
  );
}
