const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const esbuild = require("esbuild");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const root = path.resolve(__dirname, "..");

async function waitForClass(page, expected) {
  await page.waitForFunction((theme) => document.documentElement.classList.contains(theme), expected);
}

async function waitForStoredTheme(page, expected) {
  await page.waitForFunction((theme) => localStorage.getItem("theme") === theme, expected);
}

(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "webc-theme-"));
  let browser;
  let server;
  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, "fixtures/theme.tsx")],
      bundle: true,
      outfile: path.join(temp, "theme.js"),
      platform: "browser",
      format: "iife",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [
        {
          name: "theme-fixture-boundaries",
          setup(build) {
            build.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "next/navigation", namespace: "theme-fixture" }));
            build.onLoad({ filter: /.*/, namespace: "theme-fixture" }, () => ({
              loader: "js",
              contents: `export const usePathname = () => '/' + (new URLSearchParams(location.search).get('area') || 'admin');`,
            }));
          },
        },
      ],
    });
    const css = await postcss([tailwind({ base: root })]).process(
      await fs.readFile(path.join(root, "src/app/globals.css"), "utf8"),
      { from: path.join(root, "src/app/globals.css") },
    );
    await fs.writeFile(path.join(temp, "globals.css"), css.css);

    server = http.createServer(async (req, res) => {
      try {
        const file = path.join(temp, path.basename(new URL(req.url, "http://localhost").pathname));
        const content = await fs.readFile(file);
        res.setHeader("Content-Type", file.endsWith(".css") ? "text/css" : "text/javascript");
        res.end(content);
      } catch {
        if (new URL(req.url, "http://localhost").pathname === "/") {
          res.setHeader("Content-Type", "text/html");
          res.end('<!doctype html><html><head><meta name="color-scheme" content="light dark"><link rel="stylesheet" href="/globals.css"></head><body><div id="root"></div><script src="/theme.js"></script></body></html>');
        } else {
          res.statusCode = 404;
          res.end();
        }
      }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    });
    const origin = `http://127.0.0.1:${server.address().port}`;

    {
      const context = await browser.newContext({ colorScheme: "light" });
      const page = await context.newPage();
      await page.goto(`${origin}/?area=admin`);
      await waitForClass(page, "light");
      assert.equal(await page.locator("[data-portal]").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(244, 246, 250)");
      assert.equal(await page.getByTestId("theme-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(255, 255, 255)");
      assert.equal(await page.locator("[data-portal]").evaluate((el) => getComputedStyle(el).color), "rgb(23, 32, 51)");
      assert.equal(await page.getByTestId("admin-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(248, 250, 252)");
      assert.equal(await page.getByTestId("admin-card").evaluate((el) => getComputedStyle(el).color), "rgb(23, 32, 51)");
      assert.equal(await page.getByTestId("department-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(248, 250, 252)");
      assert.equal(await page.getByTestId("department-date").evaluate((el) => getComputedStyle(el).colorScheme), "light");
      assert.equal(await page.getByRole("button", { name: "Switch to dark mode" }).isVisible(), true);
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
      await waitForClass(page, "dark");
      assert.equal(await page.locator("[data-portal]").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(6, 10, 20)");
      assert.equal(await page.getByTestId("admin-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(7, 12, 24)");
      assert.equal(await page.getByTestId("department-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(7, 12, 24)");
      assert.equal(await page.getByTestId("department-date").evaluate((el) => getComputedStyle(el).colorScheme), "dark");
      await waitForStoredTheme(page, "dark");
      await page.reload();
      await waitForClass(page, "dark");
      assert.equal(await page.getByRole("button", { name: "Switch to light mode" }).isVisible(), true);
      await context.close();
    }

    {
      const context = await browser.newContext({ colorScheme: "light" });
      const page = await context.newPage();
      await page.goto(`${origin}/?area=admin`);
      await page.evaluate(() => localStorage.removeItem("theme"));
      await page.reload();
      await waitForClass(page, "light");
      await page.emulateMedia({ colorScheme: "dark" });
      await waitForClass(page, "dark");
      await page.getByRole("button", { name: "Switch to light mode" }).click();
      await waitForClass(page, "light");
      await waitForStoredTheme(page, "light");
      await page.emulateMedia({ colorScheme: "dark" });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains("light")), true);
      await context.close();
    }

    {
      const context = await browser.newContext({ colorScheme: "dark" });
      const page = await context.newPage();
      await page.goto(`${origin}/?area=admin-other`);
      await page.evaluate(() => localStorage.setItem("theme", "dark"));
      await page.reload();
      await waitForClass(page, "light");
      await page.goto(`${origin}/?area=admin`);
      await waitForClass(page, "dark");
      await context.close();
    }

    {
      const context = await browser.newContext({ colorScheme: "light" });
      const page = await context.newPage();
      await page.goto(`${origin}/?area=admin`);
      await page.evaluate(() => localStorage.removeItem("theme"));
      await page.reload();
      const second = await context.newPage();
      await second.goto(`${origin}/?area=department`);
      await waitForClass(second, "light");
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
      await waitForClass(second, "dark");
      assert.equal(await second.getByRole("button", { name: "Switch to light mode" }).isVisible(), true);
      await second.close();
      await context.close();
    }

    {
      const context = await browser.newContext({ colorScheme: "light" });
      await context.addInitScript(() => {
        const brokenStorage = {
          getItem() { throw new Error("storage unavailable"); },
          setItem() { throw new Error("storage unavailable"); },
          removeItem() { throw new Error("storage unavailable"); },
        };
        Object.defineProperty(window, "localStorage", { configurable: true, value: brokenStorage });
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${origin}/?area=clearance`);
      await waitForClass(page, "light");
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
      await waitForClass(page, "dark");
      assert.deepEqual(errors, []);
      await context.close();
    }

    console.log("PASS: theme follows system, persists explicit choices, syncs tabs, scopes nonportal routes, and tolerates unavailable storage.");
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
