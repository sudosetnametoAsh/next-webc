// Real prepared delivery SQL and RLS in an isolated schema copy; source DB is read-only.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { PgDialect } = require('drizzle-orm/pg-core');
const container = process.env.NOTIFICATION_TEST_CONTAINER;
if (!container || !/^supabase_db_[a-zA-Z0-9_-]+$/.test(container)) throw Error('Set NOTIFICATION_TEST_CONTAINER to the local Supabase DB container.');
const database = 'codex_template_notifications_' + process.pid;
function docker(args, input) {
  const command = args.includes('supabase_admin') ? ['sh','-c','export PGPASSWORD="$POSTGRES_PASSWORD"; exec "$@"','--',...args] : args;
  return execFileSync('docker',['exec','-i',container,...command],{input,encoding:'utf8',maxBuffer:32*1024*1024,stdio:['pipe','pipe','pipe']});
}
const psql = ['psql','-X','-U','supabase_admin','-d',database,'-v','ON_ERROR_STOP=1'];
const execute = (sql) => docker(psql,sql);
const scalar = (sql) => docker([...psql,'-At','-c',sql]).trim().split('\n').at(-1);
let query, writes = 0, created = false;
const exportsForService = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/services/template-notifications.ts','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
}).outputText,{exports:exportsForService,require(name){
  if(name==='drizzle-orm')return require(name);
  if(name==='@/lib/db')return {db:{execute:async(value)=>{query=value;writes++;}}};
  throw Error(name);
}});
async function publish(ids) {
  const before = writes;
  await exportsForService.notifyTemplatePublication(ids);
  if (before === writes) return;
  const bound = new PgDialect().sqlToQuery(query);
  assert.ok(bound.params.every((value)=>ids.includes(value)));
  execute(`PREPARE publication AS ${bound.sql}; EXECUTE publication(${bound.params.join(',')});`);
}
(async()=>{
  try {
    const schema = docker(['pg_dump','-U','postgres','-d','postgres','--schema-only','--no-owner','--no-privileges']);
    docker(['createdb','-U','postgres',database]); created=true;
    execute(schema);
    // --no-privileges omits the source grants; restore the permissions under test.
    execute('GRANT SELECT, UPDATE ON public.notifications TO anon, authenticated;');
    execute(`INSERT INTO public.users(user_id,email) VALUES
      ('nt-staff','nts@example.test'),('nt-client-a','nta@example.test'),('nt-client-b','ntb@example.test'),
      ('nt-client-c','ntc@example.test'),('nt-client-d','ntd@example.test'),('nt-client-e','nte@example.test');
      INSERT INTO public.staffs(staff_id,staff_name) VALUES('nt-staff','Officer');
      INSERT INTO public.students(student_id,student_name) SELECT user_id,user_id FROM public.users WHERE user_id LIKE 'nt-client-%';
      INSERT INTO public.courses(course_id,course_name) VALUES(910001,'A'),(910002,'B'),(910003,'Inactive'),(910004,'No template');
      INSERT INTO public.clearance_departments(dept_id,dept_name) VALUES(910001,'Clinic test'),(910002,'Library test');
      INSERT INTO public.clearance_templates(course_id,dept_id,staff_id,is_active) VALUES
        (910001,910001,'nt-staff',true),(910001,910002,'nt-staff',true),
        (910002,910001,'nt-staff',true),(910003,910001,'nt-staff',false);
      INSERT INTO public.course_sections(section_id,course_id,year,semester,section_number) VALUES
        (910001,910001,1,1,1),(910002,910001,1,1,2),(910003,910002,1,1,1),
        (910004,910003,1,1,1),(910005,910004,1,1,1);
      INSERT INTO public.enrollments(student_id,section_id) VALUES('nt-client-a',910001),('nt-client-a',910002),
        ('nt-client-b',910003),('nt-client-c',910004),('nt-client-d',910005);`);
    await publish([]);
    assert.equal(writes,0);
    await publish([910001,910001]);
    assert.equal(scalar('SELECT string_agg(user_id,\',\') FROM public.notifications'),'nt-client-a');
    assert.equal(scalar('SELECT count(*) FROM public.notifications WHERE user_id IS NULL OR is_read'),'0');
    execute('DELETE FROM public.notifications;');
    await publish([910001,910002,910003,910004]);
    assert.equal(scalar(`SELECT string_agg(user_id,',' ORDER BY user_id) FROM public.notifications`),'nt-client-a,nt-client-b');
    execute(`DELETE FROM public.notifications; INSERT INTO public.enrollments(student_id,section_id) VALUES('nt-client-a',910003);`);
    await publish([910001,910002]);
    assert.equal(scalar(`SELECT count(*) FROM public.notifications WHERE user_id='nt-client-a'`),'1');
    assert.equal(scalar(`SELECT metadata->'courseIds' FROM public.notifications WHERE user_id='nt-client-a'`),'[910001, 910002]');
    execute(`UPDATE public.notifications SET is_read=true WHERE user_id='nt-client-a';`);
    assert.equal(scalar(`SELECT is_read FROM public.notifications WHERE user_id='nt-client-b'`),'f');
    execute(`DELETE FROM public.notifications;
      INSERT INTO public.users(user_id,email) SELECT 'nt-'||g,'nt-'||g||'@example.test' FROM generate_series(1,1000) g;
      INSERT INTO public.students(student_id,student_name) SELECT 'nt-'||g,'Student '||g FROM generate_series(1,1000) g;
      INSERT INTO public.enrollments(student_id,section_id) SELECT 'nt-'||g,910001 FROM generate_series(1,1000) g;`);
    await publish([910001]);
    assert.equal(scalar('SELECT count(*) FROM public.notifications'),'1001');
    execute(`INSERT INTO public.notifications(user_id,target_role,title,description,type,ref_url,category,metadata) VALUES
      ('nt-client-a','student','Legacy category','Notice','Alert','/fixture/bottleneck','bottleneck','{}'),
      (NULL,'department','BOTTLENECK: Clinic','Notice','Alert','/fixture/bottleneck',NULL,'{}'),
      (NULL,'admin','Legacy metadata','Notice','Alert','/fixture/bottleneck',NULL,'{"type":"Bottleneck"}');`);
    const migration = fs.readFileSync('supabase/migrations/20261105000001_admin_only_bottleneck_notifications.sql','utf8');
    execute(migration); execute(migration);
    for (const role of ['Client','Department']) {
      const prefix = `SET ROLE authenticated; SELECT set_config('request.jwt.claims','{"user_metadata":{"custom_claims":{"roles":["${role}"]}}}',false);`;
      assert.equal(scalar(`${prefix} SELECT count(*) FROM public.notifications WHERE ref_url='/fixture/bottleneck';`),'0');
      assert.equal(scalar(`${prefix} SELECT count(*) FROM public.notifications WHERE category='template';`),'1001','policy must preserve ordinary notification access');
    }
    assert.equal(scalar(`SET ROLE anon; SELECT count(*) FROM public.notifications WHERE ref_url='/fixture/bottleneck';`),'0');
    execute(`SET ROLE authenticated; SELECT set_config('request.jwt.claims','{"user_metadata":{"custom_claims":{"roles":["Client"]}}}',false);
      UPDATE public.notifications SET is_read=true WHERE ref_url='/fixture/bottleneck';`);
    assert.equal(scalar(`SELECT count(*) FROM public.notifications WHERE ref_url='/fixture/bottleneck' AND is_read=true`),'0');
    const admin = `SET ROLE authenticated; SELECT set_config('request.jwt.claims','{"user_metadata":{"custom_claims":{"roles":["Admin"]}}}',false);`;
    assert.equal(scalar(`${admin} SELECT count(*) FROM public.notifications WHERE ref_url='/fixture/bottleneck';`),'3');
    console.log('PASS: selected-course recipients only, section/template/course deduplication, inactive/unassigned exclusion, independent reads, 1001 recipients, real prepared parameters, and admin-only modern/legacy bottleneck RLS (including anonymous denial and migration reapplication).');
  } catch(error) {console.error(error.stderr?.toString()||error.stack);process.exitCode=1;}
  finally {if(created)docker(['dropdb','-U','postgres',database]);}
})();
