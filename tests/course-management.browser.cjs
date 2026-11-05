const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const esbuild = require("esbuild");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const root = path.resolve(__dirname, "..");
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "course-management-"));
  let browser, server;
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, "fixtures/course-management.tsx")],
      bundle: true,
      minify: true,
      outdir: temp,
      platform: "browser",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [
        {
          name: "boundaries",
          setup(build) {
            build.onResolve(
              { filter: /^(next\/link|@\/hooks\/use-toast)$/ },
              (args) => ({ path: args.path, namespace: "boundary" }),
            );
            build.onLoad(
              { filter: /.*/, namespace: "boundary" },
              ({ path: name }) => ({
                resolveDir: root,
                loader: "jsx",
                contents:
                  name === "next/link"
                    ? `import React from 'react';export default function Link(props){return <a {...props}/>}`
                    : `export const useToast=()=>({success:message=>{window.lastSuccess=message},error:message=>{window.lastError=message}});`,
              }),
            );
          },
        },
      ],
    });
    server = http.createServer(async (req, res) => {
      res.setHeader(
        "Content-Type",
        req.url === "/" ? "text/html" : "text/javascript",
      );
      res.end(
        req.url === "/"
          ? '<!doctype html><html><div id="root"></div><script src="/app.js"></script></html>'
          : await fs.readFile(path.join(temp, "course-management.js")),
      );
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let courses = [
        {
          course_id: 1,
          course_name: "Bachelor of Science in Computer Science",
          course_sections: [],
        },
      ],
      sections = [];
    let coursePayload;
    await page.route("**/api/admin/courses", async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        const body = route.request().postDataJSON();
        coursePayload = body;
        courses.push({
          course_id: 2,
          course_name: body.course_name,
          course_sections: [],
        });
      }
      if (method === "PATCH") {
        const body = route.request().postDataJSON();
        courses = courses.map((course) =>
          course.course_id === body.course_id
            ? { ...course, course_name: body.course_name }
            : course,
        );
      }
      await route.fulfill({ json: { data: courses } });
    });
    await page.route("**/api/admin/sections*", async (route) => {
      const method = route.request().method();
      if (method === "POST")
        sections.push({
          ...route.request().postDataJSON(),
          section_id: 1,
          enrolled_count: 0,
        });
      if (method === "DELETE") sections = [];
      await route.fulfill({ json: { data: sections, success: true } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page
      .getByText("Bachelor of Science in Computer Science", { exact: true })
      .waitFor();
    await page.getByRole("textbox", { name: "Search courses" }).fill("bscs");
    assert.equal(
      await page
        .getByText("Bachelor of Science in Computer Science", { exact: true })
        .isVisible(),
      true,
    );
    await page.getByRole("textbox", { name: "Search courses" }).fill("missing");
    await page.getByText("No courses match your search.").waitFor();
    await page.getByRole("textbox", { name: "Search courses" }).fill("");
    await page.getByRole("button", { name: "Add Course", exact: true }).click();
    await page.getByLabel("Program name").fill("BSIT");
    await page.getByLabel("Sections", { exact: true }).fill("3");
    await page
      .getByRole("button", { name: "Add Year / Term", exact: true })
      .click();
    await page
      .getByText("4 sections across 2 year / term groups will be created.", {
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", { name: "Save Course", exact: true })
      .click();
    await page.getByText("BSIT", { exact: true }).waitFor();
    assert.deepEqual(coursePayload.sections, [
      { year: 1, semester: 1, section_number: 1 },
      { year: 1, semester: 1, section_number: 2 },
      { year: 1, semester: 1, section_number: 3 },
      { year: 2, semester: 1, section_number: 1 },
    ]);
    await page
      .getByRole("button", { name: "Options for BSIT", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Edit Course", exact: true })
      .click();
    await page.getByLabel("Program name").fill("BSDA");
    await page
      .getByRole("button", { name: "Save Course", exact: true })
      .click();
    await page.getByText("BSDA", { exact: true }).waitFor();
    await page
      .getByRole("button", {
        name: "Options for Bachelor of Science in Computer Science",
        exact: true,
      })
      .click();
    await page
      .getByRole("menuitem", { name: "Manage Sections", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add Section", exact: true })
      .click();
    await page
      .getByText("Year 1 · Term 1 · Section 1", { exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: production-mode course page renders, searches by abbreviation, creates and renames programs, and adds sections.",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.getByRole("dialog").isVisible(), true);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Add Course", exact: true }).click();
    await page.getByRole("tab", { name: "Bulk Import", exact: true }).click();
    const importText =
      "course_name,year,term,sections\nImported program,1,1,2\nImported program,2,1,1";
    await page.getByLabel("Upload CSV or text file").setInputFiles({
      name: "courses.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(importText),
    });
    await page
      .getByText("Import preview · 1 courses · 3 sections", { exact: true })
      .waitFor();
    let failImport = true;
    await page.route("**/api/admin/courses/import", async (route) => {
      assert.equal(route.request().postDataJSON().text, importText);
      if (failImport)
        return route.fulfill({
          status: 500,
          json: { error: "Import failed. No courses or sections were saved." },
        });
      courses.push({
        course_id: 3,
        course_name: "Imported program",
        course_sections: [],
      });
      return route.fulfill({
        status: 201,
        json: { summary: { coursesCreated: 1, sectionsCreated: 3 } },
      });
    });
    await page
      .getByRole("button", { name: "Import 1 Course", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        window.lastError ===
        "Import failed. No courses or sections were saved.",
    );
    assert.equal(await page.getByRole("dialog").isVisible(), true);
    await page
      .getByRole("button", { name: "Direct Text Paste", exact: true })
      .click();
    assert.equal(
      await page
        .getByLabel("Or paste CSV, tab-separated text, or JSON")
        .inputValue(),
      importText,
    );
    failImport = false;
    await page
      .getByRole("button", { name: "Import 1 Course", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.getByText("Imported program", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: CSV upload previews grouped courses and sections; failed import preserves the draft; retry imports and refreshes the course list.",
    );
  } finally {
    await browser?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
