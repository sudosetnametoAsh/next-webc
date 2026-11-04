const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

test('client directives precede imports and other statements in every source file', () => {
  let checked = 0;
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        scan(filename);
        continue;
      }
      if (!/\.[jt]sx?$/.test(filename)) continue;
      const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
      let inPrologue = true;
      for (const statement of source.statements) {
        const isDirective = ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);
        if (isDirective && statement.expression.text === 'use client') {
          checked++;
          assert.ok(inPrologue, `${filename}: use client must precede imports and other statements`);
        }
        if (!isDirective) inPrologue = false;
      }
    }
  }
  scan('src');
  assert.ok(checked > 0, 'Expected to check client components');
});
