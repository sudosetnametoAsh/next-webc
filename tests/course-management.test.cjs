const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const ts = require("typescript");
function loadCourseModule(file, dependencies = {}) {
  const exports = {};
  new Function(
    "exports",
    "require",
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
  )(exports, (name) => dependencies[name]);
  return exports;
}
const configuration = loadCourseModule("src/lib/course-configuration.ts");
const courseImport = loadCourseModule("src/lib/course-import.ts", {
  "./course-configuration": configuration,
});
function harness(
  kind,
  {
    authorized = true,
    linked = false,
    failedCheck = false,
    dbOverride,
    schemaOverride,
  } = {},
) {
  const writes = [];
  const client = {
    from(table) {
      let write = false;
      const query = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        insert(value) {
          writes.push({ table, value });
          write = true;
          return query;
        },
        update(value) {
          writes.push({ table, value });
          write = true;
          return query;
        },
        delete() {
          writes.push({ table, delete: true });
          write = true;
          return query;
        },
        limit: async () => ({
          data: linked ? [{ id: 1 }] : [],
          error: failedCheck ? { message: "Failed" } : null,
        }),
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({
          data: {
            course_id: 1,
            course_name: "BSCS",
            courses: { course_name: "BSCS" },
          },
          error: null,
        }),
        then(resolve, reject) {
          return Promise.resolve({ data: [], error: null }).then(
            resolve,
            reject,
          );
        },
      };
      return query;
    },
  };
  const exports = {};
  const dependencies = {
    "@/lib/course-import": courseImport,
    "@/lib/db": { db: dbOverride },
    "@/lib/db/schema": schemaOverride,
    "@/lib/services/admin-read-client": {
      adminReadClient: async () => (authorized ? client : null),
    },
    "@/lib/db/supabase-server": { createClient: async () => client },
    "@/lib/services/admin-cache": { invalidateServerAdminCache() {} },
    "@/lib/services/department-cache": { invalidateServerDepartmentCache() {} },
    "next/server": {
      NextResponse: { json: (body, init) => Response.json(body, init) },
    },
  };
  new Function(
    "exports",
    "require",
    ts.transpileModule(
      fs.readFileSync(`src/app/api/admin/${kind}/route.ts`, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
  )(exports, (name) => {
    if (!(name in dependencies)) throw Error(name);
    return dependencies[name];
  });
  return { api: exports, writes };
}
const request = (body) => ({ json: async () => body });
for (const kind of ["courses", "sections"]) {
  test(`${kind} mutations require an administrator`, async () => {
    const { api, writes } = harness(kind, { authorized: false });
    for (const method of ["POST", "PATCH", "DELETE"].filter(
      (method) => api[method],
    ))
      assert.equal((await api[method](request({}))).status, 403);
    assert.equal(writes.length, 0);
  });
  for (const failedCheck of [false, true])
    test(`${kind} removal protects linked records and fails closed: ${failedCheck}`, async () => {
      const { api, writes } = harness(kind, { linked: true, failedCheck });
      const response = await api.DELETE(
        request(kind === "courses" ? { course_id: 1 } : { section_id: 1 }),
      );
      assert.equal(response.status, failedCheck ? 500 : 409);
      assert.equal(writes.length, 0);
    });
  test(`${kind} permits removal when no associations exist`, async () => {
    const { api, writes } = harness(kind);
    assert.equal(
      (
        await api.DELETE(
          request(kind === "courses" ? { course_id: 1 } : { section_id: 1 }),
        )
      ).status,
      200,
    );
    assert.equal(writes.length, 1);
  });
}
test("courses can be created and renamed with trimmed names", async () => {
  const { api, writes } = harness("courses");
  assert.equal(
    (await api.POST(request({ course_name: "  BSCS  " }))).status,
    201,
  );
  assert.equal(writes[0].value.course_name, "BSCS");
  assert.equal(
    (await api.PATCH(request({ course_id: 1, course_name: "  BSIT  " })))
      .status,
    200,
  );
  assert.equal(writes[1].value.course_name, "BSIT");
  for (const body of [
    { course_id: 1, course_name: {} },
    { course_id: "bad", course_name: "BSIT" },
  ])
    assert.equal((await api.PATCH(request(body))).status, 400);
});
test("sections reject invalid year, term, and section values before writing", async () => {
  const { api, writes } = harness("sections");
  for (const values of [
    { year: -1 },
    { semester: 5 },
    { section_number: 1.5 },
  ]) {
    assert.equal(
      (
        await api.POST(
          request({
            course_id: 1,
            year: 1,
            semester: 1,
            section_number: 1,
            ...values,
          }),
        )
      ).status,
      400,
    );
  }
  assert.equal(writes.length, 0);
});
test("Courses navigation sits directly between Clients and Templates", () => {
  const sidebar = fs.readFileSync(
    "src/components/admin/admin-sidebar.tsx",
    "utf8",
  );
  assert.match(
    sidebar,
    /label: "Clients"[\s\S]*?label: "Courses"[\s\S]*?label: "Templates"/,
  );
  assert.ok(fs.existsSync("src/app/(pages)/admin/courses/page.tsx"));
});

test("section groups generate numbered sections and reject duplicate or invalid groups", () => {
  const exports = {};
  new Function(
    "exports",
    ts.transpileModule(
      fs.readFileSync("src/lib/course-configuration.ts", "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText,
  )(exports);
  const build = exports.buildCourseSections;
  assert.deepEqual(build([{ year: 1, semester: 2, count: 2 }]), [
    { year: 1, semester: 2, section_number: 1 },
    { year: 1, semester: 2, section_number: 2 },
  ]);
  assert.deepEqual(build([]), []);
  assert.throws(
    () =>
      build([
        { year: 1, semester: 1, count: 2 },
        { year: 1, semester: 1, count: 1 },
      ]),
    /once/,
  );
  assert.throws(
    () => build([{ year: 1, semester: 1, count: 1.5 }]),
    /section count/,
  );
  assert.throws(
    () =>
      build([
        { year: 1, semester: 1, count: 999 },
        { year: 2, semester: 1, count: 2 },
      ]),
    /1,000/,
  );
});

test("combined course and sections save commits together and rolls back a section failure", async () => {
  const { PGlite } = require("@electric-sql/pglite");
  const { drizzle } = require("drizzle-orm/pglite");
  const { pgTable, serial, varchar, integer } = require("drizzle-orm/pg-core");
  const pg = new PGlite();
  try {
    await pg.exec(
      "CREATE TABLE courses (course_id serial PRIMARY KEY, course_name varchar(100) NOT NULL); CREATE TABLE course_sections (section_id serial PRIMARY KEY, course_id integer REFERENCES courses(course_id), year integer CHECK(year <> 9), semester integer, section_number integer)",
    );
    const courses = pgTable("courses", {
      courseId: serial("course_id").primaryKey(),
      courseName: varchar("course_name", { length: 100 }),
    });
    const courseSections = pgTable("course_sections", {
      sectionId: serial("section_id").primaryKey(),
      courseId: integer("course_id"),
      year: integer("year"),
      semester: integer("semester"),
      sectionNumber: integer("section_number"),
    });
    const { api } = harness("courses", {
      dbOverride: drizzle(pg),
      schemaOverride: { courses, courseSections },
    });
    const response = await api.POST(
      request({
        course_name: "BSCS",
        sections: [
          { year: 1, semester: 1, section_number: 1 },
          { year: 1, semester: 1, section_number: 2 },
        ],
      }),
    );
    assert.equal(response.status, 201);
    assert.equal((await pg.query("SELECT * FROM courses")).rows.length, 1);
    assert.equal(
      (await pg.query("SELECT * FROM course_sections")).rows.length,
      2,
    );
    const failed = await api.POST(
      request({
        course_name: "Rollback program",
        sections: [{ year: 9, semester: 1, section_number: 1 }],
      }),
    );
    assert.equal(failed.status, 500);
    assert.equal(
      (await pg.query("SELECT * FROM courses")).rows.length,
      1,
      "failed section insert must roll back the new course",
    );
    for (const sections of [
      [{ year: 1, semester: 5, section_number: 1 }],
      [
        { year: 1, semester: 1, section_number: 1 },
        { year: 1, semester: 1, section_number: 1 },
      ],
    ]) {
      assert.equal(
        (await api.POST(request({ course_name: "Invalid", sections }))).status,
        400,
      );
    }
    const importer = harness("courses/import", {
      dbOverride: drizzle(pg),
      schemaOverride: { courses, courseSections },
    }).api;
    assert.equal(
      (
        await importer.POST(
          request({
            text: "course_name,year,term,sections\nBSIT,1,1,2\nBSIT,2,1,1",
          }),
        )
      ).status,
      201,
    );
    assert.equal((await pg.query("SELECT * FROM courses")).rows.length, 2);
    assert.equal(
      (await pg.query("SELECT * FROM course_sections")).rows.length,
      5,
    );
    assert.equal(
      (
        await importer.POST(
          request({ text: "course_name,year,term,sections\nBSIT,1,1,1" }),
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await importer.POST(
          request({
            text: "course_name,year,term,sections\nNew good,1,1,1\nNew bad,9,1,1",
          }),
        )
      ).status,
      500,
    );
    assert.equal(
      (await pg.query("SELECT * FROM courses")).rows.length,
      2,
      "entire import rolls back when a later course fails",
    );
    assert.equal(
      (
        await harness("courses/import", { authorized: false }).api.POST(
          request({ text: "" }),
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await importer.POST(
          request({ text: "course_name,year,term,sections\nBroken,0,1,1" }),
        )
      ).status,
      400,
    );
  } finally {
    await pg.close();
  }
});

test("course importer parses CSV, quoted names, BOM, tabs, and JSON consistently", () => {
  const { parseCourseImport: parse } = courseImport;
  const csv =
    '\uFEFFcourse_name,year,term,sections\r\n"Course, with ""quotes""",1,1,2\r\n"Course, with ""quotes""",2,1,1';
  const result = parse(csv);
  assert.equal(result.errors.length, 0);
  assert.equal(result.courses.length, 1);
  assert.equal(result.courses[0].course_name, 'Course, with "quotes"');
  assert.equal(result.courses[0].sections.length, 3);
  assert.deepEqual(
    parse("course_name\tyear\tterm\tsections\nBSCS\t1\t2\t2"),
    parse(
      JSON.stringify([{ course_name: "BSCS", year: 1, term: 2, sections: 2 }]),
    ),
  );
  assert.equal(
    parse("course_name,year,term,sections\nBSCS,,,").courses[0].sections.length,
    0,
  );
  assert.equal(
    parse("course_name,year,term,sections\nBSCS,1,1,1\nbscs,1,1,2").errors[0]
      .row,
    3,
  );
  assert.equal(
    parse("course_name,year,term,sections\nBSCS,1,,2").errors.length,
    1,
  );
  assert.throws(
    () => parse('course_name,year,term,sections\n"unclosed,1,1,1'),
    /closing quote/,
  );
  assert.throws(
    () => parse("name,year,term,sections\nBSCS,1,1,1"),
    /Required columns/,
  );
  assert.throws(() => parse("a".repeat(500001)), /500 KB/);
});
