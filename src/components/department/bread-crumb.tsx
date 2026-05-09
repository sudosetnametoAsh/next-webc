// // import { PanelRightOpen } from "lucide-react";

// import SignOutButton from "../auth/sign-out-button";

// export default function BreadCrumb() {
//   return (
//     <header className="flex items-center gap-2 border-b border-slate-200 bg-[#ffffff] px-4 py-7.5 shadow-sm justify-between">
//       {/* <PanelRightOpen size={22} /> */}
//       <div className="flex items-center text-lg">
//         <span className="font-medium text-[#a4b1cd]">Clearance</span>
//         <span className="mx-2 text-[#a4b1cd]">{">"}</span>
//         <span className="font-semibold text-gray-800">Students</span>
//       </div>

//       <SignOutButton />
//     </header>
//   );
// }

"use client";
import { Bell, HelpCircle, Settings, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Topbar() {
  const path = usePathname();
  const lastPath = path?.split("/").pop();
  const breadCrumbVal = lastPath;

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Left Side: Breadcrumbs */}
      <div className="flex items-center text-sm">
        <span className="font-medium text-slate-400">Clearance</span>
        <ChevronRight
          className="mx-1.5 h-4 w-4 text-slate-400"
          strokeWidth={2.5}
        />
        <span className="font-semibold text-slate-800 capitalize">{breadCrumbVal}</span>
      </div>

      {/* Right Side: Action Icons */}
      <div className="flex items-center gap-4">
        {/* Help Icon */}
        <button
          className="text-slate-500 transition-colors hover:text-slate-800"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <button
          className="text-slate-500 transition-colors hover:text-slate-800"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* --- Separator --- */}
        <div className="h-6 w-px bg-slate-200"></div>

        {/* Settings Action */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
