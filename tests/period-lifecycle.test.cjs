const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

async function fixture() {
  const db = new PGlite();
  await db.exec(fs.readFileSync('tests/fixtures/academic-period-baseline.sql','utf8'));
  await db.exec("CREATE ROLE anon; ALTER TABLE users ADD COLUMN email text; UPDATE users SET email=user_id||'@school.test'; CREATE TABLE notifications(notif_id serial primary key,title text); INSERT INTO notifications(title) VALUES('Old notice')");
  for (const table of ['users','students','staffs','courses','course_sections','clearance_departments']) {
    await db.exec(`GRANT SELECT ON ${table} TO authenticated; CREATE POLICY fixture_directory_read ON ${table} FOR SELECT TO authenticated USING(true)`);
  }
  await db.exec(fs.readFileSync('supabase/migrations/20261105000000_academic_periods.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261105000002_period_lifecycle.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261105000003_safe_term_notification_cleanup.sql','utf8'));
  await db.exec('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated');
  await db.exec(fs.readFileSync('supabase/migrations/20261106000000_unified_staff_enrollments.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261106000001_carryover_directory_details.sql','utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261106000002_remove_current_participation.sql','utf8'));
  return db;
}
const config = overrides => ({ start_year:2026,end_year:2027,term:2,source_period_id:1,student_ids:['student'],staff_ids:['officer'],carry_templates:true,opens_at:null,...overrides });
async function save(db, body) { return (await db.query('SELECT save_clearance_period($1::jsonb) data',[JSON.stringify(body)])).rows[0].data; }
async function access(db, uid, roles) {
  await db.query("SELECT set_config('request.test_uid',$1,false),set_config('request.test_jwt',$2,false)",[uid,JSON.stringify({user_metadata:{custom_claims:{roles}}})]);
  return (await db.query('SELECT period_access() data')).rows[0].data;
}

test('preparing, opening, ending and selected carryover preserve accounts and history', async t => {
 const db=await fixture();t.after(()=>db.close());
 const scalar=async sql=>Object.values((await db.query(sql)).rows[0])[0];
 assert.equal(await scalar("SELECT state FROM academic_periods WHERE period_id=1"),'open');
 assert.equal(await scalar('SELECT count(*)::int FROM current_staffs'),1);
 await db.exec('SELECT end_clearance_period(1)');
 assert.equal(await scalar('SELECT count(*)::int FROM notifications'),0);
 assert.equal(await scalar('SELECT count(*)::int FROM users'),2);
 assert.equal(await scalar('SELECT count(*)::int FROM clearance_tasks'),1);
 assert.equal(await scalar('SELECT count(*)::int FROM current_clearance_records'),0);
 const prep=await save(db,config());
 assert.equal(prep.state,'preparing');
 assert.equal(await scalar('SELECT count(*)::int FROM current_enrollments'),1);
 assert.equal(await scalar('SELECT count(*)::int FROM current_staffs'),1);
 assert.equal(await scalar("SELECT count(*)::int FROM current_clearance_records WHERE status='Pending'"),2);
 assert.equal(await scalar("SELECT count(*)::int FROM staffs WHERE staff_id='officer'"),1);
 const studentAccess=await access(db,'11111111-1111-1111-1111-111111111111',['Client']);
 assert.equal(studentAccess.client_enrolled,true);assert.equal(studentAccess.is_open,false);
 await db.exec('SET ROLE authenticated');
 assert.equal(await scalar('SELECT count(*)::int FROM current_clearance_records'),0);
 await db.exec('RESET ROLE');
 const officerAccess=await access(db,'22222222-2222-2222-2222-222222222222',['Department']);
 assert.equal(officerAccess.officer_enrolled,true);assert.equal(officerAccess.client_enrolled,true);
 await db.exec('SET ROLE authenticated');
 assert.equal(await scalar('SELECT count(*)::int FROM current_clearance_records'),2);
 await db.exec("UPDATE current_clearance_records SET status='Signed',signed_at=now()");
 await db.exec('RESET ROLE');
 // A regular staff/client account cannot get preparation access through officer membership.
 assert.equal((await access(db,'22222222-2222-2222-2222-222222222222',['Client','Staff'])).officer_enrolled,false);
 await db.exec('SELECT start_clearance_period(2)');
 assert.equal((await access(db,'11111111-1111-1111-1111-111111111111',['Client'])).is_open,true);
 await db.exec('SET ROLE authenticated');
 assert.equal(await scalar("SELECT count(*)::int FROM current_clearance_records WHERE status='Signed'"),1);
 await db.exec('RESET ROLE');
 // Enrolled officers are also staff clients in the unified roster.
 const excluded=await access(db,'22222222-2222-2222-2222-222222222222',['Department']);
 assert.equal(excluded.client_enrolled,true);
 await db.exec("INSERT INTO notifications(title) VALUES('Preparation notice'); SELECT end_clearance_period(2)");
 assert.equal(await scalar('SELECT count(*)::int FROM notifications'),0);
 assert.equal(await scalar('SELECT count(*)::int FROM clearance_records'),4);
 await db.exec("INSERT INTO notifications(title) VALUES('Next term notice'); SELECT end_clearance_period(2)");
 assert.equal(await scalar('SELECT count(*)::int FROM notifications'),1);
 await assert.rejects(save(db,config({period_id:2})),/Only a preparing period/);
});

