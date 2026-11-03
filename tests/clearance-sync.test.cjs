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

function realtimeHarness() {
  const timers = new Map();
  const intervals = new Map();
  const effects = [];
  const requests = [];
  let statusCallback;
  let eventCallback;
  let nextId = 1;
  let removed = false;
  const channel = {
    on(_event, _filter, callback) { eventCallback = callback; return channel; },
    subscribe(callback) { statusCallback = callback; return channel; },
  };
  const provider = load('src/components/clearance/dashboard-realtime-provider.tsx', (name) => {
    if (name === 'react') return { useEffect: (fn) => effects.push(fn), useMemo: (fn) => fn() };
    if (name === 'react/jsx-runtime') return { jsx: () => null };
    if (name === '@tanstack/react-query') return { useQueryClient: () => ({}) };
    if (name.includes('supabase-client')) return {
      createClient: () => ({ channel: () => channel, removeChannel: () => { removed = true; } }),
    };
    if (name.includes('use-clearance-data')) return {
      invalidateClearanceData: () => {
        const request = deferred();
        requests.push(request);
        return request.promise;
      },
    };
    throw new Error(`Unexpected import: ${name}`);
  }, {
    console: { warn() {} },
    document: { visibilityState: 'visible' },
    setTimeout: (fn) => { const id = nextId++; timers.set(id, fn); return id; },
    clearTimeout: (id) => timers.delete(id),
    setInterval: (fn) => { const id = nextId++; intervals.set(id, fn); return id; },
    clearInterval: (id) => intervals.delete(id),
  });
  provider.default({ children: null, studentId: 'student' });
  const cleanup = effects[0]();
  return {
    requests, timers, intervals,
    status: (status) => statusCallback(status),
    event: () => eventCallback(),
    flush: () => { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } },
    cleanup: () => { cleanup(); assert.equal(removed, true); },
  };
}

test('realtime catches up on subscription and batches events without cancelling a running fetch', async () => {
  const h = realtimeHarness();
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

test('realtime failure starts recovery polling and reconnect/cleanup stops it', () => {
  const h = realtimeHarness();
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
