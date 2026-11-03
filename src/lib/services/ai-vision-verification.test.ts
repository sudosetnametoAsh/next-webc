import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyDocumentAuthenticity } from "./ai-vision-verification";
import { validateDocumentUpload } from "../document-upload";

const assessment = {
  isAuthentic: true, authenticityScore: 95, detectedStudentId: "2026-123",
  detectedStudentName: "Test Student", detectedDocType: "Receipt", issueDate: null,
  studentIdMatches: true, authenticityMarkers: ["Receipt number"], flags: [], summary: "Matches",
};
const params = {
  departmentName: "Cashier", taskTitle: "Receipt", taskDescription: "Submit receipt",
  expectedStudentId: "2026-123", fileBuffer: Buffer.from("test"), mimeType: "image/png",
};
const success = (value: unknown = assessment) => Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });

test("document verification routing and failure handling", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-key";
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
  });

  await t.test("routes PDFs as files and images as images", async () => {
    for (const mimeType of ["application/pdf", "image/png", "image/webp"]) {
      globalThis.fetch = async (_url, init) => {
        const body = JSON.parse(String(init?.body));
        assert.equal(body.messages[0].content[1].type, mimeType === "application/pdf" ? "file" : "image_url");
        return success();
      };
      const result = await verifyDocumentAuthenticity({ ...params, mimeType });
      assert.equal(result.isAuthentic, true);
      assert.equal(result.processingFailed, undefined);
    }
  });
  await t.test("retries a transient failure", async () => {
    let calls = 0;
    globalThis.fetch = async () => ++calls === 1 ? new Response("", { status: 503 }) : success();
    assert.equal((await verifyDocumentAuthenticity(params)).isAuthentic, true);
    assert.equal(calls, 2);
  });
  await t.test("malformed assessments go to manual review", async () => {
    globalThis.fetch = async () => success({ isAuthentic: "true", authenticityScore: 99 });
    assert.equal((await verifyDocumentAuthenticity(params)).processingFailed, true);
  });
  await t.test("permanent API errors are not retried", async () => {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response("", { status: 401 }); };
    assert.equal((await verifyDocumentAuthenticity(params)).processingFailed, true);
    assert.equal(calls, 1);
  });
  await t.test("text-only analysis cannot automatically clear documents", async () => {
    globalThis.fetch = async (_url, init) => {
      assert.equal(JSON.parse(String(init?.body)).messages[0].content[1].type, "text");
      return success();
    };
    const result = await verifyDocumentAuthenticity({ ...params, mimeType: "text/plain", fileBuffer: Buffer.from("Receipt for Test Student") });
    assert.equal(result.processingFailed, true);
    assert.equal(result.isAuthentic, false);
  });
  await t.test("extracts Word document text before analysis", async () => {
    globalThis.fetch = async (_url, init) => {
      const part = JSON.parse(String(init?.body)).messages[0].content[1];
      assert.equal(part.type, "text");
      assert.match(part.text, /Receipt for Test Student/);
      return success();
    };
    const result = await verifyDocumentAuthenticity({
      ...params,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileBuffer: Buffer.from("UEsDBBQAAAAIAEINY12sbhJangAAANwAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbF2PsQ7CMBBDf6XKitqrGBhQ24UdGPiBU3JtI5pLlBwF/p4EpA6Mlu1nubu9A6Xq5RZOvZpFwhEg6ZkcpsYH4uyMPjqULOMEAfUdJ4J92x5AexZiqaUw1NBdVorRGqquGOWMjnoFTx8NGK8fLiebTFPV6Vcry73CEBarUaxnWNn8bdZ+HK2mrV9oIXpNKVme3NJsjkPLu4KHoYPvqeEDUEsDBBQAAAAIAEINY112aMeJgAAAAKoAAAARAAAAd29yZC9kb2N1bWVudC54bWxFzkEOAiEMBdCrkDmAnbhwQZBDqBdAqDMkUyClE/T2wrhw85rmJ781TYfsd8Ik6k1bqrpdp1WkaIDqVyRXT7lg6tkrMznpKy/QMofC2WOtMS20wXmeL0Aupsmapp85fMYsAx6IvaHHWET1GvXAKuoue+hnDYx0yIfl8NcA/+/sF1BLAQIUAxQAAAAIAEINY12sbhJangAAANwAAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAgAQg1jXXZox4mAAAAAqgAAABEAAAAAAAAAAAAAAIABzwAAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAACAAIAgAAAAH4BAAAAAA==", "base64"),
    });
    assert.equal(result.processingFailed, true);
    assert.match(result.summary, /Text analyzed/);
  });
  await t.test("retries timeouts and empty completions", async () => {
    for (const failure of ["timeout", "empty"]) {
      let calls = 0;
      globalThis.fetch = async () => {
        if (++calls === 1) {
          if (failure === "timeout") throw new DOMException("Timed out", "TimeoutError");
          return Response.json({ choices: [] });
        }
        return success();
      };
      assert.equal((await verifyDocumentAuthenticity(params)).isAuthentic, true);
      assert.equal(calls, 2);
    }
  });
  await t.test("identity mismatches cannot retain a high score", async () => {
    globalThis.fetch = async () => success({ ...assessment, detectedStudentId: "99999999" });
    const result = await verifyDocumentAuthenticity(params);
    assert.equal(result.studentIdMatches, false);
    assert.ok(result.authenticityScore <= 15);
  });
  await t.test("upload validation accepts supported documents and rejects invalid files", () => {
    for (const name of ["test.pdf", "test.DOCX", "test.txt", "test.csv", "test.webp"]) {
      assert.equal(validateDocumentUpload({ name, size: 100 }), null);
    }
    assert.ok(validateDocumentUpload({ name: "test.exe", size: 100 }));
    assert.ok(validateDocumentUpload({ name: "test.pdf", size: 0 }));
    assert.ok(validateDocumentUpload({ name: "test.pdf", size: 11 * 1024 * 1024 }));
  });
});
