// Import the inner module directly to avoid pdf-parse's index.js debug harness,
// which tries to read a sample file when required as the main module.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return (data.text ?? "").trim();
}
