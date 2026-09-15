import { NextResponse } from "next/server";
import { getPageLeadForms } from "@/lib/meta";

export async function GET() {
  try {
    const forms = await getPageLeadForms();
    return NextResponse.json({ forms });
  } catch (error) {
    console.error("Erro ao listar formulários:", error);
    return NextResponse.json({ error: "Falha ao obter formulários" }, { status: 500 });
  }
}
