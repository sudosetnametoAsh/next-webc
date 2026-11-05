const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function load(path, requireMock, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: requireMock, console, ...globals });
  return exports;
}

function cacheHarness() {
  const reads = [];
  const cache = load('src/lib/services/clearance-cache.ts', (name) => {
    const factory = name.includes('make-get-summary') ? async () => {
      const read = deferred();
      reads.push(read);
      return { execute: () => read.promise };
    } : async () => ({ execute: async () => [] });
    return new Proxy({}, { get: () => factory });
  });
  return { ...cache, reads };
}

test('an invalidated read cannot overwrite a newer clearance bundle', async () => {
  const h = cacheHarness();
  const old = h.getCachedClearanceBundle('student');
  h.invalidateServerClearanceCache('student');
  const fresh = h.getCachedClearanceBundle('student');
  h.reads[1].resolve('new tasks');
  await fresh;
  h.reads[0].resolve('old tasks');
  await old;
  assert.equal((await h.getCachedClearanceBundle('student')).summary, 'new tasks');
  assert.equal(h.reads.length, 2);
});

test('completion of an invalidated read preserves the newer pending request', async () => {
  const h = cacheHarness();
  const old = h.getCachedClearanceBundle('student');
  h.invalidateServerClearanceCache('student');
  const fresh = h.getCachedClearanceBundle('student');
  h.reads[0].resolve('old tasks');
  await old;
  const concurrent = h.getCachedClearanceBundle('student');
  assert.equal(h.reads.length, 2, 'concurrent callers should share the fresh request');
  h.reads[1].resolve('new tasks');
  assert.equal((await concurrent).summary, 'new tasks');
  await fresh;
});

function realtimeHarness(options = {}) {
  const timers = new Map();
  const intervals = new Map();
  const effects = [];
  const requests = [];
  let statusCallback;
  let eventCallback;
  let taskCallback;
  let cached = { tasks: [{ assigned_task_id: 7, title: "Old", description: "Old description", department: "Clinic", staff: "Officer" }] };
  const sync = load("src/lib/clearance-task-sync.ts", name => { throw Error(name); });
  let nextId = 1;
  let removed = false;
  const channel = {
    on(_event, _filter, callback) { eventCallback = callback; if (_filter.table === "clearance_tasks") taskCallback = callback; return channel; },
    subscribe(callback) { statusCallback = callback; return channel; },
  };
  const provider = load('src/components/clearance/dashboard-realtime-provider.tsx', (name) => {
    if (name === 'react') return { useEffect: (fn) => effects.push(fn), useMemo: (fn) => fn() };
    if (name === 'react/jsx-runtime') return { jsx: () => null };
    if (name === '@tanstack/react-query') return { useQueryClient: () => ({ setQueryData: (_key, updater) => { cached = updater(cached); } }) };
    if (name.includes('supabase-client')) return {
      createClient: () => ({ realtime: { setAuth: () => options.authGate || Promise.resolve() }, channel: () => channel, removeChannel: () => { removed = true; } }),
    };
    if (name.includes('clearance-task-sync')) return sync;
    if (name.includes('use-clearance-data')) return {
      clearanceQueryKeys: { student: id => ['clearance', id] },
      invalidateClearanceData: () => {
        const request = deferred();
        requests.push(request);
        return request.promise;
      },
    };
    throw new Error(`Unexpected import: ${name}`);
  }, {
    console: { warn() {} },
    document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    window: { addEventListener() {}, removeEventListener() {} },
    setTimeout: (fn) => { const id = nextId++; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id),
    setInterval: (fn, ms) => { assert.equal(ms,15000); const id = nextId++; intervals.set(id, fn); return id; },
    clearInterval: (id) => intervals.delete(id),
  });
  provider.default({ children: null, studentId: 'student' });
  const cleanup = effects[0]();
  return {
    requests, timers, intervals,
    get subscribed() { return Boolean(statusCallback); },
    status: (status) => statusCallback(status),
    event: () => eventCallback(),
    taskEvent: row => taskCallback({ eventType: "UPDATE", new: row }),
    get cached() { return cached; },
    setCached: value => { cached = value; },
    flush: () => { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } },
    cleanup: () => { cleanup(); assert.equal(removed, true); },
  };
}

test('realtime catches up on subscription and batches events without cancelling a running fetch', async () => {
  const h = realtimeHarness();
  await new Promise(setImmediate);
  h.status('SUBSCRIBED');
  h.event();
  h.event();
  assert.equal(h.timers.size, 1);
  h.flush();
  assert.equal(h.requests.length, 1);
  h.event();
  h.event();
  assert.equal(h.timers.size, 0);
  h.requests[0].resolve();
  await new Promise(setImmediate);
  assert.equal(h.requests.length, 2, 'changes during a fetch require one follow-up');
  h.requests[1].resolve();
  await new Promise(setImmediate);
  h.cleanup();
});

test('realtime failure starts recovery polling and reconnect/cleanup stops it', async () => {
  const h = realtimeHarness();
  await new Promise(setImmediate);
  h.status('CHANNEL_ERROR');
  h.status('TIMED_OUT');
  assert.equal(h.intervals.size, 1);
  h.status('SUBSCRIBED');
  assert.equal(h.intervals.size, 0);
  h.status('CLOSED');
  h.cleanup();
  assert.equal(h.intervals.size, 0);
  assert.equal(h.timers.size, 0);
  h.status('CLOSED');
  assert.equal(h.intervals.size, 0, 'late subscription callbacks must not restart work');
});

test('task edits appear immediately and survive an older in-flight client refresh',async()=>{
 const h=realtimeHarness();await new Promise(setImmediate);h.status('SUBSCRIBED');h.flush();assert.equal(h.requests.length,1);
 const old=h.cached;h.taskEvent({assigned_task_id:7,title:'Edited',due_date:null,dropbox:'enabled'});
 assert.equal(h.cached.tasks[0].title,'Edited');assert.equal(h.cached.tasks[0].department,'Clinic');assert.equal(h.cached.tasks[0].dropbox,'enabled');
 h.setCached(old);h.requests[0].resolve();await new Promise(setImmediate);
 assert.equal(h.cached.tasks[0].title,'Edited');assert.equal(h.requests.length,2);
 h.requests[1].resolve();await new Promise(setImmediate);
 const current=h.cached;h.taskEvent({assigned_task_id:999,title:'Someone else'});assert.equal(h.cached,current);
 h.cleanup();
});

test('auth completes before subscribing; healthy realtime never starts a polling interval',async()=>{
 const gate=deferred(),h=realtimeHarness({authGate:gate.promise});assert.equal(h.subscribed,false);assert.equal(h.intervals.size,0);
 gate.resolve();await new Promise(setImmediate);assert.equal(h.subscribed,true);h.status('SUBSCRIBED');assert.equal(h.intervals.size,0);h.cleanup();
});
test('unmounting during authentication cannot leave a late subscription behind',async()=>{
 const gate=deferred(),h=realtimeHarness({authGate:gate.promise});h.cleanup();gate.resolve();await new Promise(setImmediate);assert.equal(h.subscribed,false);assert.equal(h.intervals.size,0);
});
