"use client";
import { usePathname } from "next/navigation";

export default function BreadCrumb() {
  const path = usePathname();
  const lastPath = path?.split("/").pop();
  if (!lastPath) return null;
  const breadCrumbVal = lastPath.charAt(0).toUpperCase() + lastPath.slice(1);

  return (
    <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-[#ffffff] px-4 py-7.5 shadow-sm">
      {/* <PanelRightOpen size={22} /> */}
      <div className="flex items-center text-lg">
        <span className="font-medium text-[#a4b1cd]">Department</span>
        <span className="mx-2 text-[#a4b1cd]">{">"}</span>
        <span className="font-semibold text-gray-800">{breadCrumbVal}</span>
      </div>
    </header>
  );
}

// "use client";
// import { Bell, HelpCircle, Settings, ChevronRight, UserCheck, Clock } from "lucide-react";
// import { usePathname } from "next/navigation";
// import { useDepartmentContext } from "@/context/deparment";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { useNotifications } from "@/hooks/clearance/use-notifications";

// function formatRelativeTime(date: Date) {
//   const now = new Date();
//   const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

//   if (diffInSeconds < 60) return "just now";
//   const diffInMinutes = Math.floor(diffInSeconds / 60);
//   if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
//   const diffInHours = Math.floor(diffInMinutes / 60);
//   if (diffInHours < 24) return `${diffInHours}h ago`;
//   const diffInDays = Math.floor(diffInHours / 24);
//   return `${diffInDays}d ago`;
// }

// export default function Topbar() {
//   const path = usePathname();
//   const lastPath = path?.split("/").pop();
//   const breadCrumbVal = lastPath;

//   const { userId, viewType } = useDepartmentContext();
//   const { notifications, unreadCount, markAllAsRead } = useNotifications(userId);

//   return (
//     <header className="flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6">
//       {/* Left Side: Breadcrumbs */}
//       <div className="flex items-center text-sm">
//         <span className="font-medium text-slate-400">Clearance</span>
//         <ChevronRight
//           className="mx-1.5 h-4 w-4 text-slate-400"
//           strokeWidth={2.5}
//         />
//         <span className="font-semibold text-slate-800 capitalize">
//           {breadCrumbVal}
//         </span>
//       </div>

//       {/* Right Side: Action Icons */}
//       <div className="flex items-center gap-4">
//         {/* Help Icon */}
//         <button
//           className="text-slate-500 transition-colors hover:text-slate-800"
//           aria-label="Help"
//         >
//           <HelpCircle className="h-5 w-5" />
//         </button>

//         {/* Notifications */}
//         <Popover>
//           <PopoverTrigger asChild>
//             <button
//               className="relative text-slate-500 transition-colors hover:text-slate-800"
//               aria-label="Notifications"
//             >
//               <Bell className="h-5 w-5" />
//               {unreadCount > 0 && (
//                 <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
//                   {unreadCount}
//                 </span>
//               )}
//             </button>
//           </PopoverTrigger>
//           <PopoverContent className="w-80 p-0" align="end">
//             <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
//               <h3 className="font-semibold text-slate-900">Notifications</h3>
//               <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
//                 {unreadCount} New
//               </span>
//             </div>
//             <div className="max-h-[400px] overflow-y-auto">
//               {notifications.length > 0 ? (
//                 notifications.map((notif) => (
//                   <div
//                     key={notif.id}
//                     className="flex cursor-pointer items-start gap-3 border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50 last:border-0"
//                   >
//                     <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
//                       <UserCheck size={16} />
//                     </div>
//                     <div className="flex-1 overflow-hidden">
//                       <p className="text-sm font-semibold text-slate-900">
//                         {notif.title}
//                       </p>
//                       <p className="mt-0.5 truncate text-xs text-slate-500">
//                         {notif.description}
//                       </p>
//                       <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
//                         <Clock size={10} />
//                         <span>{formatRelativeTime(new Date(notif.timestamp))}</span>
//                       </div>
//                     </div>
//                     {!notif.read && (
//                       <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
//                     )}
//                   </div>
//                 ))
//               ) : (
//                 <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
//                   <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300">
//                     <Bell size={24} />
//                   </div>
//                   <p className="text-sm font-medium text-slate-900">No new notifications</p>
//                   <p className="mt-1 text-xs text-slate-500">
//                     We'll notify you when {viewType === 'students' ? 'students' : 'staff'} are eligible for signing.
//                   </p>
//                 </div>
//               )}
//             </div>
//             {unreadCount > 0 && (
//               <div className="border-t border-slate-100 bg-slate-50 p-2">
//                 <button
//                   onClick={() => markAllAsRead.mutate()}
//                   className="w-full rounded-md py-1.5 text-center text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 hover:text-indigo-700"
//                 >
//                   Mark all as read
//                 </button>
//               </div>
//             )}
//           </PopoverContent>
//         </Popover>

//         {/* --- Separator --- */}
//         <div className="h-6 w-px bg-slate-200"></div>

//         {/* Settings Action */}
//         <button
//           className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
//           aria-label="Settings"
//         >
//           <Settings className="h-5 w-5" />
//         </button>
//       </div>
//     </header>
//   );
// }
