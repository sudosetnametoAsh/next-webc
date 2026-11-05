'use client';

import { useState } from 'react';
import type { CarryCandidates } from '@/lib/academic-periods/types';
import type { ClientItem } from './clients-page-client';
import ClientFilterToolbar, { formatSectionCode, type ClientType, type ClientStatus, type CourseItem } from './client-filter-toolbar';
import ClientDirectoryTable from './client-directory-table';
import { Checkbox } from '@/components/ui/checkbox';
import { computeClientOverdueStatus } from '@/lib/clearance-logic';
import { shrinkCourseName } from '@/utils/formatters';

export interface CarryoverSelectionProps {
  candidates: CarryCandidates;
  studentIds: string[];
  staffIds: string[];
  excluded?: boolean;
  onSelectionChange: (studentIds: string[], staffIds: string[]) => void;
}

export default function CarryoverSelection({ candidates, studentIds, staffIds, excluded = false, onSelectionChange }: CarryoverSelectionProps) {
  const [clientType, setClientType] = useState<ClientType>('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ClientStatus>('all');
  const [course, setCourse] = useState('all');
  const [section, setSection] = useState('all');
  const [page, setPage] = useState(1);
  const clients: ClientItem[] = (['students', 'staff'] as const).flatMap(category => candidates[category].map(candidate => {
    const departments = candidate.departments ?? [];
    return {
      id: candidate.id, name: candidate.name, email: candidate.email,
      type: category === 'students' ? 'student' as const : 'staff' as const,
      courseId: candidate.course_id, courseName: candidate.course_name ?? (category === 'students' ? candidate.detail ?? undefined : undefined),
      courseYear: candidate.course_year, sectionId: candidate.section_id,
      sectionNumber: candidate.section_number, semester: candidate.semester,
      sectionCode: candidate.section_id ? formatSectionCode({ year: candidate.course_year, semester: candidate.semester, section_number: candidate.section_number }) : undefined,
      overallStatus: departments.length && departments.every(d => d.status === 'Signed') ? 'Signed' as const : departments.length && departments.every(d => d.status === 'Pending') ? 'Pending' as const : 'Incomplete' as const,
      totalDepartments: departments.length, signedDepartments: departments.filter(d => d.status === 'Signed').length,
      departments, pendingDepartments: [], ...computeClientOverdueStatus(departments, category === 'staff'),
    };
  }));
  const isSelected = (client: ClientItem) => (client.type === 'student' ? studentIds : staffIds).includes(client.id);
  const visibleClients = excluded ? clients.filter(client => !isSelected(client)) : clients;
  const courses: CourseItem[] = [];
  for (const client of clients.filter(client => client.type === 'student' && client.courseName)) {
    let entry = courses.find(item => item.course_name === client.courseName);
    if (!entry) { entry = { course_id: client.courseId ?? courses.length + 1, course_name: client.courseName!, course_sections: [] }; courses.push(entry); }
    if (client.sectionId && !entry.course_sections!.some(item => item.section_id === client.sectionId)) entry.course_sections!.push({ section_id: client.sectionId, section_number: client.sectionNumber ?? 1, year: client.courseYear, semester: client.semester });
  }
  const filtered = visibleClients.filter(client => {
    if (clientType === 'students' && client.type !== 'student' || clientType === 'staff' && client.type !== 'staff') return false;
    if (clientType === 'students' && course !== 'all' && client.courseName !== course && shrinkCourseName(client.courseName ?? '') !== course) return false;
    if (clientType === 'students' && section !== 'all' && String(client.sectionId) !== section && client.sectionCode !== section) return false;
    if (status === 'cleared' && client.overallStatus !== 'Signed' || status === 'pending' && client.overallStatus !== 'Pending' || status === 'in-progress' && client.overallStatus !== 'Incomplete' || status === 'overdue' && !client.isOverdue) return false;
    return [client.name, client.email, client.type === 'student' ? client.id : '', client.courseName].some(value => value?.toLowerCase().includes(search.toLowerCase()));
  });
  const update = (rows: ClientItem[], checked: boolean) => {
    const students = new Set(studentIds), staff = new Set(staffIds);
    for (const client of rows) { const selected = client.type === 'student' ? students : staff; if (checked) selected.add(client.id); else selected.delete(client.id); }
    onSelectionChange([...students], [...staff]);
  };
  const selectedCount = filtered.filter(isSelected).length;
  const selectionClass = 'relative cursor-pointer border-slate-700 bg-slate-900/80 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-slate-950';
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)));
  return <>
    <ClientFilterToolbar allCount={visibleClients.length} studentsCount={visibleClients.filter(c => c.type === 'student').length} staffCount={visibleClients.filter(c => c.type === 'staff').length} filteredCount={filtered.length}
      clientType={clientType} onClientTypeChange={value => { setClientType(value); setCourse('all'); setSection('all'); setPage(1); }}
      searchQuery={search} onSearchChange={value => { setSearch(value); setPage(1); }} selectedStatus={status} onStatusChange={value => { setStatus(value); setPage(1); }}
      courses={courses} selectedCourse={course} onCourseChange={value => { setCourse(value); setSection('all'); setPage(1); }} selectedSection={section} onSectionChange={value => { setSection(value); setPage(1); }} />
    {!excluded && <p className="text-xs text-slate-400">{studentIds.length} students and {staffIds.length} staff selected. Selections are kept when you change filters or pages.</p>}
    <ClientDirectoryTable clients={filtered.slice((currentPage - 1) * 10, currentPage * 10)} totalItems={filtered.length} currentPage={currentPage} pageSize={10} onPageChange={setPage} showChevron={false} onClientClick={excluded ? undefined : client => update([client], !isSelected(client))}
      selectAllCheckbox={() => excluded ? null : <Checkbox aria-label="Select all filtered clients" checked={filtered.length > 0 && selectedCount === filtered.length ? true : selectedCount ? 'indeterminate' : false} onCheckedChange={checked => update(filtered, checked === true)} className={selectionClass} />}
      clientCheckbox={client => excluded ? null : <span onClick={event => event.stopPropagation()}><Checkbox aria-label={`Select ${client.name}`} checked={isSelected(client)} onCheckedChange={checked => update([client], checked === true)} className={selectionClass} /></span>} />
  </>;
}
