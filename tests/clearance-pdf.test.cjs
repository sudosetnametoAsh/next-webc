const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { jsPDF } = require('jspdf');

function exportPdf(count = 4, profileOverrides = {}, recordOverrides = {}) {
  let pdf, savedFilename;
  const text = [];
  function PDF(options) {
    pdf = new jsPDF(options);
    const originalText = pdf.text.bind(pdf);
    pdf.text = (value, x, y, ...args) => {
      text.push({ fontSize: pdf.getFontSize(), value: Array.isArray(value) ? value.join(' ') : value, x, y, page: pdf.getCurrentPageInfo().pageNumber });
      return originalText(value, x, y, ...args);
    };
    pdf.save = filename => { savedFilename = filename; };
    return pdf;
  }
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/export-clearance-pdf.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require(name) {
    if (name === 'jspdf') return { default: PDF };
    if (name === '@/lib/date-time') return { APP_TIME_ZONE: 'Asia/Manila' };
    return require(name);
  } });
  const records = Array.from({ length: count }, (_, index) => ({
    clearance_id: index, department: `Department ${String(index + 1).padStart(2, '0')}`,
    staff: `Officer ${index + 1}`, tier: index === count - 1 ? 2 : 1, status: 'Signed', signed_at: '2026-11-04T16:30:00Z', ...recordOverrides,
  }));
  const result = exports.exportClearancePDF({
    studentProfile: { student_id: '2024-000123', student_name: 'Alexandra Reyes Santos', course_name: 'BS Information Technology', year: 2, semester: 1, section_number: 1, ...profileOverrides }, records,
  });
  return { pdf, text, result, savedFilename };
}

test('clearance PDF prints two matching copies with only the requested fields', () => {
  const h = exportPdf();
  assert.equal(h.pdf.getNumberOfPages(), 1);
  assert.equal(h.result.success, true);
  assert.equal(h.savedFilename, h.result.filename);
  for (const value of ['STUDENT ID', 'STUDENT FULL NAME', 'COURSE / PROGRAM', 'ACADEMIC YEAR', 'TERM', 'STUDENT SIGNATURE', 'DATE SIGNED', 'DEPARTMENT', 'CLEARED BY (NAME/DESIGNATION) DATE', 'RECEIVED BY:', 'ALEXANDRA REYES SANTOS', '2024-000123', 'BS Information Technology']) {
    assert.equal(h.text.filter(item => item.value === value).length, 2, value);
  }
  assert.equal(h.text.filter(item => item.value === "STUDENT'S COPY").length, 1);
  assert.equal(h.text.filter(item => item.value === "SCHOOL'S COPY").length, 1);
  assert.ok(!h.text.some(item => /OFFICIALLY CLEARED|ACCOUNTABILITY|REMARKS|VERIFICATION|STATUS|MIDDLE INITIAL/.test(item.value) && item.value !== 'DATE SIGNED'));
  // Year level must never be presented as an academic calendar year.
  assert.ok(!h.text.some(item => item.value.includes('2-3')));
});

test('long department lists use continuation sheets without losing either copy', () => {
  const h = exportPdf(35);
  assert.ok(h.pdf.getNumberOfPages() > 1);
  for (let index = 1; index < 35; index++) {
    assert.equal(h.text.filter(item => item.value === `DEPARTMENT ${String(index).padStart(2, '0')}`).length, 2);
    assert.equal(h.text.filter(item => item.value === `OFFICER ${index}`).length, 2);
  }
  assert.equal(h.text.filter(item => item.value === 'DEPARTMENT 35').length, 0);
  assert.equal(h.text.filter(item => item.value === 'OFFICER 35').length, h.pdf.getNumberOfPages() * 2);
  const half = 148.5;
  const receivers = h.text.filter(item => item.value === 'RECEIVED BY:');
  for (let page = 1; page <= h.pdf.getNumberOfPages(); page++) {
    const labels = receivers.filter(item => item.page === page);
    assert.equal(labels.length, 2);
    assert.ok(labels[0].y < half && labels[1].y > half && labels[1].y < 297);
    const departments = h.text.filter(item => item.page === page && /^DEPARTMENT \d/.test(item.value) && item.value !== 'DEPARTMENT 35');
    assert.ok(departments.every(item => item.y < labels[0].y || (item.y > half && item.y < labels[1].y)));
  }
});

