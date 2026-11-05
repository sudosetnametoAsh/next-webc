import {
  buildCourseSections,
  type CourseSectionGroup,
  type CourseSectionInput,
} from "./course-configuration";

export const COURSE_IMPORT_TEMPLATE =
  "course_name,year,term,sections\r\nBachelor of Science in Computer Science,1,1,2\r\nBachelor of Science in Computer Science,2,1,1\r\nBachelor of Science in Information Technology,1,1,2\r\n";
export interface ImportedCourse {
  course_name: string;
  groups: CourseSectionGroup[];
  sections: CourseSectionInput[];
}
export interface CourseImportPreview {
  courses: ImportedCourse[];
  errors: { row: number; message: string }[];
}

function parseDelimited(text: string): string[][] {
  const delimiter = text
    .slice(0, text.indexOf("\n") < 0 ? text.length : text.indexOf("\n"))
    .includes("\t")
    ? "\t"
    : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (quoted || !field.trim()) quoted = !quoted;
      else
        throw new Error(
          "Unexpected quote in a field. Wrap names containing quotes in double quotes.",
        );
    } else if (!quoted && char === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
      if (char === "\r" && text[index + 1] === "\n") index++;
    } else field += char;
  }
  if (quoted) throw new Error("A quoted field is missing its closing quote.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseCourseImport(raw: string): CourseImportPreview {
  if (raw.length > 500000)
    throw new Error("Import files must be 500 KB or smaller.");
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) return { courses: [], errors: [] };
  let records: Record<string, unknown>[],
    offset = 1;
  if (text.startsWith("[") || text.startsWith("{")) {
    const parsed = JSON.parse(text);
    records = Array.isArray(parsed) ? parsed : parsed.courses;
    if (!Array.isArray(records))
      throw new Error(
        "Provide a JSON array or an object with a courses array.",
      );
  } else {
    const [header, ...rows] = parseDelimited(text);
    const keys = header.map((value) =>
      value.toLowerCase().replace(/\s+/g, "_"),
    );
    if (
      !["course_name", "year", "term", "sections"].every((key) =>
        keys.includes(key),
      )
    )
      throw new Error("Required columns: course_name, year, term, sections.");
    records = rows.map((row) =>
      Object.fromEntries(keys.map((key, index) => [key, row[index] || ""])),
    );
    offset = 2;
  }
  if (records.length > 500)
    throw new Error("Import up to 500 configuration rows at a time.");
  const grouped = new Map<
    string,
    { course_name: string; groups: CourseSectionGroup[]; row: number }
  >();
  const errors: CourseImportPreview["errors"] = [];
  records.forEach((record, index) => {
    const row = index + offset;
    if (
      !record ||
      typeof record !== "object" ||
      typeof record.course_name !== "string" ||
      !record.course_name.trim() ||
      record.course_name.trim().length > 100
    ) {
      errors.push({
        row,
        message: "Course name is required and must be at most 100 characters.",
      });
      return;
    }
    const name = record.course_name.trim(),
      key = name.toLowerCase();
    const entry = grouped.get(key) || { course_name: name, groups: [], row };
    grouped.set(key, entry);
    const blank = ["year", "term", "sections"].every(
      (key) => record[key] === "" || record[key] == null,
    );
    if (blank) return;
    const group = {
      year: Number(record.year),
      semester: Number(record.term),
      count: Number(record.sections),
    };
    try {
      buildCourseSections([...entry.groups, group]);
      entry.groups.push(group);
    } catch (err) {
      errors.push({
        row,
        message: `${name}: ${err instanceof Error ? err.message : "Invalid section configuration."}`,
      });
    }
  });
  if (grouped.size > 100)
    throw new Error("Import up to 100 courses at a time.");
  const courses = [...grouped.values()].map((entry) => ({
    course_name: entry.course_name,
    groups: entry.groups,
    sections: buildCourseSections(entry.groups),
  }));
  if (
    courses.reduce((count, course) => count + course.sections.length, 0) > 5000
  )
    throw new Error("Import up to 5,000 sections at a time.");
  return { courses, errors };
}
