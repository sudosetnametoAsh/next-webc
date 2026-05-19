// 'use client'

// import { useEffect, useState } from 'react'
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
// import { useFetchStudentTemplates } from '@/hooks/admin/student-templates'
// import { useFetchAdminStats } from '@/hooks/admin/fetch-stats'
// import { useFetchCourseTemplates } from '@/hooks/admin/course-templates'
// import { useFetchDepartments } from '@/hooks/admin/departments'
// import { shrinkCourseName } from '@/utils/formatters'
// import { StudentTemplates } from '@/types/admin'

// interface StatCard {
//   label: string;
//   value: number;
//   badge: string;
//   badgeColor: string;
//   accentColor: string;
//   valueColor: string;
// }

// interface CourseBar {
//   course: string;
//   completion: number;
// }

// interface DonutEntry {
//   name: string;
//   value: number;
//   color: string;
// }

// interface DeptRow {
//   dept_id: number;
//   dept_name: string;
//   rate: number | null;
//   priority: number;
// }

// // ———— Helpers ————————————————————————————————————————————————————————————————————————————————————————————————

// function getDeptBarColor(rate: number | null): string {
//   if (rate === null) return "bg-slate-200";
//   if (rate >= 70) return "bg-emerald-600";
//   if (rate >= 40) return "bg-amber-500";
//   if (rate >= 20) return "bg-orange-500";
//   return "bg-red-600";
// }

// function getDeptRateLabel(rate: number | null): string {
//   if (rate === null) return "—";
//   return `${rate}%`;
// }

// function getDeptRateColor(rate: number | null): string {
//   if (rate === null) return "text-slate-400";
//   if (rate >= 70) return "text-emerald-600";
//   if (rate >= 40) return "text-amber-500";
//   if (rate >= 20) return "text-orange-500";
//   return "text-red-600";
// }

// // ———— Custom Tooltip ————————————————————————————————————————————————————————————————————————————————————————————————

// const CustomBarTooltip = ({ active, payload, label }: any) => {
//   if (active && payload && payload.length) {
//     return (
//       <div className='bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm'>
//         <p className='font-semibold text-slate-700'>{label}</p>
//         <p className='text-[#1e3a6e]'>{payload[0].value}% completion</p>
//       </div>
//     )
//   }

//   return null
// }

// // ———— Sub components ————————————————————————————————————————————————————————————————————————————————————————————————

// function StatCardItem({ card, index }: { card: StatCard, index: number }) {
//   const [visible, setVisible] = useState(false)

//   useEffect(() => {
//     const t = setTimeout(() => setVisible(true), index * 100)
//     return () => clearTimeout(t)
//   }, [index])

//   return (
//     <div
//       className={`bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 overflow-hiddentransition-all duration-500 
//         ${visible ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-4'}`}
//     >
//       <div className={`h-1 w-full ${card.accentColor}`} />
//       <div className='flex flex-col gap-6 p-5'>
//         <p className='text-sm text-slate-500 font-medium mb-2'>{card.label}</p>
//         <p className='text-5xl font-bold tracking-tight mb-3 text-gray-800'>{card.value}</p>
//         {/* <span 
//           className={`nline-block text-xs font-semibold px-2.5 py-1 rounded-full ${card.badgeColor}`}
//         >
//           {card.badge}
//         </span> */}
//       </div>
//     </div>
//   )
// }

// function ClearanceBarChart() {

//   // ———— Hooks ————————————————————————————————————————

//   const { data: courseTemplates = [] } = useFetchCourseTemplates()

//   // ———— Data ————————————————————————————————————————

//   const courseData: CourseBar[] = courseTemplates.map((cT) => ({
//     course: shrinkCourseName(cT.course_name) || cT.course_name,
//     completion: cT.completion_rate,
//   }))

//   return (
//     <div className='bg-white rounded-xl shadow-sm border border-slate-100 p-6'>
//       <h2 className='text-base font-bold text-slate-800'>Clearance rate by course</h2>
//       <p className='text-xs text-slate-400 mt-0.5 mb-5'>Based on enrolled students</p>

//       {/* Legend */}
//       <div className='flex items-center gap-2 mb-4'>
//         <span className='inline-block w-3 h-3 rounded-sm bg-[#1e3a6e]' />
//         <span className='text-xs text-slate-500'>Completion %</span>
//       </div>

