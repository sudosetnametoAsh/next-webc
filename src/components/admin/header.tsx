"use client";

import Avatar from '@/components/admin/avatar'
import SignOutButton from "@/components/auth/sign-out-button"
import { useMsal } from "@azure/msal-react";

const Header = () => {
  const { accounts } = useMsal();
  const account = accounts[0];
  const name = account?.name || "Administrator";
  const email = account?.username || "admin@school.edu";

  return (
    // CHANGED: 
    // 1. Removed 'rounded-xl' and 'mb-6'
    // 2. Added 'border-b' and 'bg-white' for a classic full-width nav look
    // 3. Added 'sticky top-0 z-50' so it stays visible when scrolling
    <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-6 md:px-10 h-16 flex items-center justify-between">
        
        {/* Left: Avatar & Text */}
        <div className="flex items-center gap-3">
          <Avatar name={name} size="md" />
          <div className="flex flex-col -space-y-0.5">
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              {name}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium font-mono">
              {email}
            </p>
          </div>
        </div>

        {/* Right: Sign Out */}
        <div>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}

export default Header