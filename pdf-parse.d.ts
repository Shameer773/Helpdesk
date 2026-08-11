declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  function pdfParse(dataBuffer: Buffer): Promise<PDFData>;
  export default pdfParse;
}
