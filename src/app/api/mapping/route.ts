import { NextRequest, NextResponse } from "next/server";
import { loadMappingConfig, saveUpdatedConfig } from '@/lib/imobzi';

export async function GET() {
  try {
    const config = await loadMappingConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Erro ao ler mapeamento:", error);
    return NextResponse.json({ error: "Erro ao ler arquivo de mapeamento" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await saveUpdatedConfig(body);
    return NextResponse.json({ success: true, message: "Mapeamento salvo com sucesso!" });
  } catch (error) {
    console.error("Erro ao salvar mapeamento:", error);
    return NextResponse.json({ error: "Erro ao salvar mapeamento" }, { status: 500 });
  }
}
