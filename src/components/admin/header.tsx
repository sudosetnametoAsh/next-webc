'use client'

import SignOutButton from "../auth/sign-out-button"

export default function Header({ email }: { email: string}) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-semibold text-gray-900">Admin</h1>
            <p className="text-sm text-gray-500">{email}</p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}