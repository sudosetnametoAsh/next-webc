export interface AIAssessmentResult {
  isAuthentic: boolean;
  authenticityScore: number; // 0 to 100 rating of document genuineness & requirement compliance
  detectedStudentId: string | null;
  detectedStudentName: string | null;
  detectedDocType: string;
  issueDate: string | null;
  studentIdMatches: boolean;
  authenticityMarkers: string[];
  flags: string[];
  summary: string;
  processingFailed?: boolean;
}

export interface VerifyDocumentParams {
  departmentName: string;
  taskTitle: string;
  taskDescription: string;
  expectedStudentId: string;
  expectedStudentName?: string;
  fileBuffer: Buffer | ArrayBuffer;
  mimeType: string;
}

export async function verifyDocumentAuthenticity({
  departmentName,
  taskTitle,
  taskDescription,
  expectedStudentId,
  expectedStudentName = "Student",
  fileBuffer,
  mimeType,
}: VerifyDocumentParams): Promise<AIAssessmentResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn(
      "OPENROUTER_API_KEY not configured. Falling back to default pending verification.",
    );
    return {
      isAuthentic: false,
      authenticityScore: 0,
      detectedStudentId: null,
      detectedStudentName: null,
      detectedDocType: "Unverified Document",
      issueDate: null,
      studentIdMatches: false,
      authenticityMarkers: [],
      flags: ["AI Verification service unavailable (missing API key)"],
      summary: "Manual review required: AI service key not configured.",
      processingFailed: true,
    };
  }

  try {
    const base64 = Buffer.isBuffer(fileBuffer)
      ? fileBuffer.toString("base64")
      : Buffer.from(fileBuffer).toString("base64");

    const effectiveMimeType = mimeType || "image/jpeg";
    const dataUrl = `data:${effectiveMimeType};base64,${base64}`;

    const promptText = `
You are an institutional academic clearance document verification assistant.
Your task is to inspect an uploaded clearance document and determine its authenticity, requirement compliance, and student identity match.

[TASK CONTEXT]
- Clearance Office / Department: ${departmentName}
- Requirement Title: ${taskTitle}
- Requirement Instructions: ${taskDescription}

[EXPECTED STUDENT PROFILE]
- Expected Student ID: ${expectedStudentId}
- Expected Student Name: ${expectedStudentName}

Inspect the visual document carefully:
1. Document Type: What official document is this (e.g. Official Receipt, Medical Clearance Certificate, Laboratory Equipment Return Slip, Library Return Voucher, Survey Slip)?
2. Requirement Compliance: Does this document fulfill the requirement described in the instructions?
3. Student Identity Match: Look for any Student ID number, name, or initials on the document. Does it match the expected student account (${expectedStudentId} / ${expectedStudentName})? If the document is a generic receipt or certificate without a student ID but matches the name or context, reflect that. If a DIFFERENT student ID is detected, flag it as a mismatch.
4. Institutional Authenticity: Are there official markers such as university/clinic headers, dry seals, official cashier receipt serial numbers, rubber stamps, or technician signatures?
5. Temporal Validity: Is the document dated reasonably for the current semester / school year?
6. Visual Tampering: Does the document appear genuine, or are there artifacts of tampering or alteration?

Respond with a raw, valid JSON object strictly matching this schema:
{
  "isAuthentic": boolean,
  "authenticityScore": number, // 0 to 100 rating of how genuine, legitimate, and compliant the document is. If the document is invalid, fake, unrelated (e.g. photos of objects/books/scenery), or non-compliant, authenticityScore MUST be low (0 to 15). Only authentic, fully compliant documents should receive a high score (85 to 100).
  "detectedStudentId": string | null,
  "detectedStudentName": string | null,
  "detectedDocType": string,
  "issueDate": string | null,
  "studentIdMatches": boolean,
  "authenticityMarkers": string[],
  "flags": string[],
  "summary": string
}
Do not include markdown codeblocks or conversational text. Return only the JSON object.
`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://next-webc.local",
        "X-Title": "NextWebC Clearance System",
      },
      body: JSON.stringify({
        // model: "google/gemini-2.5-flash",
        model: "deepseek/deepseek-v4.1-flash-1017",
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("OpenRouter Vision API Error:", res.status, errBody);
      return {
        isAuthentic: false,
        authenticityScore: 0,
        detectedStudentId: null,
        detectedStudentName: null,
        detectedDocType: "Uploaded File",
        issueDate: null,
        studentIdMatches: false,
        authenticityMarkers: [],
        flags: [`AI inspection returned HTTP ${res.status}`],
        summary:
          "Automated analysis encountered an error. Document queued for manual staff review.",
        processingFailed: true,
      };
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Empty response from AI vision model");
    }

    // Clean up in case model wrapped in markdown fences
    const cleanedJson = rawContent
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed: AIAssessmentResult = JSON.parse(cleanedJson);

    // Normalize authenticity score between 0 and 100
    let rawScore =
      typeof parsed.authenticityScore === "number"
        ? parsed.authenticityScore
        : 70;
    if (rawScore <= 1) rawScore = Math.round(rawScore * 100); // handle 0.0-1.0 scale if returned
    let score = Math.max(0, Math.min(100, Math.round(rawScore)));

    // Cross-check student ID matching if model was indeterminate
    let idMatches = parsed.studentIdMatches;
    if (parsed.detectedStudentId) {
      const normDetected = parsed.detectedStudentId
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
      const normExpected = expectedStudentId
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
      if (normDetected === normExpected) {
        idMatches = true;
      } else if (normDetected.length > 3 && normExpected.length > 3) {
        // Different ID explicitly detected
        idMatches = false;
        if (!parsed.flags.includes("Mismatched Student ID")) {
          parsed.flags.push(
            `Detected ID (${parsed.detectedStudentId}) does not match student account (${expectedStudentId})`,
          );
        }
      }
    }

    // Defensive guardrail: Inauthentic or mismatched documents must never receive a high authenticity score
    if (!parsed.isAuthentic || !idMatches) {
      if (score > 50) score = Math.max(0, 100 - score);
      score = Math.min(score, 15);
    }

    return {
      isAuthentic: !!parsed.isAuthentic,
      authenticityScore: score,
      detectedStudentId: parsed.detectedStudentId || null,
      detectedStudentName: parsed.detectedStudentName || null,
      detectedDocType: parsed.detectedDocType || "Institutional Document",
      issueDate: parsed.issueDate || null,
      studentIdMatches: idMatches ?? true,
      authenticityMarkers: Array.isArray(parsed.authenticityMarkers)
        ? parsed.authenticityMarkers
        : [],
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      summary: parsed.summary || "Document processed by AI vision engine.",
    };
  } catch (error: any) {
    console.error("verifyDocumentAuthenticity Error:", error);
    return {
      isAuthentic: false,
      authenticityScore: 0,
      detectedStudentId: null,
      detectedStudentName: null,
      detectedDocType: "Uploaded File",
      issueDate: null,
      studentIdMatches: false,
      authenticityMarkers: [],
      flags: [error.message || "Failed to parse document"],
      summary:
        "Manual review required: AI document analysis could not be completed.",
      processingFailed: true,
    };
  }
}
