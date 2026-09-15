import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const mappingFilePath = path.join(process.cwd(), "src", "data", "field-mapping.json");

export async function GET() {
  try {
    if (!fs.existsSync(mappingFilePath)) {
      return NextResponse.json({ mappings: [], defaultLeadSource: "Facebook Leads" });
    }
    const data = fs.readFileSync(mappingFilePath, "utf8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error("Erro ao ler mapeamento:", error);
    return NextResponse.json({ error: "Erro ao ler arquivo de mapeamento" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Garantir que o diretório data existe
    const dataDir = path.dirname(mappingFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(mappingFilePath, JSON.stringify(body, null, 2), "utf8");
    return NextResponse.json({ success: true, message: "Mapeamento salvo com sucesso!" });
  } catch (error) {
    console.error("Erro ao salvar mapeamento:", error);
    return NextResponse.json({ error: "Erro ao salvar mapeamento" }, { status: 500 });
  }
}
