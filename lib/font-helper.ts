import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const FONT_URLS = [
  "/api/font",
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/nanumgothic/NanumGothic-Regular.ttf",
  "https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/NanumGothic-Regular.ttf",
  "https://fonts.gstatic.com/s/nanumgothic/v23/PN_oRfi-QwtS4YL5Z65EtlqMy5rs1As.ttf",
];

let cachedFontBytes: ArrayBuffer | null = null;

/**
 * Loads Korean NanumGothic TTF font bytes with automatic mirror fallback and in-memory caching.
 */
export async function loadKoreanFontBytes(): Promise<ArrayBuffer> {
  if (cachedFontBytes) {
    return cachedFontBytes;
  }

  for (const url of FONT_URLS) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 10000) {
          cachedFontBytes = buffer;
          return buffer;
        }
      }
    } catch (e) {
      console.warn(`[PDF Font] Failed loading font from ${url}, trying next mirror...`, e);
    }
  }

  throw new Error("한글 폰트(나눔고딕)를 다운로드할 수 없습니다. 인터넷 연결을 확인해 주세요.");
}

/**
 * Registers fontkit with PDFDocument, handling any bundler ESM/CJS interop.
 */
export function registerFontkitSafe(pdfDoc: PDFDocument) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fk = (fontkit as any).default || fontkit;
  pdfDoc.registerFontkit(fk);
}
