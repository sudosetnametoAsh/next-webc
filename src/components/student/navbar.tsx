"use client";
import React from "react";
import SignOutButton from "@/components/auth/sign-out-button";
// Import the avatar component from its own file
import { UserProfileAvatar } from "@/components/auth/user-profile-avatar";

interface NavbarProps {
  name: string;
  id: string;
}

// ✅ This must export "Navbar"
export function Navbar({ name, id }: NavbarProps) {
  return (
    <div className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
      <div className="w-full px-4 sm:px-8 h-16 flex items-center justify-between">
        
        {/* TOP LEFT: Sign Out */}
        <div className="flex items-center gap-6">
          <SignOutButton /> 
          
          <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
          <span className="text-sm font-bold tracking-widest text-slate-500 hidden sm:block uppercase">
            Student Portal
          </span>
        </div>

        {/* Right: User Profile Widget */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white">{name}</p>
            <p className="text-xs text-slate-400 font-mono">ID: {id}</p>
          </div>
          
          {/* Use the component here */}
          <UserProfileAvatar name={name} />
          
        </div>

      </div>
    </div>
  );
}