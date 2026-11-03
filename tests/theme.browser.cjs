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

async function assertContrast(page, foregroundSelector, backgroundSelector, minimum, label) {
  const result = await page.evaluate(({ foregroundSelector: foreground, backgroundSelector: background }) => {
    const parseColor = (value) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].replace(/\//g, " ").split(/[\s,]+/).filter(Boolean);
      const channels = parts.slice(0, 3).map(Number);
      if (channels.some((channel) => Number.isNaN(channel))) return null;
      return { r: channels[0], g: channels[1], b: channels[2], a: parts[3] === undefined ? 1 : Number(parts[3]) };
    };
    const luminance = ({ r, g, b }) => {
      const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const foregroundColor = parseColor(getComputedStyle(document.querySelector(foreground)).color);
    const backgroundColor = parseColor(getComputedStyle(document.querySelector(background)).backgroundColor);
    if (!foregroundColor || !backgroundColor) return null;
    const alpha = Number.isFinite(foregroundColor.a) ? foregroundColor.a : 1;
    const blended = {
      r: foregroundColor.r * alpha + backgroundColor.r * (1 - alpha),
      g: foregroundColor.g * alpha + backgroundColor.g * (1 - alpha),
      b: foregroundColor.b * alpha + backgroundColor.b * (1 - alpha),
    };
    const foregroundLuminance = luminance(blended);
    const backgroundLuminance = luminance(backgroundColor);
    return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  }, { foregroundSelector, backgroundSelector });
  assert(result !== null, `${label} colors should be readable by the browser`);
  assert(result >= minimum, `${label} contrast ${result?.toFixed(2)} < ${minimum}`);
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
      await page.goto(`${origin}/?area=admin`, { waitUntil: "domcontentloaded" });
      const toggleBeforeHydration = page.locator('button[aria-label="Theme switcher"], button[aria-label^="Switch to"]').first();
      await toggleBeforeHydration.waitFor({ state: "attached" });
      const beforeHydrationBox = await toggleBeforeHydration.boundingBox();
      await waitForClass(page, "light");
      await page.waitForFunction(() => Boolean(document.querySelector('button[aria-label^="Switch to"]')));
      const toggleAfterHydration = page.locator('button[aria-label^="Switch to"]').first();
      const afterHydrationBox = await toggleAfterHydration.boundingBox();
      assert(beforeHydrationBox && afterHydrationBox, "theme toggle reserves space before and after hydration");
      assert.deepEqual(
        { x: afterHydrationBox.x, y: afterHydrationBox.y, width: afterHydrationBox.width, height: afterHydrationBox.height },
        { x: beforeHydrationBox.x, y: beforeHydrationBox.y, width: beforeHydrationBox.width, height: beforeHydrationBox.height },
        "theme toggle keeps its bounding box through hydration",
      );
      assert.equal(await page.locator("[data-portal]").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(244, 246, 250)");
      assert.equal(await page.getByTestId("theme-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(255, 255, 255)");
      assert.match(await page.getByTestId("phase-callout").evaluate((el) => getComputedStyle(el).backgroundImage), /254, 243, 199/);
      assert.equal(await page.locator("[data-portal]").evaluate((el) => getComputedStyle(el).color), "rgb(23, 32, 51)");
      assert.equal(await page.getByTestId("admin-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(248, 250, 252)");
      assert.equal(await page.getByTestId("admin-card").evaluate((el) => getComputedStyle(el).color), "rgb(23, 32, 51)");
      assert.equal(await page.getByTestId("department-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(248, 250, 252)");
      assert.equal(await page.getByTestId("clearance-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(248, 250, 252)");
      assert.equal(await page.getByTestId("clearance-panel").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(255, 255, 255)");
      assert.equal(await page.getByTestId("clearance-inset").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(248, 250, 252)");
      assert.equal(await page.getByTestId("expanded-document-row").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(244, 246, 250)");
      assert.equal(await page.getByTestId("cleared-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(220, 252, 231)");
      assert.equal(await page.getByTestId("cleared-badge").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(220, 252, 231)");
      assert.equal(await page.getByTestId("amber-status").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(254, 243, 199)");
      assert.equal(await page.getByTestId("rose-status").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(254, 226, 226)");
      assert.equal(await page.getByTestId("blue-status").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(219, 234, 254)");
      await page.getByTestId("cleared-card").hover();
      assert.equal(await page.getByTestId("cleared-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(220, 252, 231)");
      await page.getByTestId("amber-status").hover();
      assert.equal(await page.getByTestId("amber-status").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(254, 243, 199)");
      assert.equal(await page.getByTestId("amber-status").evaluate((el) => getComputedStyle(el).color), "rgb(146, 64, 14)");
      await page.getByTestId("rose-status").hover();
      assert.equal(await page.getByTestId("rose-status").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(254, 226, 226)");
      assert.equal(await page.getByTestId("rose-status").evaluate((el) => getComputedStyle(el).color), "rgb(153, 27, 27)");
      await page.getByTestId("blue-status").hover();
      assert.equal(await page.getByTestId("blue-status").evaluate((el) => getComputedStyle(el).color), "rgb(29, 78, 216)");
      assert.equal(await page.getByTestId("body-overlay").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(248, 250, 252)");
      assert.equal(await page.getByTestId("body-overlay").evaluate((el) => getComputedStyle(el).color), "rgb(23, 32, 51)");
      assert.equal(await page.getByTestId("legacy-overlay-text").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(255, 255, 255)");
      assert.equal(await page.getByTestId("legacy-overlay-text").evaluate((el) => getComputedStyle(el).color), "rgb(23, 32, 51)");
      assert.equal(await page.getByTestId("variant-input").evaluate((el) => getComputedStyle(el).color), "rgb(23, 32, 51)");
      assert.equal(await page.getByTestId("solid-danger").evaluate((el) => getComputedStyle(el).color), "rgb(255, 255, 255)");
      const focusBorderInput = page.getByTestId("focus-border-input");
      const unfocusedBorder = await focusBorderInput.evaluate((el) => getComputedStyle(el).borderTopColor);
      await focusBorderInput.focus();
      const focusedBorder = await focusBorderInput.evaluate((el) => getComputedStyle(el).borderTopColor);
      assert.notEqual(focusedBorder, unfocusedBorder);
      assert.notEqual(focusedBorder, "rgb(220, 226, 235)");
      const hoverSurface = page.getByTestId("hover-surface");
      assert.match(await hoverSurface.evaluate((el) => getComputedStyle(el).backgroundColor), /rgba?\(0, 0, 0, 0\)|transparent/);
      await hoverSurface.hover();
      assert.equal(await hoverSurface.evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(248, 250, 252)");
      assert.equal(await page.getByTestId("department-date").evaluate((el) => getComputedStyle(el).colorScheme), "light");
      assert.equal(await page.getByRole("button", { name: "Switch to dark mode" }).isVisible(), true);
      await assertContrast(page, '[data-testid="normal-text"]', '[data-testid="normal-text"]', 4.5, "normal text");
      await assertContrast(page, '[data-testid="status-text"]', '[data-testid="status-text"]', 4.5, "status text");
      await assertContrast(page, '[data-testid="expanded-document-row"]', '[data-testid="expanded-document-row"]', 4.5, "expanded document text");
      await assertContrast(page, '[data-testid="cleared-card"]', '[data-testid="cleared-card"]', 4.5, "cleared card text");
      await assertContrast(page, '[data-testid="cleared-badge"]', '[data-testid="cleared-badge"]', 4.5, "cleared badge text");
      await assertContrast(page, '[data-testid="amber-status"]', '[data-testid="amber-status"]', 4.5, "amber status text");
      await assertContrast(page, '[data-testid="rose-status"]', '[data-testid="rose-status"]', 4.5, "rose status text");
      await assertContrast(page, '[data-testid="blue-status"]', '[data-testid="blue-status"]', 4.5, "blue status text");
      await assertContrast(page, '[data-testid="large-text"]', '[data-testid="large-text"]', 3, "large text");
      await assertContrast(page, 'button[aria-label="Switch to dark mode"]', '[data-portal]', 3, "theme toggle");

      const dialogTrigger = page.getByTestId("real-dialog-trigger");
      await dialogTrigger.click();
      const realDialog = page.getByTestId("real-dialog");
      await realDialog.waitFor();
      const dialogLightBackground = await realDialog.evaluate((el) => getComputedStyle(el).backgroundColor);
      assert.notEqual(dialogLightBackground, "transparent");
      await page.getByTestId("dialog-toggle").getByRole("button", { name: "Switch to dark mode" }).click();
      await waitForClass(page, "dark");
      assert.notEqual(await realDialog.evaluate((el) => getComputedStyle(el).backgroundColor), dialogLightBackground);
      await page.keyboard.press("Escape");
      await realDialog.waitFor({ state: "hidden" });
      assert.equal(await realDialog.isVisible(), false);
      assert.equal(await dialogTrigger.evaluate((el) => document.activeElement === el), true);
      await page.getByRole("button", { name: "Switch to light mode" }).click();
      await waitForClass(page, "light");

      const drawerTrigger = page.getByTestId("real-drawer-trigger");
      await drawerTrigger.click();
      const drawer = page.locator("dialog.app-drawer[open]");
      await drawer.waitFor();
      const drawerPanel = drawer.locator(".app-drawer-panel");
      assert.equal(await drawerPanel.evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(255, 255, 255)");
      await page.getByTestId("drawer-toggle").getByRole("button", { name: "Switch to dark mode" }).click();
      await waitForClass(page, "dark");
      assert.equal(await drawerPanel.evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(10, 16, 31)");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(280);
      assert.equal(await page.locator("dialog.app-drawer[open]").count(), 0);
      assert.equal(await drawerTrigger.evaluate((el) => document.activeElement === el), true);
      await page.getByRole("button", { name: "Switch to light mode" }).click();
      await waitForClass(page, "light");

      await page.getByRole("button", { name: "Switch to dark mode" }).focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      assert.equal(await page.getByRole("button", { name: "Switch to dark mode" }).evaluate((el) => document.activeElement === el), true);
      assert.notEqual(await page.getByRole("button", { name: "Switch to dark mode" }).evaluate((el) => getComputedStyle(el).boxShadow), "none");
      await page.keyboard.press("Enter");
      await waitForClass(page, "dark");
      assert.equal(await page.getByRole("button", { name: "Switch to light mode" }).isVisible(), true);
      await page.getByRole("button", { name: "Switch to light mode" }).focus();
      await page.keyboard.press("Space");
      await waitForClass(page, "light");
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
      await waitForClass(page, "dark");
      assert.equal(await page.locator("[data-portal]").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(6, 10, 20)");
      assert.equal(await page.getByTestId("admin-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(7, 12, 24)");
      assert.equal(await page.getByTestId("department-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(7, 12, 24)");
      assert.equal(await page.getByTestId("clearance-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(7, 12, 24)");
      assert.equal(await page.getByTestId("clearance-panel").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(10, 16, 31)");
      const darkPhaseGradient = await page.getByTestId("phase-callout").evaluate((el) => getComputedStyle(el).backgroundImage);
      assert.match(darkPhaseGradient, /\/ 0\.3\)/);
      assert.match(darkPhaseGradient, /\/ 0\.15\)/);
      assert.equal(await page.getByTestId("clearance-inset").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(7, 12, 24)");
      assert.equal(await page.getByTestId("expanded-document-row").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(6, 10, 20)");
      assert.equal(await page.getByTestId("cleared-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(17, 53, 43)");
      assert.equal(await page.getByTestId("cleared-badge").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(17, 53, 43)");
      assert.equal(await page.getByTestId("amber-status").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(55, 42, 19)");
      assert.equal(await page.getByTestId("rose-status").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(63, 30, 38)");
      assert.equal(await page.getByTestId("blue-status").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(23, 37, 84)");
      await page.getByTestId("cleared-card").hover();
      assert.equal(await page.getByTestId("cleared-card").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(17, 53, 43)");
      await page.getByTestId("amber-status").hover();
      assert.equal(await page.getByTestId("amber-status").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(55, 42, 19)");
      assert.equal(await page.getByTestId("amber-status").evaluate((el) => getComputedStyle(el).color), "rgb(251, 191, 36)");
      await page.getByTestId("rose-status").hover();
      assert.equal(await page.getByTestId("rose-status").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(63, 30, 38)");
      assert.equal(await page.getByTestId("rose-status").evaluate((el) => getComputedStyle(el).color), "rgb(252, 165, 165)");
      await page.getByTestId("blue-status").hover();
      assert.equal(await page.getByTestId("blue-status").evaluate((el) => getComputedStyle(el).color), "rgb(147, 197, 253)");
      assert.equal(await page.getByTestId("body-overlay").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(7, 12, 24)");
      assert.equal(await page.getByTestId("body-overlay").evaluate((el) => getComputedStyle(el).color), "rgb(241, 245, 249)");
      assert.equal(await page.getByTestId("legacy-overlay-text").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(10, 16, 31)");
      assert.equal(await page.getByTestId("legacy-overlay-text").evaluate((el) => getComputedStyle(el).color), "rgb(241, 245, 249)");
      assert.equal(await page.getByTestId("variant-input").evaluate((el) => getComputedStyle(el).color), "rgb(241, 245, 249)");
      assert.equal(await page.getByTestId("solid-danger").evaluate((el) => getComputedStyle(el).color), "rgb(255, 255, 255)");
      const darkHoverSurface = page.getByTestId("hover-surface");
      assert.match(await darkHoverSurface.evaluate((el) => getComputedStyle(el).backgroundColor), /rgba?\(0, 0, 0, 0\)|transparent/);
      await darkHoverSurface.hover();
      assert.equal(await darkHoverSurface.evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(7, 12, 24)");
      assert.equal(await page.getByTestId("department-date").evaluate((el) => getComputedStyle(el).colorScheme), "dark");
      await assertContrast(page, '[data-testid="normal-text"]', '[data-testid="normal-text"]', 4.5, "dark normal text");
      await assertContrast(page, '[data-testid="status-text"]', '[data-testid="status-text"]', 4.5, "dark status text");
      await assertContrast(page, '[data-testid="expanded-document-row"]', '[data-testid="expanded-document-row"]', 4.5, "dark expanded document text");
      await assertContrast(page, '[data-testid="cleared-card"]', '[data-testid="cleared-card"]', 4.5, "dark cleared card text");
      await assertContrast(page, '[data-testid="cleared-badge"]', '[data-testid="cleared-badge"]', 4.5, "dark cleared badge text");
      await assertContrast(page, '[data-testid="amber-status"]', '[data-testid="amber-status"]', 4.5, "dark amber status text");
      await assertContrast(page, '[data-testid="rose-status"]', '[data-testid="rose-status"]', 4.5, "dark rose status text");
      await assertContrast(page, '[data-testid="blue-status"]', '[data-testid="blue-status"]', 4.5, "dark blue status text");
      await assertContrast(page, '[data-testid="large-text"]', '[data-testid="large-text"]', 3, "dark large text");
      await assertContrast(page, 'button[aria-label="Switch to light mode"]', '[data-portal]', 3, "dark theme toggle");
      await waitForStoredTheme(page, "dark");
      await page.reload();
      await waitForClass(page, "dark");
      assert.equal(await page.getByRole("button", { name: "Switch to light mode" }).isVisible(), true);
      await context.close();
    }

    {
      const context = await browser.newContext({ colorScheme: "light", reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(`${origin}/?area=clearance`);
      await waitForClass(page, "light");
      const reducedMotion = await page.getByRole("button", { name: "Switch to dark mode" }).evaluate((el) => {
        const style = getComputedStyle(el);
        return { transitionProperty: style.transitionProperty, animationName: style.animationName };
      });
      assert.equal(reducedMotion.animationName, "none");
      assert.equal(reducedMotion.transitionProperty.includes("transform"), false);
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
      await second.goto(`${origin}/?area=clearance`);
      await waitForClass(second, "dark");
      assert.equal(await second.locator("[data-portal]").getAttribute("data-portal"), "clearance");
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

    if (process.env.WEB_C_BASE_URL) {
      const scenarios = [
        { saved: "light", device: "dark" },
        { saved: "dark", device: "light" },
      ];
      let portalScenarios = 0;
      let firstPaintScenarios = 0;
      for (const scenario of scenarios) {
        const context = await browser.newContext({ colorScheme: scenario.device });
        await context.addInitScript((theme) => localStorage.setItem("theme", theme), scenario.saved);
        await context.route("**/_next/static/**/*.js", async (route) => {
          try {
            const response = await route.fetch();
            const body = await response.body();
            setTimeout(() => route.fulfill({ response, body }).catch(() => {}), 350);
          } catch {
            await route.continue();
          }
        });
        const page = await context.newPage();
        const hydrationErrors = [];
        page.on("console", (message) => {
          if (message.type() === "error" && /hydration|uncaught|error/i.test(message.text())) hydrationErrors.push(message.text());
        });
        page.on("pageerror", (error) => hydrationErrors.push(error.message));
        await page.goto(process.env.WEB_C_BASE_URL, { waitUntil: "commit" });
        await page.waitForTimeout(60);
        const firstFrame = await page.locator("[data-portal]").count()
          ? await page.locator("[data-portal]").first().evaluate((el) => getComputedStyle(el).backgroundColor)
          : null;
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(300);
        if (await page.locator("[data-portal]").count()) {
          portalScenarios += 1;
          await waitForClass(page, scenario.saved);
          const expectedCanvas = scenario.saved === "dark" ? "rgb(6, 10, 20)" : "rgb(244, 246, 250)";
          if (firstFrame) {
            firstPaintScenarios += 1;
            assert.equal(firstFrame, expectedCanvas);
          }
          assert.equal(await page.locator("[data-portal]").first().evaluate((el) => getComputedStyle(el).backgroundColor), expectedCanvas);
          assert.deepEqual(hydrationErrors, []);
        }
        await context.close();
      }
      console.log(portalScenarios === scenarios.length && firstPaintScenarios === scenarios.length
        ? "PASS: optional live app theme checks (authenticated portal and first frames reached)."
        : portalScenarios > 0
        ? "SKIP: optional live app theme checks (portal reached, but authenticated first frames were not all observable)."
        : "SKIP: optional live app theme checks (no authenticated portal at WEB_C_BASE_URL).");
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