test('missing enrollment fields remain blank rather than inventing a section or term', () => {
  const h = exportPdf(0, { year: null, semester: null, section_number: null });
  assert.equal(h.pdf.getNumberOfPages(), 1);
  assert.ok(!h.text.some(item => /Regular|First Semester|Undergraduate|undefined|null/.test(item.value)));
});


test('signed stamps use the actual Manila signing date and sit below the final printed name', () => {
  const h = exportPdf();
  assert.equal(h.text.filter(item => item.value === 'SIGNED ON').length, 10);
  assert.equal(h.text.filter(item => item.value === 'NOV 05 2026').length, 10);
  assert.equal(h.text.filter(item => item.value === 'DEPARTMENT 04').length, 0);
  const receiverNames = h.text.filter(item => item.value === 'OFFICER 4');
  assert.equal(receiverNames.length, 2);
  for (const name of receiverNames) {
    assert.ok(h.text.some(item => item.value === 'SIGNED ON' && item.page === name.page && item.y > name.y && item.y - name.y < 12));
  }
});

test('pending or undated records never receive a fabricated signed stamp', () => {
  for (const overrides of [{ status: 'Pending' }, { signed_at: null }, { signed_at: 'invalid' }]) {
    const h = exportPdf(4, {}, overrides);
    assert.equal(h.text.filter(item => item.value === 'SIGNED ON').length, 0);
  }
});


test('received-by label aligns with the officer name and omits the department', () => {
  const h = exportPdf();
  const names = h.text.filter(item => item.value === 'OFFICER 4');
  for (const name of names) {
    assert.ok(h.text.some(item => item.value === 'RECEIVED BY:' && item.page === name.page && item.y === name.y));
    assert.ok(!h.text.some(item => item.value === 'DEPARTMENT 04'));
  }
});


test('date-signed field carries the final-phase date stamp and received-by text uses the increased font size', () => {
  const h = exportPdf();
  for (const top of [3, 150.5]) {
    const dateStamp = h.text.find(item => item.value === 'NOV 05 2026' && Math.abs(item.y - (top + 54.5)) < 0.01);
    assert.ok(dateStamp);
    assert.ok(dateStamp.x > 142.2 && dateStamp.x < 198);
  }
  for (const item of h.text.filter(item => item.value === 'RECEIVED BY:' || item.value === 'OFFICER 4')) {
    assert.equal(item.fontSize, 9);
  }
});

test('PDF academic year and term come from the saved clearance period, not current profile values', () => {
  const h = exportPdf(4, { academic_year: '2027-2028', semester: 2 }, { academic_year: '2026-2027', term: 1, period_id: 1 });
  assert.equal(h.text.filter(item => item.value === '2026-2027').length, 2);
  assert.equal(h.text.filter(item => item.value === '2027-2028').length, 0);
  assert.match(h.savedFilename, /2026-2027_Term_1/);
});

test('staff clearance uses one identity row and omits student and enrollment fields', () => {
  const h = exportPdf(4, { course_name: 'Staff Clearance', academic_year: '2027-2028', semester: 2 });
  assert.equal(h.pdf.getNumberOfPages(), 1);
  for (const value of ['STAFF FULL NAME', 'SIGNATURE', 'DATE SIGNED', 'ALEXANDRA REYES SANTOS']) {
    assert.equal(h.text.filter(item => item.value === value).length, 2, value);
  }
  for (const value of ['STUDENT ID', 'STUDENT FULL NAME', 'STUDENT SIGNATURE', 'ACADEMIC YEAR', 'TERM', 'COURSE / PROGRAM', '2024-000123', '2027-2028', 'Staff Clearance']) {
    assert.ok(!h.text.some(item => item.value === value), value);
  }
  assert.equal(h.text.filter(item => item.value === "STAFF'S COPY").length, 1);
  assert.equal(h.text.filter(item => item.value === "SCHOOL'S COPY").length, 1);
  for (const top of [3, 150.5]) {
    const labels = ['STAFF FULL NAME', 'SIGNATURE', 'DATE SIGNED'].map(value =>
      h.text.find(item => item.value === value && Math.abs(item.y - (top + 23.5)) < 0.01));
    assert.ok(labels.every(Boolean), 'all staff fields share one row');
    assert.ok(h.text.some(item => item.value === 'NOV 05 2026' && Math.abs(item.y - (top + 30.5)) < 0.01));
  }
});
