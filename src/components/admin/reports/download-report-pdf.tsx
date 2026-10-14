import type { ReportView } from "@/lib/reports/types";

interface DownloadOptions {
  term: string;
  view: ReportView;
  generatedBy?: string;
  /** Public path to a PNG/JPG, e.g. "/logo.png". */
  logoSrc?: string;
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Fetches the logo and converts it to a data URL for react-pdf. Returns
 * undefined (instead of throwing) when the file is missing or is not a
 * PNG/JPG, so a bad logo path can never block the export.
 */
async function loadLogo(src?: string): Promise<string | undefined> {
  if (!src) return undefined;
  try {
    const res = await fetch(src);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    if (blob.type !== "image/png" && blob.type !== "image/jpeg") return undefined;
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

/**
 * Generates the PDF in the browser and triggers a download. The PDF is always
 * light and print-friendly, regardless of the app's current theme.
 * `@react-pdf/renderer` (~1 MB) is imported on click so it never lands in the
 * page's initial bundle or runs during SSR.
 */
export async function downloadReportPdf({ term, view, generatedBy, logoSrc }: DownloadOptions) {
  const [{ pdf }, { ReportDocument }, logo] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/admin/reports/report-document"),
    loadLogo(logoSrc),
  ]);

  const generatedAt = new Date();
  const blob = await pdf(
    <ReportDocument term={term} view={view} generatedAt={generatedAt} generatedBy={generatedBy} logo={logo} />,
  ).toBlob();

  const fileName = `clearance-report_${slug(term)}_${slug(view.scopeLabel)}_${generatedAt
    .toISOString()
    .slice(0, 10)}.pdf`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}