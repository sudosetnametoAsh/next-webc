"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Upload,
  Loader2,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { COURSE_IMPORT_TEMPLATE, parseCourseImport } from "@/lib/course-import";
import { useToast } from "@/hooks/use-toast";

export default function CourseImportForm({
  existingNames,
  pending,
  onPendingChange,
  onComplete,
  onCancel,
}: {
  existingNames: string[];
  pending: boolean;
  onPendingChange: (pending: boolean) => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const parsed = useMemo(() => {
    try {
      return { ...parseCourseImport(text), parseError: "" };
    } catch (error) {
      return {
        courses: [],
        errors: [],
        parseError:
          error instanceof Error ? error.message : "Unable to parse import.",
      };
    }
  }, [text]);
  const existing = new Set(
    existingNames.map((name) => name.trim().toLowerCase()),
  );
  const duplicates = parsed.courses.filter((course) =>
    existing.has(course.course_name.toLowerCase()),
  );
  const invalid = Boolean(
    parsed.parseError || parsed.errors.length || duplicates.length || fileError,
  );
  function download() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + COURSE_IMPORT_TEMPLATE], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "course_import_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || reading || invalid || !parsed.courses.length) return;
    onPendingChange(true);
    try {
      const response = await fetch("/api/admin/courses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to import courses.");
      for (const queryKey of [
        ["admin", "courses"],
        ["admin", "sections"],
        ["admin", "course-templates"],
        ["courses"],
        ["department-clients"],
      ])
        void queryClient.invalidateQueries({ queryKey });
      success(
        `Imported ${result.summary.coursesCreated} courses and ${result.summary.sectionsCreated} sections.`,
      );
      onComplete();
    } catch (err) {
      error(err instanceof Error ? err.message : "Unable to import courses.");
    } finally {
      onPendingChange(false);
    }
  }
  const fieldClass =
    "w-full rounded-xl border border-slate-700 bg-[#070c18] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40";
  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-[#070c18] p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Import academic programs and sections
          </p>
          <button
            type="button"
            onClick={download}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            Download Course CSV Template
          </button>
        </div>
        <div
          className="flex flex-wrap gap-2 border-b border-slate-800 pb-2"
          role="group"
          aria-label="Import source"
        >
          <button
            type="button"
            aria-pressed={inputMode === "upload"}
            disabled={pending || reading}
            onClick={() => setInputMode("upload")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${inputMode === "upload" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
          >
            <Upload className="h-3.5 w-3.5" />
            File Upload (.csv, .tsv, .json)
          </button>
          <button
            type="button"
            aria-pressed={inputMode === "paste"}
            disabled={pending || reading}
            onClick={() => setInputMode("paste")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${inputMode === "paste" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
          >
            <FileText className="h-3.5 w-3.5" />
            Direct Text Paste
          </button>
        </div>
        {inputMode === "upload" ? (
          <div>
            <input
              id="course-import-file"
              aria-label="Upload CSV or text file"
              type="file"
              accept=".csv,.tsv,.txt,.json,text/csv,text/tab-separated-values,text/plain,application/json"
              disabled={pending || reading}
              className="peer sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setFileError("");
                if (file.size > 500000) {
                  setFileError("Import files must be 500 KB or smaller.");
                  return;
                }
                setReading(true);
                try {
                  setText(await file.text());
                  setFileName(file.name);
                } catch {
                  setFileError(
                    "Unable to read this file. Try uploading it again.",
                  );
                } finally {
                  setReading(false);
                }
              }}
            />
            <label
              htmlFor="course-import-file"
              className={`group transition-ui flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/80 bg-slate-900/20 p-8 text-center peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400/40 ${pending || reading ? "cursor-wait opacity-50" : "cursor-pointer hover:border-amber-500/60 hover:bg-[#070c18]"}`}
            >
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors group-hover:bg-amber-500/20 group-hover:text-amber-400">
                {reading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </span>
              <span className="flex items-center justify-center gap-2 text-xs font-semibold text-white">
                {fileName && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                {reading
                  ? "Reading file…"
                  : fileName || "Choose a course roster file"}
              </span>
              <span className="mt-1 text-[11px] text-slate-500">
                {fileName
                  ? "Click to select a different file"
                  : "Accepts CSV, TSV, TXT, or JSON array · up to 500 KB"}
              </span>
            </label>
          </div>
        ) : (
          <div>
            <label
              htmlFor="course-import-text"
              className="mb-1.5 block text-xs font-medium text-slate-300"
            >
              Paste CSV, tab-separated text, or JSON
            </label>
            <textarea
              id="course-import-text"
              aria-label="Or paste CSV, tab-separated text, or JSON"
              rows={6}
              disabled={pending || reading}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setFileName("");
                setFileError("");
              }}
              placeholder={COURSE_IMPORT_TEMPLATE}
              className={`${fieldClass} font-mono text-xs`}
            />
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Columns: course_name, year, term, sections. Repeat the course name
              for another year or term. Sections are numbered from 1. Leave all
              three configuration fields blank for a course without sections.
            </p>
            <p className="mt-1 text-xs break-words text-slate-500">
              JSON example:{" "}
              {JSON.stringify([
                { course_name: "BSCS", year: 1, term: 1, sections: 2 },
              ])}
            </p>
          </div>
        )}
        {(fileError || parsed.parseError) && (
          <p role="alert" className="text-xs text-rose-300">
            {fileError || parsed.parseError}
          </p>
        )}
        {parsed.errors.length > 0 && (
          <ul role="alert" className="space-y-1 text-xs text-rose-300">
            {parsed.errors.map((item, index) => (
              <li key={index}>
                Row {item.row}: {item.message}
              </li>
            ))}
          </ul>
        )}
        {duplicates.length > 0 && (
          <p role="alert" className="text-xs text-rose-300">
            Already exists:{" "}
            {duplicates.map((course) => course.course_name).join(", ")}. Remove
            existing courses from this import.
          </p>
        )}
        {parsed.courses.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="border-b border-slate-800 bg-[#070c18] px-3 py-2 text-xs font-semibold text-slate-300">
              Import preview · {parsed.courses.length} courses ·{" "}
              {parsed.courses.reduce(
                (sum, course) => sum + course.sections.length,
                0,
              )}{" "}
              sections
            </div>
            <div className="max-h-48 divide-y divide-slate-800 overflow-y-auto">
              {parsed.courses.map((course) => (
                <div
                  key={course.course_name.toLowerCase()}
                  className="px-3 py-2"
                >
                  <p className="text-xs font-semibold text-slate-200">
                    {course.course_name}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {course.groups.length
                      ? course.groups
                          .map(
                            (group) =>
                              `Year ${group.year} · Term ${group.semester}: ${group.count} sections`,
                          )
                          .join("; ")
                      : "No initial sections"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-800 bg-[#070c18] px-6 py-4">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending || reading || invalid || !parsed.courses.length}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {pending
            ? "Importing…"
            : `Import ${parsed.courses.length} ${parsed.courses.length === 1 ? "Course" : "Courses"}`}
        </button>
      </div>
    </form>
  );
}
