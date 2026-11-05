const assert=require('node:assert/strict');const {test}=require('node:test');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
const migration=fs.readFileSync('supabase/migrations/20261104000002_backfill_staff_weekly_schedule.sql','utf8');
test('backfill preserves configured schedules and copies only eligible legacy hours',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec("CREATE TABLE staffs(staff_id text,time_in time,time_out time,weekly_schedule jsonb); INSERT INTO staffs VALUES('legacy','08:00','17:00',NULL),('saved','08:00','17:00','{\"custom\":true}'),('empty',NULL,NULL,NULL);");
 await db.exec(migration);await db.exec(migration);
 const rows=(await db.query('SELECT * FROM staffs ORDER BY staff_id')).rows;
 assert.equal(rows[0].weekly_schedule,null);assert.deepEqual(rows[1].weekly_schedule.mon,{active:true,time_in:'08:00',time_out:'17:00'});assert.equal(rows[1].weekly_schedule.sun.active,false);assert.deepEqual(rows[2].weekly_schedule,{custom:true});
});
test('already-cleaned cloud schema succeeds without changing any schedules',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec("CREATE TABLE staffs(staff_id text,weekly_schedule jsonb); INSERT INTO staffs VALUES('empty',NULL),('saved','{\"custom\":true}')");
 const before=(await db.query('SELECT * FROM staffs ORDER BY staff_id')).rows;await db.exec(migration);assert.deepEqual((await db.query('SELECT * FROM staffs ORDER BY staff_id')).rows,before);
});
