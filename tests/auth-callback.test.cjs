const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const { NextRequest, NextResponse } = require("next/server");

function load(file, dependencies) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, {
    exports, URL, Headers, TextEncoder, process,
    console: { error() {} },
    require(name) {
      assert.ok(name in dependencies, `Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

async function fixture({ role = "Department", exchangeError = false } = {}) {
  const tokens = load("src/lib/auth/session-token.ts", { jose: await import("jose") });
  const router = load("src/modules/auth/domain/role-router.ts", {});
  const { AuthCallback } = load("src/modules/auth/application/use-case/auth-callback.ts", {
    "../../domain/role-router": router,
  });
  let exchanges = 0;
  const callback = new AuthCallback({
    async exchangeCodeForSession(code) {
      exchanges++;
      assert.equal(code, "test-code");
      if (exchangeError) throw new Error("Invalid code");
    },
    async getUserRole() { return role; },
  });
  const user = {
    id: "auth-id", email: "staff@example.com",
    user_metadata: { full_name: "Department Staff", custom_claims: { roles: [role] } },
  };
  const client = {
    auth: { async getUser() { return { data: { user } }; } },
    from(table) {
      const query = {
        select() { return query; }, eq() { return query; }, limit() { return query; },
        async maybeSingle() {
          return { data: table === "users" ? { user_id: "staff-id" } : { clearance_departments: { dept_name: "Library" } } };
        },
      };
      return query;
    },
  };
  const { GET } = load("src/app/api/auth/callback/route.ts", {
    "next/server": { NextResponse },
    "@/composition/auth/make-auth-callback": { makeAuthCallback: () => callback },
    "@/lib/db/supabase-server": { createClient: async () => client },
    "@/lib/auth/session-token": tokens,
  });
  const { proxy } = load("src/proxy.ts", {
    "next/server": { NextResponse },
    "@/lib/auth/session-token": tokens,
    "@supabase/ssr": { createServerClient: () => client },
  });
  return { GET, proxy, tokens, exchanges: () => exchanges };
}

test("missing codes and provider errors never establish a session", async () => {
  const f = await fixture();
  for (const [query, reason] of [
    ["", "missing_code"],
    ["?error=server_error&error_code=unexpected_failure", "oauth_error"],
    ["?code=test-code&error=access_denied", "oauth_error"],
  ]) {
    const response = await f.GET(new Request(`http://localhost:3000/api/auth/callback${query}`));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), `http://localhost:3000/auth-error?reason=${reason}`);
    assert.equal(response.cookies.get("session_token"), undefined);
  }
  assert.equal(f.exchanges(), 0);
});

test("failed code exchange does not authenticate the user", async () => {
  const f = await fixture({ exchangeError: true });
  const response = await f.GET(new Request("http://localhost:3000/api/auth/callback?code=test-code"));
  assert.equal(response.headers.get("location"), "http://localhost:3000/auth-error?reason=session_error");
  assert.equal(response.cookies.get("session_token"), undefined);
});

test("department and staff callbacks issue a verified cookie accepted by the dashboard proxy", async () => {
  for (const role of ["Department", "Staff"]) {
    const f = await fixture({ role });
    const response = await f.GET(new Request("http://localhost:3000/api/auth/callback?code=test-code"));
    assert.equal(response.headers.get("location"), "http://localhost:3000/department/dashboard");
    const cookie = response.cookies.get("session_token");
    assert.ok(cookie?.httpOnly);
    const session = await f.tokens.verifySessionToken(cookie.value);
    assert.equal(session.user_id, "staff-id");
    assert.equal(session.role, "Staff");
    assert.equal(session.department, "Library");
    const dashboard = await f.proxy(new NextRequest("http://localhost:3000/department/dashboard", {
      headers: { Cookie: `session_token=${cookie.value}` },
    }));
    assert.equal(dashboard.headers.get("x-middleware-next"), "1");
    assert.equal(dashboard.headers.get("x-middleware-request-x-user-id"), "staff-id");
  }
});

test("unauthenticated users and students cannot access the department dashboard", async () => {
  const f = await fixture({ role: "Student" });
  const anonymous = await f.proxy(new NextRequest("http://localhost:3000/department/dashboard"));
  assert.equal(anonymous.headers.get("location"), "http://localhost:3000/");
  const response = await f.GET(new Request("http://localhost:3000/api/auth/callback?code=test-code"));
  const cookie = response.cookies.get("session_token");
  const student = await f.proxy(new NextRequest("http://localhost:3000/department/dashboard", {
    headers: { Cookie: `session_token=${cookie.value}` },
  }));
  assert.equal(student.headers.get("location"), "http://localhost:3000/auth-error?reason=faculty_required");
});