test('template carryover requires every referenced officer and failed saves roll back', async t=>{
 const db=await fixture();t.after(()=>db.close());
 await db.exec('SELECT end_clearance_period(1)');
 await assert.rejects(save(db,config({staff_ids:[]})),/Every assigned template officer/);
 assert.equal((await db.query('SELECT count(*)::int n FROM academic_periods')).rows[0].n,1);
 const prep=await save(db,config({staff_ids:['officer'],carry_templates:false}));
 assert.equal(prep.state,'preparing');
 assert.equal((await db.query('SELECT count(*)::int n FROM clearance_templates WHERE is_active')).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int n FROM current_staffs')).rows[0].n,1);
 assert.equal((await db.query('SELECT count(*)::int n FROM current_clearance_records')).rows[0].n,0);
 // Explicitly assigning a new template registers its officer and generates fresh staff requirements.
 await db.exec('UPDATE clearance_templates SET is_active=true WHERE template_id=2');
 assert.equal((await db.query('SELECT count(*)::int n FROM current_clearance_records')).rows[0].n,1);
});

test('scheduled client opening is enforced by database time while officers prepare and sign', async t=>{
 const db=await fixture();t.after(()=>db.close());
 await db.exec('SELECT end_clearance_period(1)');
 const prep=await save(db,config({start:true,opens_at:'2090-01-01T00:00:00Z'}));
 assert.equal(prep.state,'preparing');assert.ok(prep.start_requested_at);
 assert.equal((await access(db,'11111111-1111-1111-1111-111111111111',['Client'])).is_open,false);
 await assert.rejects(db.exec('SELECT end_clearance_period(2)'),/Only an open term/);
 await db.exec("UPDATE academic_periods SET opens_at=now()-interval '1 minute' WHERE period_id=2");
 assert.equal((await access(db,'11111111-1111-1111-1111-111111111111',['Client'])).is_open,true);
});

test('ending a term is atomic with clearing notifications',async t=>{
 const db=await fixture();t.after(()=>db.close());
 await db.exec("CREATE FUNCTION fail_notice_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Forced failure'; END $$; CREATE TRIGGER fail_notice_delete BEFORE DELETE ON notifications FOR EACH ROW EXECUTE FUNCTION fail_notice_delete()");
 await assert.rejects(db.exec('SELECT end_clearance_period(1)'),/Forced failure/);
 assert.equal((await db.query('SELECT state FROM academic_periods WHERE period_id=1')).rows[0].state,'open');
 assert.equal((await db.query('SELECT count(*)::int n FROM notifications')).rows[0].n,1);
 await assert.rejects(db.exec('SELECT activate_academic_period(1,true)'),/Manage A.Y./);
});

test('client submission and sign-off permissions follow state and department role',async t=>{
 const db=await fixture();t.after(()=>db.close());
 await db.exec('SELECT end_clearance_period(1)');
 await save(db,config({staff_ids:['officer']}));
 await db.exec("INSERT INTO clearance_tasks(clearance_id,status) SELECT clearance_id,'Pending' FROM clearance_records WHERE user_id='student' AND period_id=2");
 await access(db,'11111111-1111-1111-1111-111111111111',['Client']);
 await db.exec('SET ROLE authenticated');
 assert.equal((await db.query('SELECT count(*)::int n FROM current_clearance_tasks')).rows[0].n,0);
 await db.exec('RESET ROLE; SELECT start_clearance_period(2); SET ROLE authenticated');
 await db.exec("UPDATE current_clearance_tasks SET status='Submitted'");
 assert.equal((await db.query("SELECT status FROM current_clearance_tasks")).rows[0].status,'Submitted');
 await assert.rejects(db.exec("UPDATE current_clearance_tasks SET status='Cleared'"),/row-level security/);
 await db.exec('RESET ROLE');
 await access(db,'22222222-2222-2222-2222-222222222222',['Staff','Client']);
 await db.exec('SET ROLE authenticated');
 const result=await db.query("UPDATE current_clearance_records SET status='Signed' WHERE user_id='officer'");
 assert.equal(result.affectedRows,0);
 await db.exec('RESET ROLE');
 assert.equal((await db.query("SELECT status FROM current_clearance_records WHERE user_id='officer'")).rows[0].status,'Pending');
});

 test('End Term notification cleanup has an explicit predicate for Supabase safeupdate', async t => {
 const db=await fixture();t.after(()=>db.close());
 const [{definition}]=(await db.query("SELECT pg_get_functiondef('public.end_clearance_period(integer)'::regprocedure) definition")).rows;
 assert.match(definition,/DELETE FROM public\.notifications WHERE notif_id IS NOT NULL/i);
 await db.exec('SELECT end_clearance_period(1)');
 assert.equal((await db.query('SELECT count(*)::int n FROM notifications')).rows[0].n,0);
 });

test('unified staff membership is required even with an OAuth Department role', async t => {
 const db=await fixture();t.after(()=>db.close());
 assert.equal((await db.query("SELECT to_regclass('public.period_department_staff') old_table")).rows[0].old_table,null);
 await db.exec('SELECT end_clearance_period(1)');
 await save(db,config({staff_ids:[],carry_templates:false}));
 const denied=await access(db,'22222222-2222-2222-2222-222222222222',['Department']);
 assert.equal(denied.officer_enrolled,false);assert.equal(denied.client_enrolled,false);
 await db.exec('SET ROLE authenticated');
 assert.equal((await db.query('SELECT count(*)::int n FROM current_clearance_records')).rows[0].n,0);
 await assert.rejects(db.query('SELECT * FROM admin_course_template_counts()'),/permission denied/);
 await db.exec('RESET ROLE');
 // Changing a template must not silently enroll an excluded signatory.
 await db.exec('UPDATE clearance_templates SET is_active=true WHERE template_id=2');
 assert.equal((await access(db,'22222222-2222-2222-2222-222222222222',['Department'])).officer_enrolled,false);
});

test('carryover directory includes prior-term sections and clearance progress', async t => {
 const db=await fixture();t.after(()=>db.close());
 await db.exec('SELECT end_clearance_period(1)');
 const [{data}]=(await db.query('SELECT period_carry_candidates() data')).rows;
 assert.equal(data.students[0].course_name,'BSIT');assert.equal(data.students[0].course_year,2);
 assert.equal(data.students[0].section_number,1);assert.equal(data.students[0].departments.length,1);
 assert.equal(data.students[0].departments[0].status,'Signed');assert.equal(data.staff.length,1);
 assert.equal(data.staff[0].departments.length,1);
});

test('current-only staff can be deleted after their enrollment and clearance references', async t => {
 const db=await fixture();t.after(()=>db.close());
 await db.exec("INSERT INTO users(user_id,email) VALUES('newstaff','new@school.test'); INSERT INTO staffs(staff_id,staff_name) VALUES('newstaff','New Staff')");
 assert.equal((await db.query("SELECT count(*)::int n FROM staff_enrollments WHERE staff_id='newstaff'")).rows[0].n,1);
 await assert.rejects(db.query("DELETE FROM staffs WHERE staff_id='newstaff'"),/foreign key constraint/);
 await db.exec("BEGIN; DELETE FROM staff_enrollments WHERE staff_id='newstaff'; DELETE FROM clearance_records WHERE user_id='newstaff'; DELETE FROM staffs WHERE staff_id='newstaff'; DELETE FROM users WHERE user_id='newstaff'; COMMIT;");
 assert.equal((await db.query("SELECT count(*)::int n FROM users WHERE user_id='newstaff'")).rows[0].n,0);
 assert.equal((await db.query("SELECT count(*)::int n FROM staffs WHERE staff_id='officer'")).rows[0].n,1);
});

test('disabled participants keep work and history, lose access, and can be re-enrolled', async t => {
 const db=await fixture();t.after(()=>db.close());
 const [{before}]=(await db.query('SELECT jsonb_agg(r ORDER BY clearance_id) before FROM clearance_records r')).rows;
 await db.exec("UPDATE enrollments SET is_active=false WHERE student_id='student' AND period_id=1; UPDATE staff_enrollments SET is_active=false WHERE staff_id='officer' AND period_id=1");
 assert.equal((await access(db,'11111111-1111-1111-1111-111111111111',['Client'])).client_enrolled,false);
 const officer=await access(db,'22222222-2222-2222-2222-222222222222',['Department']);assert.equal(officer.client_enrolled,false);assert.equal(officer.officer_enrolled,false);
 assert.equal((await db.query('SELECT count(*)::int n FROM current_clearance_records')).rows[0].n,0);
 assert.deepEqual((await db.query('SELECT jsonb_agg(r ORDER BY clearance_id) after FROM clearance_records r')).rows[0].after,before);
 assert.equal((await db.query('SELECT count(*)::int n FROM clearance_tasks')).rows[0].n,1);
 await assert.rejects(db.query("UPDATE clearance_records SET status='Signed' WHERE user_id='officer'"),/no longer participating/);
 await assert.rejects(db.query("UPDATE clearance_tasks SET status='Submitted'"),/no longer participating/);
 await db.exec('SELECT end_clearance_period(1)');
 const [{data}]=(await db.query('SELECT period_carry_candidates() data')).rows;assert.equal(data.students.length,0);assert.equal(data.staff.length,0);
 await assert.rejects(save(db,config()),/source roster/);
 await save(db,config({student_ids:[],staff_ids:[],carry_templates:false}));
 // Re-enrollment in the new term is explicit, and old work remains untouched.
 await db.exec("INSERT INTO staff_enrollments(period_id,staff_id) VALUES(2,'officer')");
 assert.equal((await access(db,'22222222-2222-2222-2222-222222222222',['Department'])).officer_enrolled,true);
 assert.equal((await db.query("SELECT count(*)::int n FROM staff_enrollments WHERE period_id=1 AND NOT is_active")).rows[0].n,1);
});

test('staff re-enrollment reactivates the same membership without resetting signatures', async t => {
 const db=await fixture();t.after(()=>db.close());
 await db.exec("CREATE FUNCTION enroll_staff_identity(p_email text,p_name text,p_staff_id text) RETURNS text LANGUAGE sql AS $$ SELECT p_staff_id $$; UPDATE clearance_records SET status='Signed',signed_at=now() WHERE user_id='officer'; UPDATE staff_enrollments SET is_active=false WHERE staff_id='officer' AND period_id=1;");
 await db.query("SELECT enroll_staff_for_period('officer@school.test','Officer','officer',1)");
 const [{n}]=(await db.query("SELECT count(*)::int n FROM staff_enrollments WHERE staff_id='officer' AND period_id=1 AND is_active")).rows;assert.equal(n,1);
 assert.equal((await db.query("SELECT status FROM clearance_records WHERE user_id='officer' AND period_id=1")).rows[0].status,'Signed');
});