//       <ResponsiveContainer width='100%' height={300}>
//         <BarChart data={courseData} margin={{ top: 4, right: 8, left: -16, bottom: 0, }} barSize={48}>
//           <CartesianGrid strokeDasharray='3 3' stroke='#f1f5f9' vertical={false} />
//           <XAxis 
//             dataKey='course'
//             tick={{ fontSize: 12, fill: '#94a3b8' }}
//             axisLine={false}
//             tickLine={false}
//           />
//           <YAxis 
//             domain={[0, 100]}
//             tickFormatter={(v) => `${v}%`}
//             tick={{ fontSize: 11, fill: '#94a3b8' }}
//             axisLine={false}
//             tickLine={false}
//             ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
//           />
//           <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
//           <Bar dataKey='completion' fill='#1e3a6e' radius={[4, 4, 0, 0]} />
//         </BarChart>
//       </ResponsiveContainer>
//     </div>
//   )
// }

// const RADIAN = Math.PI / 180

// function DonutChart() {

//   // ———— Hooks ————————————————————————————————————————

//   const { data: adminStats } = useFetchAdminStats()
//   const { data: studentTemplates = [] } = useFetchStudentTemplates()

//   // ———— Data ————————————————————————————————————————

//   const clearedPercent = Math.round(((adminStats?.signed ?? 0) / (studentTemplates.length || 1)) * 100)
//   const inProgressPercent = Math.round(((adminStats?.incomplete ?? 0) / (studentTemplates.length || 1)) * 100)
//   const pendingPercent = Math.round(((adminStats?.pending ?? 0) / (studentTemplates.length || 1)) * 100)

//   const donutData: DonutEntry[] = [
//     { name: "Cleared", value: clearedPercent, color: "#009966" },
//     { name: "In progress", value: inProgressPercent, color: '#f54900' },
//     { name: "Pending", value: pendingPercent, color: "#e7000b" },
//   ];

//   const total = donutData.reduce((sum, d) => sum + d.value, 0)

//   return (
//     <div className='bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col'>
//       <h2 className='text-base font-bold text-slate-800'>Overall clearance status</h2>
//       <p className='text-xs text-slate-400 mt-0.5 mb-4'>All students combined</p>

//       {/* Legend */}
//       <div className='flex flex-wrap gap-4 mb-4'>
//         {donutData.map((d) => (
//           <div key={d.name} className='flex items-center gap-1.5'>
//             <span className='w-2.5 h-2.5 rounded-full inline-block' style={{ background: d.color }} />
//             <span className='text-xs text-slate-500'>
//               {d.name} {d.value}%
//             </span>
//           </div>
//         ))}
//       </div>

//       <div className='flex-1 flex items-center justify-center'>
//         <ResponsiveContainer width='100%' height={260}>
//           <PieChart>
//             <Pie
//               data={donutData}
//               cx='50%'
//               cy='50%'
//               innerRadius={65}
//               outerRadius={100}
//               paddingAngle={2}
//               dataKey='value'
//               startAngle={90}
//               endAngle={-270}
//             >
//               {donutData.map((entry, index) => (
//                 <Cell key={`cell-${index}`} fill={entry.color} stroke='none' />
//               ))}
//             </Pie>
//             <Tooltip
//               formatter={(value) => [`${value}%`, '']}
//               contentStyle={{
//                 borderRadius: '8px',
//                 border: '1px solid #e2e8f0',
//                 fontSize: '12px',
//               }}
//             />
//           </PieChart>
//         </ResponsiveContainer>
//       </div>
//     </div>
//   )
// }

// function DeptSigningRate() {
  
//   const [animated, setAnimated] = useState(false)

//   // ———— Hooks ————————————————————————————————————————

//   const { data: studentTemplates = [] } = useFetchStudentTemplates()
//   const { data: courseTemplates = [], isLoading } = useFetchCourseTemplates()
//   const { data: fetchDepts = [] } = useFetchDepartments()

//   // ———— Data ————————————————————————————————————————

//   const courseTDepts = courseTemplates.flatMap((t) => t.departments)
//   const courseTDeptIds = courseTDepts.map((tDept) => tDept.dept_id)
//   const templateDepts = fetchDepts.filter((fDept) => courseTDeptIds.includes(fDept.dept_id)) ?? []
//   const pendingDepts = studentTemplates.map((sT) => sT.pending_departments.map((pD) => pD.dept_name)) ?? []

//   const signedCount = (deptName: string) => {
//     let count = 0
  
//     for (const pD of pendingDepts) {
      
//       if (!pD.some((d) => d.trim().toLowerCase() === deptName.trim().toLowerCase())) {
//         count++
//       }
//     }
    
//     return count
//   }

