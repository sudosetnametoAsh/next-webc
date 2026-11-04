export const ENROLLMENT_EMAIL_DOMAIN = "lucena.sti.edu.ph";
export const STUDENT_ID_PREFIX = "02000";
export type EnrollmentClientType = "student" | "staff";

export function parseEnrollmentName(value: string) {
  const parts = value.trim().split(",");
  if (parts.length !== 2) return null;
  const lastName = parts[0].trim().replace(/\s+/g, " ");
  const firstName = parts[1].trim().replace(/\s+/g, " ");
  if (!/\p{L}/u.test(lastName) || !/\p{L}/u.test(firstName)) return null;
  return { lastName, firstName, fullName: `${lastName}, ${firstName}` };
}

const emailName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function suggestEnrollmentEmail(type: EnrollmentClientType, name: string, studentId = ""): string {
  const parsed = parseEnrollmentName(name);
  if (!parsed) return "";
  const last = emailName(parsed.lastName);
  if (!last) return "";
  if (type === "student") {
    const digits = studentId.trim().slice(-6);
    return /^\d{6}$/.test(digits) ? `${last}.${digits}` : "";
  }
  const first = emailName(parsed.firstName);
  return first ? `${first}.${last}` : "";
}

export function enrollmentEmailLocalPart(value: string): string {
  const trimmed = value.trim();
  const suffix = `@${ENROLLMENT_EMAIL_DOMAIN}`;
  return trimmed.toLowerCase().endsWith(suffix) ? trimmed.slice(0, -suffix.length) : trimmed;
}

export function isEmailLocalPart(value: string): boolean {
  return /^[a-z0-9!#$%&'*+\/=?^_`{|}~.-]+$/i.test(value) && value.length <= 64 && !value.startsWith(".") && !value.endsWith(".") && !value.includes("..");
}

/** Roster imports accept a full email address or a username at the campus domain. */
export function resolveEnrollmentEmail(value: string): string {
  const email = value.trim().toLowerCase();
  return email && !email.includes("@") ? `${email}@${ENROLLMENT_EMAIL_DOMAIN}` : email;
}

export function isEnrollmentEmail(value: string): boolean {
  const parts = value.split("@");
  return parts.length === 2 && isEmailLocalPart(parts[0]) && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(parts[1]);
}

export interface ParsedEnrollmentRow {
  rowNum: number;
  id: string;
  name: string;
  email: string;
  course?: string;
  year?: number;
  semester?: number;
  section?: number;
  isValid: boolean;
  error?: string;
}

type RosterRecord = Record<string, unknown>;
const text = (value: unknown) => value == null ? "" : String(value).trim();
const positiveInteger = (value: unknown) => !text(value) ? 1 : Number(value);

function rosterRow(item: RosterRecord, type: EnrollmentClientType, rowNum: number, columnError?: string): ParsedEnrollmentRow {
  const id = text(item.student_id ?? item.studentId ?? item.staff_id ?? item.staffId ?? item.id ?? item.userId);
  const rawName = text(item.name ?? item.student_name ?? item.studentName ?? item.staff_name ?? item.staffName);
  const name = parseEnrollmentName(rawName);
  const email = resolveEnrollmentEmail(text(item.email));
  const year = positiveInteger(item.year), semester = positiveInteger(item.semester), section = positiveInteger(item.section_number ?? item.sectionNumber ?? item.section);
  let error = columnError;
  if (!error && type === "student" && !id) error = "Missing student ID";
  if (!error && id.length > 11) error = "ID exceeds 11 characters";
  if (!error && !name) error = "Use Last Name, First Name";
  if (!error && !isEnrollmentEmail(email)) error = "Invalid or missing email";
  if (!error && type === "student" && ![year, semester, section].every((n) => Number.isInteger(n) && n > 0)) error = "Year, semester and section must be positive integers";
  return { rowNum, id, name: name?.fullName ?? rawName, email, course: text(item.course_name ?? item.courseName ?? item.course ?? item.program), year, semester, section, isValid: !error, error };
}

/** RFC-style double quotes, escaped quotes and embedded newlines; apostrophes are ordinary name characters. */
function readDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  const finishRow = () => {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    row = []; cell = ""; closed = false;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === delimiter) { row.push(cell.trim()); cell = ""; closed = false; }
    else if (char === "\n") finishRow();
    else if (char === '"' && !cell.trim() && !closed) { cell = ""; quoted = true; }
    else if (closed && char.trim()) throw new Error("Unexpected text after a quoted field. Put comma-formatted names in double quotes.");
    else cell += char;
  }
  if (quoted) throw new Error("Unclosed CSV quote. Put each comma-formatted name in double quotes.");
  finishRow();
  return rows;
}

const headerKey = (value: string) => value.toLowerCase().replace(/[\s_-]/g, "");
const aliases: Record<string, string> = {
  studentid: "id", staffid: "id", userid: "id", id: "id", name: "name", fullname: "name", studentname: "name", staffname: "name",
  email: "email", emailaddress: "email", coursename: "course", course: "course", program: "course", year: "year", semester: "semester", section: "section", sectionnumber: "section",
};

export function parseEnrollmentRoster(raw: string, type: EnrollmentClientType): ParsedEnrollmentRow[] {
  const clean = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];
  if (clean.startsWith("[") || clean.startsWith("{")) {
    let items: unknown;
    try { items = JSON.parse(clean); } catch { throw new Error("Invalid JSON. Provide an array of enrollment records."); }
    if (!Array.isArray(items)) throw new Error("Provide a JSON array of enrollment records.");
    return items.map((item, index) => rosterRow(item && typeof item === "object" && !Array.isArray(item) ? item : {}, type, index + 1));
  }
  // TSV copied from spreadsheets keeps commas inside name cells without CSV quoting.
  const delimiter = clean.split("\n", 1)[0].includes("\t") ? "\t" : ",";
  const rows = readDelimited(clean, delimiter);
  if (!rows.length) return [];
  const header = rows[0].map((cell) => aliases[headerKey(cell)]);
  const hasHeader = header.includes("name") && (header.includes("id") || header.includes("email"));
  const columns = hasHeader ? header : type === "staff" && rows[0].length === 2 ? ["name", "email"] : type === "staff" ? ["id", "name", "email"] : ["id", "name", "email", "course", "year", "semester", "section"];
  return (hasHeader ? rows.slice(1) : rows).map((cells, index) => {
    const item: RosterRecord = {};
    columns.forEach((column, i) => { if (column) item[column] = cells[i]; });
    return rosterRow(item, type, index + 1, cells.length > columns.length ? "Unexpected columns; quote names containing commas" : undefined);
  });
}

export function enrollmentCsvTemplate(type: EnrollmentClientType): string {
  return type === "student"
    ? 'student_id,name,email,course_name,year,semester,section_number\n02000123456,"Dela Cruz, Juan",delacruz.123456@lucena.sti.edu.ph,BSIT,1,1,1\n02000654321,"Santos, Maria Clara",santos.654321@lucena.sti.edu.ph,BSCS,2,1,2\n'
    : 'name,email\n"Dela Cruz, Juan",juan.delacruz@lucena.sti.edu.ph\n"Santos, Maria Clara",mariaclara.santos@lucena.sti.edu.ph\n';
}
