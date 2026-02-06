"use client";
import React from "react";
import SignOutButton from "@/components/auth/sign-out-button";
import { UserProfileAvatar } from "@/components/auth/user-profile-avatar";

interface NavbarProps {
  name: string;
  id: string;
}

export function Navbar({ name, id }: NavbarProps) {
  return (
    
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        
        <div className="flex items-center gap-3">
          
          <UserProfileAvatar name={name} />

          
          <div className="flex flex-col justify-center">
            <h1 className="text-sm font-bold text-slate-900 leading-none">
              {name}
            </h1>
            <p className="text-xs text-gray-500 mt-1 leading-none font-mono">
              ID: {id}
            </p>
          </div>
        </div>

        
        <div className="flex items-center gap-4">
          
          
          <span className="hidden sm:block text-[10px] font-bold tracking-widest text-gray-400 uppercase border border-gray-200 px-2 py-1 rounded bg-gray-50">
            Student Portal
          </span>

          <SignOutButton /> 
        </div>

      </div>
    </div>
  );
}