//   const finalTemplateDepts = templateDepts.map((obj) => ({
//     ...obj,
//     rate: Math.round(signedCount(obj.dept_name) / (studentTemplates.length || 1) * 100) || null,
//     priority: obj.dept_name.trim().toLowerCase().includes('cashier') ? 1 
//       : obj.dept_name.trim().toLowerCase().includes('registrar') ? fetchDepts.length : 3
//   }))

//   const sortedDeptData: DeptRow[] = finalTemplateDepts.toSorted((a, b) => a.priority - b.priority)

//   useEffect(() => {
//     const t = setTimeout(() => setAnimated(true), 300)
//     return () => clearTimeout(t)
//   }, [])

//   return (
    // <div className='bg-white rounded-xl shadow-sm border border-slate-100 p-6'>
    //   <h2 className='text-base font-bold text-slate-800'>Department signing rate</h2>
    //   <p className='text-xs text-slate-400 mt-0.5 mb-6'>
    //     How many students each department has cleared
    //   </p>

    //   {sortedDeptData.length === 0 ? (
    //     <div className='flex min-h-[300px] justify-center items-center'>
    //       <p className='text-slate-400 text-sm'>No clearance templates found. Create a new one.</p>
    //     </div>
    //   ): (

    //     <div className='space-y-4'>
    //       {sortedDeptData.map((dept, i) => (
    //         <div key={dept.dept_name} className='flex items-center gap-4'>
    //           {/* Name */}
    //           <span className='w-36 text-sm text-slate-600 shrink-0 truncate'>{dept.dept_name}</span>

    //           {/* Back track */}
    //           <div className='flex-1 h-3 bg-slate-100 rounded-full overflow-hidden'>
    //             {dept.rate !== null && (
    //               <div 
    //                 className={`h-full rounded-full transition-all duration-700 ease-out ${getDeptBarColor(dept.rate)}`}
    //                 style={{ width: animated ? `${dept.rate}%` : '0%', transitionDelay: `${i * 80}ms`, }}
    //               />
    //             )}
    //           </div>

    //           {/* Rate label */}
    //           <span className={`w-8 text-sm font-semibold text-right shrink-0 ${getDeptRateColor(dept.rate)}`}>
    //             {getDeptRateLabel(dept.rate)}
    //           </span>
    //         </div>
    //       ))}
    //     </div>
    //   )}
    // </div>
//   )
// }

// // ———— Main component ————————————————————————————————————————————————————————————————————————————————————————————————

// export default function Reports() {

//   // ———— Hooks ————————————————————————————————————————

//   const { data: adminStats } = useFetchAdminStats()
//   const { data: studentTemplates = [] } = useFetchStudentTemplates()

//   // ———— Data ————————————————————————————————————————

//   const statCards: StatCard[] = [
//     {
//       label: "Total students",
//       value: studentTemplates.length,
//       badge: "Enrolled",
//       badgeColor: "bg-blue-100 text-blue-700",
//       accentColor: "bg-[#0a1128]",
//       valueColor: "text-[#1e3a6e]",
//     },
//     {
//       label: "Fully cleared",
//       value: adminStats?.signed ?? 0,
//       badge: "10% of total",
//       badgeColor: "bg-emerald-100 text-green-700",
//       accentColor: "bg-emerald-600",
//       valueColor: "text-emerald-600",
//     },
//     {
//       label: "In progress",
//       value: adminStats?.incomplete ?? 0,
//       badge: "10% of total",
//       badgeColor: "bg-amber-100 text-amber-700",
//       accentColor: "bg-amber-600",
//       valueColor: "text-amber-600",
//     },
//     {
//       label: "Not started",
//       value: adminStats?.pending ?? 0,
//       badge: "zero progress",
//       badgeColor: "bg-red-100 text-red-600",
//       accentColor: "bg-red-600",
//       valueColor: "text-red-600",
//     },
//   ];

//   return (
//     <div className='min-h-screen'>
//       <div className='space-y-6'>

//         {/* Header */}
//         <div>
//           <h1 className='text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight'>Reports</h1>
//           <p className='text-sm text-slate-500 mt-0.5'>Clearance status overview</p>
//         </div>

//         {/* Stat Cards */}
//         <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
//           {statCards.map((statCard, i) => (
//             <StatCardItem key={statCard.label} card={statCard} index={i} />
//           ))}
//         </div>

//         {/* Charts Row */}
//         <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
//           <div className='lg:col-span-2'>
//             <ClearanceBarChart />
//           </div>
//           <div className='lg:col-span-1'>
//             <DonutChart />
//           </div>
//         </div>

//         {/* Department Signing Rate */}
//         <DeptSigningRate />
//       </div>
//     </div>
//   )
// }