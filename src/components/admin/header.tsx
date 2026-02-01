import SignOutButton from "../auth/sign-out-button"

const Header = () => {
  return (
    <header className="flex justify-between items-center border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <p>Icon</p>
          <div>
            <p className="text-sm font-medium text-gray-900">Admin</p>
            <p className="text-xs text-gray-500">admin@sti.edu.ph</p>
          </div>
        </div>
      </div>

      <SignOutButton />
    </header>
  )
}

export default Header