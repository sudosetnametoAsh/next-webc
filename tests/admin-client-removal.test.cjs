const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness(options = {}) {
  const schema = Object.fromEntries(['users', 'students', 'staffs', 'notifications', 'clearanceRecords', 'clearanceTemplates', 'clearanceTasks', 'courses', 'clearanceDepartments', 'academicPeriods', 'enrollments', 'staffEnrollments'].map((name) => [name, new Proxy({ name }, { get: (t, key) => key === 'name' ? name : { table: name, key } })]));
  const target = options.type || 'student';
  const rows = {
    users: [{ userId: 'client', authId: options.self ? 'admin-auth' : 'client-auth', email: 'client@example.edu' }, { userId: 'other' }],
    students: target === 'student' || options.shared ? [{ studentId: 'client', studentName: 'Client' }] : [],
    staffs: target === 'staff' || options.shared ? [{ staffId: 'client', staffName: 'Client' }] : [],
    clearanceRecords: [{ userId: 'client', periodId: options.historyRecords ? 0 : 1 }, { userId: 'other', periodId: 1 }],
    academicPeriods: options.noWorkingPeriod ? [] : [{ periodId: 1, isActive: true }],
    enrollments: target === 'student' ? [{ studentId: 'client', periodId: 1, isActive: true }, ...(options.historyEnrollment ? [{ studentId:'client',periodId:0,isActive:true }] : [])] : [],
    staffEnrollments: target === 'staff' ? [{ staffId: 'client', periodId: 1, isActive: true }, ...(options.historyEnrollment ? [{ staffId:'client',periodId:0,isActive:true }] : [])] : [],
    notifications: [{ userId: 'client' }, { userId: 'other' }, { userId: null }],
    clearanceTemplates: options.assignments || (options.assigned ? [{ staffId: 'client', templateId: 1, courseId: 1, courseName: 'Computer Science', departmentId: 1, departmentName: 'Clinic', tier: 1, isActive: true }] : []),
    clearanceTasks: options.tasks ? [{ staffId: 'client', assignedTaskId: 1, periodId: options.historicalTasks ? 0 : 1 }] : [],
  };
  const initial = structuredClone(rows), removed = [], invalidated = [];
  const matches = (row,filter) => filter.conditions ? filter.conditions.every(f=>matches(row,f)) : filter.not ? row[filter.column.key] !== filter.value : row[filter.column.key] === filter.value;
  const tx = {
    async execute() {},
    select() { let table, filter; const query = {
      from(t) { table = t.name; return query; }, where(f) { filter = f; return query; },
      for() { return query; }, limit() { return query; }, leftJoin() { return query; }, innerJoin() { return query; }, orderBy() { return query; },
      then(resolve) { resolve(rows[table].filter((r) => matches(r,filter))); },
    }; return query; },
    delete(table) { return { where: async (filter) => {
      if (options.failDelete === table.name) throw new Error('Database failed');
      removed.push(table.name);
      rows[table.name] = rows[table.name].filter((r) => r[filter.column.key] !== filter.value);
    } }; },
    update(table) { return { set: (values) => ({ where: async (filter) => { if(options.failUpdate===table.name) throw Error('Database failed'); rows[table.name].filter((r) => matches(r,filter)).forEach((r) => Object.assign(r, values)); } }) }; },
  };
  const deps = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    'drizzle-orm': { eq: (column, value) => ({ column, value }), ne:(column,value)=>({column,value,not:true}), and:(...conditions)=>({conditions}), sql:()=>({}) }, 'zod': require('zod'),
    '@/lib/db/schema': schema,
    '@/lib/db': { db: { transaction: async (work) => { try { return await work(tx); } catch (error) { Object.assign(rows, structuredClone(initial)); throw error; } } } },
    '@/lib/db/supabase-server': { createClient: async () => ({ auth: { getUser: async () => ({ data: { user: options.anonymous ? null : { id: 'admin-auth', user_metadata: { custom_claims: { roles: options.requestRoles || ['Admin'] } } } } }) } }) },
    '@/lib/db/supabase-admin': { getSupabaseAdmin: () => ({ auth: { admin: { getUserById: async () => ({ data: { user: { user_metadata: { custom_claims: { roles: options.targetRoles || ['Client'] } } } }, error: options.authError || null }) } } }) },
    '@/lib/services/admin-cache': { invalidateServerAdminCache: () => invalidated.push('admin') },
    '@/lib/services/department-cache': { invalidateServerDepartmentCache: () => invalidated.push('department') },
    '@/lib/services/clearance-cache': { invalidateServerClearanceCache: () => invalidated.push('clearance') },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/admin/clients/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports, console: { error() {} }, require: (name) => { if (!(name in deps)) throw new Error(name); return deps[name]; } });
  return { rows, initial, removed, invalidated,
    remove: (body = { id: 'client', type: target }) => exports.DELETE({ json: async () => body }),
    edit: () => exports.PATCH({ json: async () => ({ id: 'client', type: target, name: 'Renamed' }) }),
  };
}

