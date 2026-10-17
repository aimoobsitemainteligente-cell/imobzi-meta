import { NextRequest, NextResponse } from "next/server";
import { runCapiSync } from "@/lib/capi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sincroniza etapas do Imobzi com a Central de Leads da Meta (Conversions API).
// Protegida por CRON_SECRET (Authorization: Bearer <CRON_SECRET>, padrão do Vercel Cron).
// ?dry=1 só calcula, sem enviar. ?test_event_code=XXX envia como evento de teste (não grava no banco).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  try {
    const result = await runCapiSync({
      dryRun: searchParams.get("dry") === "1",
      testEventCode: searchParams.get("test_event_code") || undefined,
      lookbackDays: searchParams.get("days") ? Number(searchParams.get("days")) : undefined,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[CAPI SYNC] Erro:", err?.message || err);
    return NextResponse.json({ error: "Erro no sync CAPI" }, { status: 500 });
  }
}
