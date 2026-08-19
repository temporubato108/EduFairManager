import { NextResponse } from "next/server";

export const revalidate = 31536000; // 1 year cache

const FONT_MIRRORS = [
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/nanumgothic/NanumGothic-Regular.ttf",
  "https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/NanumGothic-Regular.ttf",
  "https://fonts.gstatic.com/s/nanumgothic/v23/PN_oRfi-QwtS4YL5Z65EtlqMy5rs1As.ttf",
];

export async function GET() {
  for (const url of FONT_MIRRORS) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EduFairManager/1.0)",
        },
      });

      if (res.ok) {
        const fontBytes = await res.arrayBuffer();
        if (fontBytes.byteLength > 10000) {
          return new NextResponse(fontBytes, {
            headers: {
              "Content-Type": "font/ttf",
              "Cache-Control": "public, max-age=31536000, immutable",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      }
    } catch (err) {
      console.warn(`[Font API] Failed fetching font from ${url}:`, err);
    }
  }

  return NextResponse.json(
    { error: "Failed to fetch Korean TTF font from all mirrors" },
    { status: 502 }
  );
}
