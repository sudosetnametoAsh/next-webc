const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const enrollment = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/enrollment.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: enrollment });
const { parseEnrollmentName, suggestEnrollmentEmail, parseEnrollmentRoster, enrollmentCsvTemplate, resolveEnrollmentEmail, enrollmentEmailLocalPart, isEmailLocalPart } = enrollment;

test('comma-delimited names preserve compound names and do not guess old name order', () => {
  assert.equal(parseEnrollmentName(' Dela  Cruz ,  Juan Miguel Jr. ').fullName, 'Dela Cruz, Juan Miguel Jr.');
  for (const value of ['Juan Dela Cruz', 'Dela Cruz,', ', Juan', 'Dela, Cruz, Juan', '123, 456']) assert.equal(parseEnrollmentName(value), null);
});
test('email suggestions use the entire compound surname and the last six student ID digits', () => {
  assert.equal(suggestEnrollmentEmail('student', 'Dela Cruz, Juan', '02000123456'), 'delacruz.123456');
  assert.equal(suggestEnrollmentEmail('student', 'Santos, Maria', '02000000001'), 'santos.000001');
  assert.equal(suggestEnrollmentEmail('staff', "Peña-O'Neil, José Luis"), 'joseluis.penaoneil');
  for (const [name, id] of [['Dela Cruz, Juan', '02000'], ['Juan Dela Cruz', '02000123456'], ['', '02000123456']]) assert.equal(suggestEnrollmentEmail('student', name, id), '');
});
test('email normalization never duplicates the domain and preserves supplied full roster addresses', () => {
  assert.equal(resolveEnrollmentEmail(' DELACRUZ.123456 '), 'delacruz.123456@lucena.sti.edu.ph');
  assert.equal(resolveEnrollmentEmail('Person@other.edu.ph'), 'person@other.edu.ph');
  assert.equal(enrollmentEmailLocalPart('Juan.Delacruz@LUCENA.STI.EDU.PH'), 'Juan.Delacruz');
  for (const value of ['a@b.com', '.name', 'name.', 'a..b', 'name with space']) assert.equal(isEmailLocalPart(value), false);
});
test('student and staff templates round-trip without shifting columns or dropping leading zeros', () => {
  for (const type of ['student', 'staff']) {
    const rows = parseEnrollmentRoster(enrollmentCsvTemplate(type), type);
    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.isValid));
    assert.equal(rows[0].name, 'Dela Cruz, Juan');
    assert.match(rows[0].email, /@lucena\.sti\.edu\.ph$/);
    if (type === 'student') { assert.equal(rows[0].id, '02000123456'); assert.equal(rows[0].course, 'BSIT'); }
  }
});
test('CSV quotes, apostrophes, escaped quotes, TSV and JSON parse consistently', () => {
  const csv = parseEnrollmentRoster('name,email\n"O\'Neil, Sean",sean.oneil\n"Dela ""Cruz"", Juan",juan.delacruz', 'staff');
  assert.ok(csv.every((row) => row.isValid));
  assert.equal(csv[0].name, "O'Neil, Sean");
  assert.equal(csv[1].name, 'Dela "Cruz", Juan');
  assert.equal(parseEnrollmentRoster('Dela Cruz, Juan\tjuan.delacruz', 'staff')[0].name, 'Dela Cruz, Juan');
  assert.equal(parseEnrollmentRoster('"Dela Cruz, Juan",juan.delacruz', 'staff')[0].isValid, true);
  assert.equal(parseEnrollmentRoster('EMP001,"Dela Cruz, Juan",juan.delacruz', 'staff')[0].id, 'EMP001');
  const json = parseEnrollmentRoster(JSON.stringify([{ student_id: '02000123456', name: 'Dela Cruz, Juan', email: 'delacruz.123456' }]), 'student');
  assert.equal(json[0].email, 'delacruz.123456@lucena.sti.edu.ph');
  assert.equal(json[0].isValid, true);
});
test('invalid inputs are rejected instead of silently rearranged or misaligned', () => {
  for (const [raw, type] of [['02000123456,Juan Dela Cruz,test@lucena.sti.edu.ph', 'student'], ['name,email\nDela Cruz,Juan,test@lucena.sti.edu.ph', 'staff'], ['name,email\n"Dela Cruz, Juan",bad@@email', 'staff']]) {
    assert.equal(parseEnrollmentRoster(raw, type)[0].isValid, false);
  }
  assert.throws(() => parseEnrollmentRoster('name,email\n"Dela Cruz, Juan,email', 'staff'), /quote/i);
  assert.throws(() => parseEnrollmentRoster('{"name":"Dela Cruz, Juan"}', 'staff'), /array/);
  assert.throws(() => parseEnrollmentRoster('[invalid]', 'staff'), /Invalid JSON/);
});
test('large rosters parse all records without depending on the preview limit', () => {
  const records = Array.from({ length: 5000 }, (_, i) => `02000${String(i).padStart(6, '0')},"Dela Cruz, Juan",delacruz.${String(i).padStart(6, '0')},BSIT,1,1,1`);
  const rows = parseEnrollmentRoster('student_id,name,email,course_name,year,semester,section_number\n' + records.join('\n'), 'student');
  assert.equal(rows.length, 5000);
  assert.ok(rows.every((row) => row.isValid));
});
