export interface CourseSectionGroup {
  year: number;
  semester: number;
  count: number;
}
export interface CourseSectionInput {
  year: number;
  semester: number;
  section_number: number;
}

export function buildCourseSections(
  groups: CourseSectionGroup[],
): CourseSectionInput[] {
  const seen = new Set<string>();
  const sections: CourseSectionInput[] = [];
  for (const group of groups) {
    if (
      !Number.isInteger(group.year) ||
      group.year < 1 ||
      group.year > 10 ||
      !Number.isInteger(group.semester) ||
      group.semester < 1 ||
      group.semester > 4 ||
      !Number.isInteger(group.count) ||
      group.count < 1 ||
      group.count > 999
    ) {
      throw new Error(
        "Use a year level from 1–10, a term from 1–4, and a section count from 1–999.",
      );
    }
    const key = `${group.year}:${group.semester}`;
    if (seen.has(key))
      throw new Error("Each year level and term can only be configured once.");
    seen.add(key);
    if (sections.length + group.count > 1000)
      throw new Error("Create up to 1,000 sections at a time.");
    for (let section = 1; section <= group.count; section++) {
      sections.push({
        year: group.year,
        semester: group.semester,
        section_number: section,
      });
    }
  }
  return sections;
}
