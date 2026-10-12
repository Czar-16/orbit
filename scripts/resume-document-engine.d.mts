import type { TailoredItem } from "../src/lib/tailored-resume";
export type Layout = {
  plan: {
    id: string;
    text: string;
    page: number;
    x: number;
    y: number;
    size: number;
    font: string;
    width: number;
    lineHeight: number;
  }[];
  paragraphs: {
    id: string;
    text: string;
    font: string;
    size: number;
    kind: string;
    entryId: string | null;
    section: string;
    lines: string[];
    lineHeight: number;
    gap: number;
    height: number;
    page: number;
  }[];
  pages: number;
};
export const TEMPLATE_VERSION: string;
export function planDocument(
  items: Pick<TailoredItem, "id" | "text" | "kind" | "section" | "entryId">[],
): Layout;
export function validatePdf(
  bytes: Uint8Array,
  layout: Layout,
): Promise<Record<string, unknown>>;
export function validateDocx(
  bytes: Uint8Array,
  paragraphs: Layout["paragraphs"],
): Promise<Record<string, unknown>>;
export function generateDocuments(
  items: Pick<TailoredItem, "id" | "text" | "kind" | "section" | "entryId">[],
): Promise<{
  pdf: Buffer;
  docx: Buffer;
  pdfValidation: Record<string, unknown>;
  docxValidation: Record<string, unknown>;
  templateVersion: string;
}>;
