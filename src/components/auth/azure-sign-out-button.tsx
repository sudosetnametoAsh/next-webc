"use client";

import { LogOut } from "lucide-react";
import React from "react";

export default function AzureSignOutButton({ 
  color = "#ffffff", 
  children 
}: { 
  color?: string; 
  children?: React.ReactNode 
}) {
  function handleOnclick() {
    window.location.replace("/api/auth/clear-session");
  }

  return (
    <button className="cursor-pointer flex items-center justify-center" onClick={handleOnclick}>
      {children ? children : <LogOut size={20} color={color} />}
    </button>
  );
}
