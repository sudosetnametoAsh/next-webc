"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpenText,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Layers,
  MoreVertical,
  FileSpreadsheet,
} from "lucide-react";
import {
  useFetchCourses,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
} from "@/hooks/admin/courses";
import {
  useFetchSections,
  useCreateSection,
  useDeleteSection,
} from "@/hooks/admin/enrollments";
import type { Courses } from "@/types/admin";
import { shrinkCourseName } from "@/utils/formatters";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  buildCourseSections,
  type CourseSectionGroup,
} from "@/lib/course-configuration";
import CourseImportForm from "./course-import-form";
import ConfirmationModal from "./confirmation-modal";
import TablePaginationFooter from "./table-pagination-footer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed";
const primaryClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed";

export default function CoursesPageClient() {
  const { data: courses = [], isLoading, isError, refetch } = useFetchCourses();
  const create = useCreateCourse(),
    update = useUpdateCourse(),
    remove = useDeleteCourse();
  const { success, error } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ course?: Courses } | null>(null);
  const [name, setName] = useState("");
  const [importMode, setImportMode] = useState(false);
  const [importPending, setImportPending] = useState(false);
  const [sectionGroups, setSectionGroups] = useState<CourseSectionGroup[]>([
    { year: 1, semester: 1, count: 1 },
  ]);
  let sectionCount = 0;
  let sectionError = "";
  try {
    sectionCount = buildCourseSections(sectionGroups).length;
  } catch (err) {
    sectionError =
      err instanceof Error ? err.message : "Check the section configuration.";
  }
  const [sectionCourse, setSectionCourse] = useState<Courses | null>(null);
  const [deleting, setDeleting] = useState<Courses | null>(null);
  const saving = create.isPending || update.isPending || importPending;
  const filtered = courses.filter((course) =>
    `${course.course_name} ${shrinkCourseName(course.course_name)}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );

  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 10)),
  );
  const paginated = filtered.slice((currentPage - 1) * 10, currentPage * 10);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    if (
      courses.some(
        (course) =>
          course.course_id !== editor?.course?.course_id &&
          course.course_name.trim().toLowerCase() === name.trim().toLowerCase(),
      )
    ) {
      error("A course with this name already exists.");
      return;
    }
    try {
      if (editor?.course)
        await update.mutateAsync({
          course_id: editor.course.course_id,
          course_name: name.trim(),
        });
      else {
        if (sectionError) {
          error(sectionError);
          return;
        }
        await create.mutateAsync({
          course_name: name.trim(),
          sections: buildCourseSections(sectionGroups),
        });
      }
      success(
        editor?.course
          ? "Course updated."
          : `Course added with ${sectionCount} ${sectionCount === 1 ? "section" : "sections"}.`,
      );
      setEditor(null);
    } catch (err) {
      error(err instanceof Error ? err.message : "Unable to save course.");
    }
  }
  async function deleteCourse() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.course_id);
      success("Course removed.");
      setDeleting(null);
    } catch (err) {
      error(err instanceof Error ? err.message : "Unable to remove course.");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Course Management
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage academic programs and their year, term, and section
            groupings.
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading || isError}
          className={`${primaryClass} transition-ui cursor-pointer self-start shadow-md shadow-amber-500/20 sm:self-auto`}
          onClick={() => {
            setImportMode(false);
            setName("");
            setSectionGroups([{ year: 1, semester: 1, count: 1 }]);
            setEditor({});
          }}
        >
          <Plus className="h-4 w-4" />
          Add Course
        </button>
      </div>
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            aria-hidden="true"
            className="absolute top-3 left-3 h-4 w-4 text-slate-500"
          />
          <input
            aria-label="Search courses"
            placeholder="Search by program name or abbreviation…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className={`${inputClass} pl-9`}
          />
        </div>
        <Link href="/admin/templates" className={buttonClass}>
          Manage clearance templates
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col />
              <col className="w-16 sm:w-20" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[#070c18]">
              <tr className="border-b border-slate-800">
                <th className="px-4 py-4 text-left text-[11px] font-bold tracking-wider text-slate-400 uppercase sm:px-6">
                  Course / Program
                </th>
                <th className="px-4 py-4 sm:px-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-6 py-16 text-center text-sm text-slate-400"
                  >
                    <div
                      role="status"
                      className="flex items-center justify-center gap-3"
                    >
                      <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                      Loading courses…
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-6 py-16 text-center text-sm text-rose-300"
                  >
                    <div role="alert">
                      Unable to load courses.
                      <button
                        type="button"
                        onClick={() => void refetch()}
                        className={`${buttonClass} ml-3`}
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : !filtered.length ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-6 py-16 text-center text-sm text-slate-400"
                  >
                    {courses.length
                      ? "No courses match your search."
                      : "No courses yet. Add your first academic program."}
                  </td>
                </tr>
              ) : (
                paginated.map((course) => (
                  <tr
                    key={course.course_id}
                    className="group border-b border-slate-800/60 transition-colors hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className="transition-ui flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shadow-inner group-hover:border-amber-500/40 group-hover:bg-amber-500/20">
                          <BookOpenText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p
                            title={course.course_name}
                            className="truncate text-sm font-semibold text-slate-100"
                          >
                            {course.course_name}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                            {shrinkCourseName(course.course_name)} ·{" "}
                            {course.course_sections?.length || 0} sections
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right sm:px-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Options for ${course.course_name}`}
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-xl border border-slate-800 bg-[#0a101f] p-1 text-slate-200 shadow-xl"
                        >
                          <DropdownMenuItem
                            onClick={() => setSectionCourse(course)}
                            className="gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 focus:bg-slate-800 focus:text-white"
                          >
                            <Layers className="h-3.5 w-3.5 text-amber-400" />
                            Manage Sections
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setName(course.course_name);
                              setEditor({ course });
                            }}
                            className="gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 focus:bg-slate-800 focus:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5 text-amber-400" />
                            Edit Course
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1 bg-slate-800/80" />
                          <DropdownMenuItem
                            onClick={() => setDeleting(course)}
                            className="gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 focus:bg-rose-950/40 focus:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Course
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePaginationFooter
          currentPage={currentPage}
          pageSize={10}
          totalItems={filtered.length}
          itemLabel={filtered.length === 1 ? "course" : "courses"}
          onPageChange={setPage}
        />
      </div>
      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open && !saving) setEditor(null);
        }}
      >
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-slate-800 bg-[#0a101f] p-0 text-white sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-slate-800 bg-[#070c18] px-6 py-5">
            <DialogTitle>
              {editor?.course ? "Edit course" : "Add course"}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editor?.course
                ? "Update the full academic program name."
                : "Name your program and configure its sections in one step."}
            </DialogDescription>
          </DialogHeader>
          {!editor?.course && (
            <div
              role="tablist"
              aria-label="Course entry method"
              className="mx-6 my-4 flex shrink-0 gap-1 rounded-xl border border-slate-800 bg-[#070c18] p-1"
            >
              {[false, true].map((bulk) => (
                <button
                  key={String(bulk)}
                  type="button"
                  role="tab"
                  aria-selected={importMode === bulk}
                  disabled={saving}
                  onClick={() => setImportMode(bulk)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${importMode === bulk ? "bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30" : "text-slate-400 hover:text-white"}`}
                >
                  {bulk ? (
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  ) : (
                    <BookOpenText className="h-3.5 w-3.5" />
                  )}
                  {bulk ? "Bulk Import" : "Single Course"}
                </button>
              ))}
            </div>
          )}
          {!editor?.course && importMode ? (
            <CourseImportForm
              existingNames={courses.map((course) => course.course_name)}
              pending={importPending}
              onPendingChange={setImportPending}
              onComplete={() => setEditor(null)}
              onCancel={() => setEditor(null)}
            />
          ) : (
            <form
              onSubmit={save}
              className="max-h-[70dvh] space-y-5 overflow-y-auto px-6 pb-6"
            >
              <div>
                <label
                  htmlFor="course-name"
                  className="mb-2 block text-xs font-semibold text-slate-300"
                >
                  Program name
                </label>
                <input
                  id="course-name"
                  autoFocus
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                  placeholder="Bachelor of Science in Computer Science"
                />
              </div>
              {!editor?.course && (
                <section className="space-y-4 rounded-xl border border-slate-800 bg-[#070c18] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Layers className="h-4 w-4 text-amber-400" />
                        Section configuration
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        Sections are numbered from 1 for each year level and
                        term.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={buttonClass}
                      disabled={saving || sectionGroups.length >= 40}
                      onClick={() =>
                        setSectionGroups((groups) => [
                          ...groups,
                          {
                            year: Math.min(groups.length + 1, 10),
                            semester: 1,
                            count: 1,
                          },
                        ])
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Year / Term
                    </button>
                  </div>
                  <fieldset disabled={saving} className="space-y-3">
                    {sectionGroups.map((group, index) => (
                      <div
                        key={index}
                        className="flex items-end gap-2 rounded-xl border border-slate-800 bg-[#0a101f] p-3"
                      >
                        <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
                          {(["year", "semester", "count"] as const).map(
                            (field) => (
                              <div key={field}>
                                <label
                                  htmlFor={`course-group-${index}-${field}`}
                                  className="mb-2 block text-[11px] font-medium text-slate-400"
                                >
                                  {field === "year"
                                    ? "Year level"
                                    : field === "semester"
                                      ? "Term"
                                      : "Sections"}
                                </label>
                                <input
                                  id={`course-group-${index}-${field}`}
                                  required
                                  type="number"
                                  min={1}
                                  max={
                                    field === "year"
                                      ? 10
                                      : field === "semester"
                                        ? 4
                                        : 999
                                  }
                                  value={group[field]}
                                  onChange={(event) =>
                                    setSectionGroups((groups) =>
                                      groups.map((item, position) =>
                                        position === index
                                          ? {
                                              ...item,
                                              [field]: Number(
                                                event.target.value,
                                              ),
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                  className={inputClass}
                                />
                              </div>
                            ),
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove configuration ${index + 1}`}
                          onClick={() =>
                            setSectionGroups((groups) =>
                              groups.filter(
                                (_, position) => position !== index,
                              ),
                            )
                          }
                          className={`${buttonClass} mb-0.5 px-2.5 hover:text-rose-300`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </fieldset>
                  {sectionError ? (
                    <p role="alert" className="text-xs text-rose-300">
                      {sectionError}
                    </p>
                  ) : (
                    <p role="status" className="text-xs text-slate-400">
                      {sectionCount
                        ? `${sectionCount} ${sectionCount === 1 ? "section" : "sections"} across ${sectionGroups.length} year / term ${sectionGroups.length === 1 ? "group" : "groups"} will be created.`
                        : "No initial sections. You can add them later from Manage Sections."}
                    </p>
                  )}
                </section>
              )}
              <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  className={buttonClass}
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !name.trim() ||
                    (!editor?.course && Boolean(sectionError))
                  }
                  className={primaryClass}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save
                  Course
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmationModal
        isOpen={Boolean(deleting)}
        onClose={() => {
          if (!remove.isPending) setDeleting(null);
        }}
        onConfirm={deleteCourse}
        isLoading={remove.isPending}
        variant="destructive"
        title="Remove course?"
        description={`Remove ${deleting?.course_name || "this course"}? Courses with sections or clearance templates must have those associations resolved first.`}
        confirmLabel="Remove Course"
      />
      {sectionCourse && (
        <SectionsDialog
          course={sectionCourse}
          onClose={() => setSectionCourse(null)}
        />
      )}
    </div>
  );
}

function SectionsDialog({
  course,
  onClose,
}: {
  course: Courses;
  onClose: () => void;
}) {
  const {
    data: sections = [],
    isLoading,
    isError,
    refetch,
  } = useFetchSections(course.course_id);
  const create = useCreateSection(),
    remove = useDeleteSection();
  const { success, error } = useToast();
  const [values, setValues] = useState({
    year: 1,
    semester: 1,
    section_number: 1,
  });
  const [deleting, setDeleting] = useState<number | null>(null);
  const pending = create.isPending || remove.isPending;
  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    try {
      await create.mutateAsync({ course_id: course.course_id, ...values });
      success("Section added.");
    } catch (err) {
      error(err instanceof Error ? err.message : "Unable to add section.");
    }
  }
  async function deleteSection() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting);
      success("Section removed.");
      setDeleting(null);
    } catch (err) {
      error(err instanceof Error ? err.message : "Unable to remove section.");
    }
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !pending) onClose();
        }}
      >
        <DialogContent className="border-slate-800 bg-[#0a101f] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Course sections</DialogTitle>
            <DialogDescription className="text-slate-400">
              {course.course_name}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={add}
            className="space-y-3 rounded-xl border border-slate-800 bg-[#070c18] p-4"
          >
            <div className="grid grid-cols-3 gap-3">
              {(["year", "semester", "section_number"] as const).map(
                (field) => (
                  <div key={field}>
                    <label
                      htmlFor={`section-${field}`}
                      className="mb-2 block text-xs text-slate-400"
                    >
                      {field === "semester"
                        ? "Term"
                        : field === "year"
                          ? "Year level"
                          : "Section"}
                    </label>
                    <input
                      id={`section-${field}`}
                      required
                      type="number"
                      min={1}
                      max={
                        field === "semester" ? 4 : field === "year" ? 10 : 999
                      }
                      value={values[field]}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          [field]: Number(event.target.value),
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                ),
              )}
            </div>
            <button
              disabled={pending || isLoading || isError}
              className={buttonClass}
            >
              <Plus className="h-3.5 w-3.5" />
              {create.isPending ? "Adding…" : "Add Section"}
            </button>
          </form>
          {isLoading ? (
            <p
              role="status"
              className="py-6 text-center text-sm text-slate-400"
            >
              Loading sections…
            </p>
          ) : isError ? (
            <p role="alert" className="text-sm text-rose-300">
              Unable to load sections.{" "}
              <button onClick={() => void refetch()} className="underline">
                Retry
              </button>
            </p>
          ) : !sections.length ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No sections for this course yet.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {sections.map((section) => (
                <div
                  key={section.section_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Year {section.year} · Term {section.semester} · Section{" "}
                      {section.section_number}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {section.enrolled_count} enrolled in current term
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setDeleting(section.section_id)}
                    aria-label={`Remove year ${section.year} term ${section.semester} section ${section.section_number}`}
                    className={`${buttonClass} hover:text-rose-300`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmationModal
        isOpen={deleting !== null}
        onClose={() => {
          if (!remove.isPending) setDeleting(null);
        }}
        onConfirm={deleteSection}
        isLoading={remove.isPending}
        variant="destructive"
        title="Remove section?"
        description="Only sections with no enrollment history can be removed."
        confirmLabel="Remove Section"
      />
    </>
  );
}
