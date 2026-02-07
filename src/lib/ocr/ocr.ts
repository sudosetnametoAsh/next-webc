import { execFile } from "child_process";
import { unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

export default async function VerifyDocument({
  rules,
  file,
}: {
  rules: string[];
  file: File;
}): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const tempPath = path.join(tmpdir(), `${Date.now()}-${file.name}`);
  await writeFile(tempPath, buffer);

  try {
    const ocr_text = await new Promise<string>((resolve, reject) => {
      execFile(
        "tesseract",
        [tempPath, "stdout", "-l", "eng"],
        { timeout: 15000 },
        (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        },
      );
    });

    const ocr_result = ocr_text.toLowerCase();

    const ocr_check = rules.filter((keyword) =>
      ocr_result.includes(keyword.trim()),
    );

    const isValid = ocr_check.length > 5;

    let status: string;
    if (isValid) {
      status = "Verified";
    } else {
      status = "Flagged";
    }

    return status;
  } catch (error) {
    console.error("OCR Error:", error);
    return "An Error occured verifying your document, please try again";
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
