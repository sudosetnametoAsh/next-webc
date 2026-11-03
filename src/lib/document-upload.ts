// Shared by both submission forms and the upload API.
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  csv: "text/csv",
};
export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_MIME_TYPES).map((ext) => `.${ext}`).join(",");
export const DOCUMENT_FORMAT_LABEL = "PDF, DOCX, TXT, CSV, PNG, JPG, WEBP · max 10 MB";

export function getDocumentMimeType(name: string): string | undefined {
  return DOCUMENT_MIME_TYPES[name.split(".").pop()?.toLowerCase() || ""];
}

export function validateDocumentUpload(file: { name: string; size: number }): string | null {
  if (!getDocumentMimeType(file.name)) return "Unsupported file type. " + DOCUMENT_FORMAT_LABEL;
  if (!file.size) return "The selected file is empty.";
  if (file.size > MAX_DOCUMENT_BYTES) return "File size exceeds 10MB limit.";
  return null;
}
