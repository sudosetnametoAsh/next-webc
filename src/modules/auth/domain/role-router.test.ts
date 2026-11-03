import assert from "node:assert/strict";
import { test } from "node:test";
import { RoleRouter } from "./role-router";

test("department officers can access personal clearance pages and APIs", () => {
  for (const path of ["/department/clearance", "/clearance", "/clearance/tasks", "/clearance/schedules", "/api/student/submissions", "/api/student/appeal"]) {
    assert.equal(RoleRouter.canAccess(path, ["Department"]), true, path);
  }
  assert.equal(RoleRouter.homePath(["Department"]), "/department/dashboard");
});

test("clearance access preserves role boundaries", () => {
  for (const path of ["/clearance", "/clearance/tasks", "/api/student/submissions"]) {
    assert.equal(RoleRouter.canAccess(path, ["Client"]), true, path);
    assert.equal(RoleRouter.canAccess(path, []), false, path);
    assert.equal(RoleRouter.canAccess(path, ["Admin"]), false, path);
  }
  for (const path of ["/admin/clients", "/api/admin/clients"]) {
    assert.equal(RoleRouter.canAccess(path, ["Department"]), false, path);
  }
  for (const path of ["/department/clients", "/api/department/clients", "/api/dashboard"]) {
    assert.equal(RoleRouter.canAccess(path, ["Client"]), false, path);
    assert.equal(RoleRouter.canAccess(path, ["Department"]), true, path);
  }
});
