const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
function load(path, mocks, globals = {}) {
 const exports = {};
 new Function('exports', 'require', ...Object.keys(globals), ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports, name => { if (!(name in mocks)) throw Error(name); return mocks[name]; }, ...Object.values(globals));
 return exports;
}
function harness(authorized = true) {
 const reads = [];
 const client = { from(table) {
  let period;
  const q = { select() { return q; }, eq(field, value) { if (field === 'period_id') period = value; else assert.equal(value, 2025); return q; },
   order() { return q; }, then(resolve) { return Promise.resolve({ data: [1, 2].map(term => ({ period_id: term, term, start_year: 2025, end_year: 2026, state: 'ended' })) }).then(resolve); },
   range: async (start, end) => {
    reads.push({ table, period, start });
    if (table === 'staff_enrollments') return { data: [] };
    if (table === 'enrollments') return { data: [{ student_id: 'S1', students: { student_name: 'Current name' }, course_sections: { year: 4, courses: { course_id: 1, course_name: 'Current course' } } }] };
    assert.equal(table, 'clearance_records');
    // More than one page; historical template has since been disabled/reassigned.
    const all = Array.from({ length: 501 }, (_, i) => ({ user_id: 'S1', signed_at: i === 500 ? '2025-12-02T02:00:00Z' : '2025-12-01T02:00:00Z', status: period === 1 ? 'Signed' : 'Pending', clearance_templates: { course_id: 99, is_active: false }, document_snapshot: { is_active: true, department: `Office ${i}`, student_name: 'Historic name', course_name: 'Historic course', year: 2, section_number: 1 } }));
    return { data: all.slice(start, end + 1) };
   } };
  return q;
 } };
 const api = load('src/app/api/admin/reports/export/route.ts', { '@/lib/services/admin-read-client': { adminReadClient: async () => authorized ? client : null }, 'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } } }, { Response });
 return { api, reads };
}
test('year export includes each historical term, snapshots, and every record page', async () => {
 const { api, reads } = harness();
 const response = await api.GET({ nextUrl: { searchParams: new URLSearchParams({ startYear: '2025' }) } });
 assert.equal(response.status, 200);
 const { students } = await response.json();
 assert.equal(students.length, 2);
 assert.deepEqual(students.map(s => s.term), [1, 2]);
 assert.equal(students[0].academic_year, '2025-2026');
 assert.equal(students[0].student_name, 'Historic name');
 assert.equal(students[0].total_departments, 501);
 assert.equal(students[0].signed_departments, 501);
 assert.equal(students[1].signed_departments, 0);
 assert.equal(students[0].completed_at, '2025-12-02T02:00:00.000Z');
 assert.equal(students[1].completed_at, null);
 assert.ok(reads.some(r => r.start === 500));
});
test('export rejects unauthorized callers and invalid years', async () => {
 assert.equal((await harness(false).api.GET({})).status, 403);
 assert.equal((await harness().api.GET({ nextUrl: { searchParams: new URLSearchParams({ startYear: 'invalid' }) } })).status, 400);
});
test('Excel workbook groups programs and staff and contains the revised columns', async () => {
 let blob, filename;
 const link = { setAttribute(key, value) { if (key === 'download') filename = value; }, click() {} };
 const formatters = load('src/utils/formatters.ts', {});
 const { exportClearanceReport } = load('src/utils/export-clearance-report.ts', {
  exceljs: require('exceljs'),
  '@/lib/date-time': { APP_TIME_ZONE: 'Asia/Manila' }, '@/utils/formatters': formatters,
  '@/components/admin/client-filter-toolbar': { formatSectionCode: () => '2/1-1' },
 }, { Blob, URL: { createObjectURL(value) { blob = value; return 'blob:export'; }, revokeObjectURL() {} }, document: { createElement: () => link, body: { appendChild() {}, removeChild() {} } } });
 const student = { student_id: '001', student_name: '=Literal name', academic_year: '2025-2026', term: 2, total_departments: 2, signed_departments: 2, overallStatus: 'Signed', completed_at: '2025-12-02T02:00:00.000Z' };
 const result = await exportClearanceReport({ academicYear: '2025-2026', students: [
  { ...student, course_name: 'BSCS' },
  { ...student, course_name: 'Bachelor of Science in Computer Science', term: 1 },
  { ...student, course_name: 'BSIT', overallStatus: 'Pending' },
 ], staff: [{ staff_id: '002', staff_name: 'Staff Member', total_departments: 0, overallStatus: 'Incomplete' }] });
 const workbook = new (require('exceljs').Workbook)();
 await workbook.xlsx.load(await blob.arrayBuffer());
 assert.deepEqual(workbook.worksheets.map(s => s.name), ['BSCS', 'BSIT', 'Staff']);
 const sheet = workbook.getWorksheet('BSCS');
 assert.equal(sheet.rowCount, 3);
 assert.deepEqual(sheet.getRow(1).values.slice(1), ['Client ID', 'Client Name', 'Client Type', 'Academic Year', 'Term', 'Academic Program / Department', 'Year & Section', 'Overall Status', 'Completion Rate (%)', 'Completed At']);
 assert.equal(sheet.getCell('A2').value, '001');
 assert.equal(sheet.getCell('B2').value, '=Literal name');
 assert.equal(sheet.getCell('I2').value, 100);
 assert.match(sheet.getCell('J2').value, /10:00:00/);
 assert.equal(workbook.getWorksheet('BSIT').getCell('J2').value, '');
 assert.equal(workbook.getWorksheet('Staff').getCell('I2').value, 0);
 assert.match(filename, /2025-2026.*\.xlsx$/);
 assert.equal(result.totalRecords, 4);
});
