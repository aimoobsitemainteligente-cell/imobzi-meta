import { NextResponse } from "next/server";

export async function GET() {
  const verifyToken = process.env.META_VERIFY_TOKEN || "imobzimetatoken2026";
  const pageId = process.env.META_PAGE_ID || "923277277786867";

  return NextResponse.json({
    verifyToken,
    pageId,
  });
}
