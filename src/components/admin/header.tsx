'use client'

import SignOutButton from "../auth/sign-out-button"

export default function Header({ email }: { email: string}) {
  
  const initial = email?.charAt(0).toUpperCase() || "A";

  return (
    <header className="bg-white border-b border-gray-200 py-2">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        
        <div className="flex items-center gap-3">
          
          
          <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-gray-50">
            {initial}
          </div>

          <div className="flex flex-col justify-center">
            <h1 className="text-sm font-bold text-slate-900 leading-none">Admin</h1>
            <p className="text-xs text-gray-500 mt-1 leading-none">{email}</p>
          </div>
        </div>


        <div>
          <SignOutButton />
        </div>
        
      </div>
    </header>
  )
}