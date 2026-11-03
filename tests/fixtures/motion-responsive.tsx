import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminSidebar from '@/components/admin/admin-sidebar';
import ClearanceSidebar from '@/components/clearance/sidebar';
import DepartmentSidebar from '@/components/department/sidebar';
import AdminNotifications from '@/components/admin/notification-sidebar';
import ClearanceNotifications from '@/components/clearance/notification-sidebar';
import DepartmentNotifications from '@/components/department/notification-sidebar';
import { AdminNavProvider, useAdminNav } from '@/components/admin/admin-nav-context';
import { ClearanceNavProvider, useClearanceNav } from '@/components/clearance/clearance-nav-context';
import { DepartmentNavProvider, useDepartmentNav } from '@/components/department/department-nav-context';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import Login from '@/components/landing';
import RequirementModal from '@/components/clearance/requirement-modal';
import ConfirmationModal from '@/components/admin/confirmation-modal';

const area = new URLSearchParams(location.search).get('area') || 'admin';
function Portal() {
  const admin = useAdminNav(), clearance = useClearanceNav(), department = useDepartmentNav();
  const nav = area === 'admin' ? admin : area === 'department' ? department : clearance;
  const [requirement, setRequirement] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const Notifications = area === 'admin' ? AdminNotifications : area === 'department' ? DepartmentNotifications : ClearanceNotifications;
  return <div className="flex h-dvh w-full overflow-hidden bg-[#060a14] text-white">
    {area === 'admin' ? <AdminSidebar user={{ name: 'Mobile Tester' }} /> : area === 'department' ? <DepartmentSidebar department="Library" user_name="Mobile Tester" /> : <ClearanceSidebar user={{name: 'Mobile Tester', role: 'Student'}} />}
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap gap-4 p-4">
        <button onClick={nav.toggleMobile}>Navigation</button>
        <button onClick={() => setNotifications(true)}>Notifications</button>
        <Dialog><DialogTrigger>Long dialog</DialogTrigger><DialogContent><DialogTitle>Mobile dialog</DialogTitle><DialogDescription>Long content must remain scrollable.</DialogDescription>{Array.from({length:30},(_,i)=><p key={i}>Requirement {i + 1}</p>)}<button>Final action</button></DialogContent></Dialog>
        <button onClick={()=>setRequirement(true)}>Requirement details</button>
        <button onClick={()=>setConfirmation(true)}>Confirm changes</button>
        <Switch aria-label="Test switch" />
      </header>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4"><h1>Portal fixture: {area}</h1><div className="overflow-x-auto"><table className="min-w-[860px]"><tbody><tr><td>Wide office hours table</td><td>Last department</td></tr></tbody></table></div>{Array.from({length:35},(_,i)=><p className="py-4" key={i}>Clearance requirement {i + 1}</p>)}<button>Bottom action</button></main>
    </div>
    <RequirementModal isOpen={requirement} onClose={()=>setRequirement(false)} task={{id:1,title:'A long clearance requirement title for narrow mobile screens',description:'Return all library materials',status:'Pending',isInPerson:true}} deptName="Library" studentId="fixture" hasPrevTask hasNextTask isFirstTask isLastTask hasPrevDept hasNextDept prevDeptName="Cashier" nextDeptName="Registrar" onPrevTask={()=>{}} onNextTask={()=>{}} onPrevDept={()=>{}} onNextDept={()=>{}} />
    <ConfirmationModal isOpen={confirmation} onClose={()=>setConfirmation(false)} onConfirm={()=>setConfirmation(false)} title="Confirm mobile changes" description={'This warning needs to remain readable on short screens. '.repeat(35)} confirmLabel="Proceed with changes" />
    <Notifications isOpen={notifications} onClose={()=>setNotifications(false)} notifications={[]} unreadCount={0} onMarkAsRead={()=>{}} onMarkAllAsRead={()=>{}} />
  </div>;
}
createRoot(document.getElementById('root')!).render(area === 'login' ? <Login /> : <QueryClientProvider client={new QueryClient()}><AdminNavProvider><ClearanceNavProvider><DepartmentNavProvider><Portal /></DepartmentNavProvider></ClearanceNavProvider></AdminNavProvider></QueryClientProvider>);
