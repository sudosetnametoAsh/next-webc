'use client';

import React, { useState } from 'react';

// Mock data based on the image
const programsData = [
  {
    id: 'BSCS',
    name: 'BSCS',
    color: 'bg-blue-500',
    sectionsCount: 4,
    total: 220,
    cleared: 142,
    incomplete: 48,
    pending: 30,
    rate: 65,
    sections: [
      { id: 'cs-1', name: '1/2 - Sec 1', total: 58, cleared: 42, incomplete: 10, pending: 6, rate: 72 },
      { id: 'cs-2', name: '1/2 - Sec 2', total: 55, cleared: 38, incomplete: 12, pending: 5, rate: 69 },
      { id: 'cs-3', name: '2/1 - Sec 1', total: 52, cleared: 35, incomplete: 11, pending: 6, rate: 67 },
      { id: 'cs-4', name: '2/1 - Sec 2', total: 55, cleared: 27, incomplete: 15, pending: 13, rate: 49 },
    ]
  },
  {
    id: 'BSIT',
    name: 'BSIT',
    color: 'bg-purple-500',
    sectionsCount: 3,
    total: 185,
    cleared: 118,
    incomplete: 40,
    pending: 27,
    rate: 64,
    sections: [] // Add section data here later
  },
  {
    id: 'BSCpE',
    name: 'BSCpE',
    color: 'bg-orange-500',
    sectionsCount: 2,
    total: 120,
    cleared: 78,
    incomplete: 25,
    pending: 17,
    rate: 65,
    sections: []
  },
  {
    id: 'BSIS',
    name: 'BSIS',
    color: 'bg-emerald-500',
    sectionsCount: 2,
    total: 95,
    cleared: 55,
    incomplete: 22,
    pending: 18,
    rate: 58,
    sections: []
  }
];

export default function StudentsBreakdown() {
  // Track which programs are expanded. Defaulting 'BSCS' to open.
  const [expandedPrograms, setExpandedPrograms] = useState<string[]>(['BSCS']);

  const toggleProgram = (id: string) => {
    setExpandedPrograms((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Progress Bar Sub-component
  const ProgressBar = ({ rate }: { rate: number }) => (
    <div className="flex items-center justify-end gap-3 w-full">
      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gray-800 rounded-full" style={{ width: `${rate}%` }}></div>
      </div>
      <span className="text-xs font-medium text-gray-500 w-8 text-right">{rate}%</span>
    </div>
  );

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm mt-6">
      {/* Header */}
      <div className="p-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Students Breakdown by Program</h2>
          <p className="text-xs text-gray-500 mt-1">Click a program row to expand and view section-level clearance status</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
              <option>All Programs</option>
              <option>BSCS</option>
              <option>BSIT</option>
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-y border-gray-100">
            <tr>
              <th className="px-6 py-4 font-medium w-1/3">Program / Section</th>
              <th className="px-6 py-4 font-medium text-center">Total</th>
              <th className="px-6 py-4 font-medium text-center">Cleared</th>
              <th className="px-6 py-4 font-medium text-center">Incomplete</th>
              <th className="px-6 py-4 font-medium text-center">Pending</th>
              <th className="px-6 py-4 font-medium text-right">Clearance Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {programsData.map((program) => {
              const isExpanded = expandedPrograms.includes(program.id);

              return (
                <React.Fragment key={program.id}>
                  {/* Parent Program Row */}
                  <tr
                    onClick={() => toggleProgram(program.id)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-3.5 flex items-center gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold ${program.color}`}>
                        {program.name.charAt(0)}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-gray-900">{program.name}</span>
                        <span className="text-xs text-gray-400">({program.sectionsCount} sections)</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-center font-medium text-gray-600">{program.total}</td>
                    <td className="px-6 py-3.5 text-center font-bold text-emerald-500">{program.cleared}</td>
                    <td className="px-6 py-3.5 text-center font-bold text-amber-500">{program.incomplete}</td>
                    <td className="px-6 py-3.5 text-center font-medium text-gray-600">{program.pending}</td>
                    <td className="px-6 py-3.5">
                      <ProgressBar rate={program.rate} />
                    </td>
                  </tr>

                  {/* Expanded Sections Sub-rows */}
                  {isExpanded && program.sections.map((section) => (
                    <tr key={section.id} className="bg-gray-50/30 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-2.5 pl-14 flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center text-blue-500 text-[10px] font-bold">
                          R
                        </div>
                        <span className="text-gray-600 font-medium">{section.name}</span>
                      </td>
                      <td className="px-6 py-2.5 text-center text-gray-500">{section.total}</td>
                      <td className="px-6 py-2.5 text-center font-semibold text-emerald-500">{section.cleared}</td>
                      <td className="px-6 py-2.5 text-center font-semibold text-amber-500">{section.incomplete}</td>
                      <td className="px-6 py-2.5 text-center text-gray-500">{section.pending}</td>
                      <td className="px-6 py-2.5">
                        <ProgressBar rate={section.rate} />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
          {/* Footer Totals Row */}
          <tfoot className="border-t border-gray-100 bg-white">
            <tr>
              <td className="px-6 py-4 font-bold text-gray-900">Total</td>
              <td className="px-6 py-4 font-bold text-center text-gray-900">620</td>
              <td className="px-6 py-4 font-bold text-center text-emerald-500">393</td>
              <td className="px-6 py-4 font-bold text-center text-amber-500">135</td>
              <td className="px-6 py-4 font-bold text-center text-gray-900">92</td>
              <td className="px-6 py-4">
                <ProgressBar rate={63} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
