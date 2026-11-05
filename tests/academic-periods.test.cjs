const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

const migration = fs.readFileSync('supabase/migrations/20261105000000_academic_periods.sql', 'utf8');
const baseline = fs.readFileSync('tests/fixtures/academic-period-baseline.sql', 'utf8');

test('academic-period migration, isolation, rollover and saved-document authorization', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(baseline);
  await db.exec(migration);
  const scalar = async sql => Object.values((await db.query(sql)).rows[0])[0];

  await t.test('backfills the administrator-confirmed period without losing approvals or tasks', async () => {
    const period = (await db.query('SELECT * FROM academic_periods WHERE is_active')).rows[0];
    assert.equal(period.start_year, 2026);
    assert.equal(period.end_year, 2027);
    assert.equal(period.term, 1);
    assert.equal(await scalar('SELECT count(*)::int FROM current_clearance_records'), 2);
    assert.equal(await scalar("SELECT count(*)::int FROM clearance_records WHERE status='Signed'"), 2);
    assert.equal(await scalar('SELECT count(*)::int FROM clearance_tasks'), 1);
    assert.equal(await scalar("SELECT document_snapshot->>'academic_year' FROM clearance_records LIMIT 1"), '2026-2027');
  });
  await t.test('rejects duplicate periods, invalid years/dates and a second active period', async () => {
    await assert.rejects(db.exec('INSERT INTO academic_periods(start_year,end_year,term) VALUES(2026,2027,1)'), /unique/);
    await assert.rejects(db.exec('INSERT INTO academic_periods(start_year,end_year,term) VALUES(2028,2030,1)'), /check/);
    await assert.rejects(db.exec("INSERT INTO academic_periods(start_year,end_year,term,starts_on,ends_on) VALUES(2028,2029,1,'2028-11-01','2028-10-01')"), /check/);
    await assert.rejects(db.exec('INSERT INTO academic_periods(start_year,end_year,term,is_active) VALUES(2028,2029,1,true)'), /unique/);
  });
  await t.test('activation is atomic and optionally carries the current roster into fresh clearances', async () => {
    await db.exec('INSERT INTO academic_periods(start_year,end_year,term) VALUES(2026,2027,2)');
    const id = await scalar('SELECT period_id FROM academic_periods WHERE term=2');
    await db.query('SELECT activate_academic_period($1,true)', [id]);
    assert.equal(await scalar('SELECT count(*)::int FROM academic_periods WHERE is_active'), 1);
    assert.equal(await scalar('SELECT count(*)::int FROM current_clearance_records'), 2);
    assert.equal(await scalar("SELECT count(*)::int FROM current_clearance_records WHERE status='Pending' AND signed_at IS NULL"), 2);
    assert.equal(await scalar('SELECT count(*)::int FROM clearance_records'), 4);
    assert.equal(await scalar('SELECT count(*)::int FROM current_enrollments'), 1);
    assert.equal(await scalar("SELECT count(*)::int FROM clearance_tasks WHERE status='Cleared'"), 1);
    // Retrying an activation never creates duplicate requirements.
    await db.query('SELECT activate_academic_period($1,true)', [id]);
    assert.equal(await scalar('SELECT count(*)::int FROM clearance_records'), 4);
  });
  await t.test('archived enrollments, approvals and submissions are immutable even for service writers', async () => {
    await assert.rejects(db.exec("UPDATE clearance_records SET status='Pending' WHERE clearance_id=1"), /read-only/);
    await assert.rejects(db.exec('DELETE FROM clearance_records WHERE clearance_id=1'), /read-only/);
    await assert.rejects(db.exec('DELETE FROM clearance_tasks WHERE clearance_id=1'), /read-only/);
    await assert.rejects(db.exec('DELETE FROM enrollments WHERE period_id=1'), /read-only/);
    await assert.rejects(db.exec('DELETE FROM academic_periods WHERE period_id=1'), /foreign key/);
  });
  await t.test('new-period template and profile edits do not change old document snapshots', async () => {
    await db.exec("UPDATE staffs SET staff_name='Replacement Officer' WHERE staff_id='officer'; UPDATE clearance_templates SET tier=3 WHERE template_id=1; UPDATE students SET student_name='Updated Name' WHERE student_id='student'");
    const snapshot = (await db.query('SELECT document_snapshot FROM clearance_records WHERE clearance_id=1')).rows[0].document_snapshot;
    assert.equal(snapshot.staff, 'Officer Name');
    assert.equal(snapshot.student_name, 'Student Name');
    assert.equal(snapshot.tier, 1);
    assert.equal(snapshot.academic_year, '2026-2027');
    assert.equal(snapshot.semester, 1);
  });
  await t.test('history permits the owner and rejects another user', async () => {
    await db.exec("SELECT set_config('request.test_uid','11111111-1111-1111-1111-111111111111',false)");
    const history = await scalar("SELECT clearance_document_history('student')");
    assert.equal(history.length, 2);
    assert.equal(history.find(period => period.term === 1).records[0].snapshot.student_name, 'Student Name');
    await assert.rejects(db.exec("SELECT clearance_document_history('officer')"), /Access denied/);
    await db.exec("SELECT set_config('request.test_uid','',false)");
  });
  await t.test('no-roster activation keeps student history without automatically enrolling students', async () => {
    await db.exec('INSERT INTO academic_periods(start_year,end_year,term) VALUES(2027,2028,1)');
    const id = await scalar('SELECT period_id FROM academic_periods WHERE start_year=2027');
    await db.query('SELECT activate_academic_period($1,false)', [id]);
    assert.equal(await scalar('SELECT count(*)::int FROM current_enrollments'), 0);
    assert.equal(await scalar("SELECT count(*)::int FROM current_clearance_records WHERE user_id='student'"), 0);
    assert.equal(await scalar("SELECT count(*)::int FROM current_clearance_records WHERE user_id='officer'"), 1);
    assert.equal(await scalar('SELECT count(*)::int FROM clearance_records'), 5);
    await assert.rejects(db.exec('SELECT activate_academic_period(1,false)'), /cannot be reactivated/);
  });
  await t.test('an enrollment creates only current-period records and permits enrollment across periods', async () => {
    await db.exec("INSERT INTO enrollments(student_id,section_id) VALUES('student',1)");
    assert.equal(await scalar("SELECT count(*)::int FROM enrollments WHERE student_id='student'"), 3);
    assert.equal(await scalar("SELECT count(*)::int FROM current_clearance_records WHERE user_id='student'"), 1);
    await assert.rejects(db.exec("INSERT INTO enrollments(student_id,section_id) VALUES('student',1)"), /unique/);
  });
  await t.test('a failed activation leaves the previous active period intact', async () => {
    const oldId = await scalar('SELECT active_academic_period_id()');
    await assert.rejects(db.exec('SELECT activate_academic_period(987654,false)'), /not found/);
    assert.equal(await scalar('SELECT active_academic_period_id()'), oldId);
  });
  await t.test('restrictive RLS hides archived records even through physical tables', async () => {
    await db.exec('SET ROLE authenticated');
    try {
      assert.equal(await scalar('SELECT count(*)::int FROM clearance_records'), 2);
      assert.equal(await scalar('SELECT count(*)::int FROM enrollments'), 1);
      assert.equal(await scalar('SELECT count(*)::int FROM clearance_tasks'), 0);
    } finally { await db.exec('RESET ROLE'); }
  });
  await t.test('new staff and new templates receive only current-period clearances', async () => {
    await db.exec("INSERT INTO users VALUES('newstaff','33333333-3333-3333-3333-333333333333'); INSERT INTO staffs VALUES('newstaff','New Staff')");
    assert.equal(await scalar("SELECT count(*)::int FROM current_clearance_records WHERE user_id='newstaff'"), 1);
    assert.equal(await scalar("SELECT count(*)::int FROM clearance_records WHERE user_id='newstaff' AND period_id<>active_academic_period_id()"), 0);
    await db.exec("INSERT INTO clearance_departments VALUES(3,'Library'); INSERT INTO clearance_templates(course_id,dept_id,staff_id,tier) VALUES(1,3,'officer',2)");
    assert.equal(await scalar("SELECT count(*)::int FROM current_clearance_records WHERE user_id='student'"), 2);
    assert.equal(await scalar('SELECT count(*)::int FROM clearance_records WHERE template_id=3 AND period_id<>active_academic_period_id()'), 0);
  });
  await t.test('non-service callers cannot execute rollover', async () => {
    await db.exec("SELECT set_config('request.test_role','authenticated',false)");
    await assert.rejects(db.exec('SELECT activate_academic_period(1,false)'), /Administrator service required/);
    await db.exec("SELECT set_config('request.test_role','service_role',false)");
  });
});

test('migration refuses conflicting legacy enrollments without discarding them', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(baseline);
  await db.exec("INSERT INTO enrollments(student_id,section_id) VALUES('student',2)");
  await assert.rejects(db.exec(migration), /Multiple sections/);
  await db.exec('ROLLBACK');
  assert.equal((await db.query('SELECT count(*)::int n FROM enrollments')).rows[0].n, 2);
});
