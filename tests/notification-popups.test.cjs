const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function harness() {
  let now = 0, cursor = 0, dirty = false;
  const slots = [], pending = [], timers = new Map();
  let sequence = 0;
  const hooks = {
    ...React,
    useRef(initial) {
      const i = cursor++;
      return slots[i] ??= { current: initial };
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], (value) => {
        slots[i] = typeof value === 'function' ? value(slots[i]) : value;
        dirty = true;
      }];
    },
    useEffect(callback, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((value, j) => value !== slots[i].deps[j])) {
        pending.push(() => {
          slots[i]?.cleanup?.();
          slots[i] = { deps, cleanup: callback() };
        });
      }
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/notifications/animated-notification-popups.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require: (name) => name === 'react' ? hooks : require(name),
    Date: { now: () => now },
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  return {
    api: exports,
    render(fn) {
      let result;
      do { dirty = false; cursor = 0; result = fn(); } while (dirty);
      while (pending.length) pending.shift()();
      return result;
    },
    advance(ms) {
      now += ms;
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now && timers.delete(id)) timer.fn();
      }
    },
  };
}

test('each popup expires after 3s even when a second popup arrives', () => {
  const h = harness(), expired = [];
  const expire = (id) => expired.push(id);
  h.render(() => h.api.useNotificationPopupTimeout([{ id: 'first' }], expire));
  h.advance(2000);
  h.render(() => h.api.useNotificationPopupTimeout([{ id: 'second' }, { id: 'first' }], expire));
  h.advance(999);
  assert.deepEqual(expired, []);
  h.advance(1);
  assert.deepEqual(expired, ['first']);
  h.render(() => h.api.useNotificationPopupTimeout([{ id: 'second' }], expire));
  h.advance(2000);
  assert.deepEqual(expired, ['first', 'second']);
});

test('removed popups animate out before unmounting, with fallback cleanup', () => {
  const h = harness();
  const popup = React.createElement('button', { key: 'one' }, 'Notification');
  const render = (children) => h.render(() => h.api.AnimatedNotificationPopups({ children, className: 'stack' }));
  let tree = render([popup]);
  assert.match(tree.props.children[0].props.className, /animate-in/);
  tree = render([]);
  assert.equal(tree.props.children.length, 1);
  assert.match(tree.props.children[0].props.className, /animate-out/);
  assert.equal(tree.props.children[0].props.inert, true);
  h.advance(150);
  tree = render([]);
  assert.equal(tree.props.children.length, 0);
});
