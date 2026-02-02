"use client";
import { useMsal } from "@azure/msal-react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const { instance } = useMsal();

  const handleLogout = async () => {
    try {
      await fetch("/api/session", { method: "DELETE" });
      await instance.logoutRedirect();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="
        group flex items-center gap-2 
        px-3 py-2 rounded-lg 
        text-sm font-medium text-slate-400 
        hover:text-red-400 hover:bg-red-400/10 
        transition-all duration-200
      "
    >
      {/* Icon with a slight slide animation on hover */}
      <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      <span>Sign Out</span>
    </button>
  );
}