for (const type of ['student','staff']) for(const history of [false,true]) test('removes only current '+type+' participation; history='+history,async()=>{
 const h=harness({type,historyEnrollment:history,historyRecords:history});assert.equal((await h.remove()).status,200);
 const roster=type==='student'?'enrollments':'staffEnrollments';
 assert.equal(h.rows[roster].find(r=>r.periodId===1).isActive,false);
 if(history)assert.equal(h.rows[roster].find(r=>r.periodId===0).isActive,true);
 for(const table of ['users','students','staffs','clearanceRecords','notifications'])assert.deepEqual(h.rows[table],h.initial[table]);
 assert.equal(h.removed.length,0);assert.deepEqual(h.invalidated,['admin','department','clearance']);
 assert.equal((await h.remove()).status,200);
});
for(const options of [{shared:true},{assigned:true},{tasks:true},{self:true},{targetRoles:['Admin']},{noWorkingPeriod:true}])test('rejects unsafe or unavailable removal '+JSON.stringify(options),async()=>{
 const h=harness(options);assert.equal((await h.remove()).status,409);assert.deepEqual(h.rows,h.initial);
});
for(const type of ['student','staff'])test('failed roster update rolls back all data: '+type,async()=>{
 const h=harness({type,failUpdate:type==='student'?'enrollments':'staffEnrollments'});assert.equal((await h.remove()).status,500);assert.deepEqual(h.rows,h.initial);assert.equal(h.invalidated.length,0);
});
test('past assigned tasks and inactive templates do not block current participation removal',async()=>{
 const h=harness({type:'staff',tasks:true,historicalTasks:true,assignments:[{staffId:'client',isActive:false}]});assert.equal((await h.remove()).status,200);assert.deepEqual(h.rows.clearanceTasks,h.initial.clearanceTasks);
});
test('failed role lookup cannot disable participation',async()=>{
 const h=harness({authError:{code:'unexpected_failure'}});assert.equal((await h.remove()).status,500);assert.deepEqual(h.rows,h.initial);
});
test('missing Auth identity can still have its application enrollment disabled',async()=>{
 const h=harness({authError:{code:'user_not_found'}});assert.equal((await h.remove()).status,200);assert.deepEqual(h.rows.users,h.initial.users);
});
test('missing profile returns 404',async()=>assert.equal((await harness().remove({id:'missing',type:'student'})).status,404));
test('anonymous and non-admin requests cannot remove participation',async()=>{
 for(const [options,status] of [[{anonymous:true},401],[{requestRoles:['Client']},403]]){const h=harness(options);assert.equal((await h.remove()).status,status);assert.deepEqual(h.rows,h.initial);}
});
test('editing retains participation and account data',async()=>{
 const h=harness();assert.equal((await h.edit()).status,200);assert.equal(h.rows.students[0].studentName,'Renamed');assert.deepEqual(h.rows.enrollments,h.initial.enrollments);assert.deepEqual(h.rows.users,h.initial.users);
});
