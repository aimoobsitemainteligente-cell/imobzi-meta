import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const historyFilePath = path.join(process.cwd(), "src", "data", "leads-history.json");

export async function GET() {
  try {
    if (!fs.existsSync(historyFilePath)) {
      return NextResponse.json({ leads: [] });
    }
    const data = fs.readFileSync(historyFilePath, "utf8");
    const leads = JSON.parse(data);
    return NextResponse.json({ leads });
  } catch (error) {
    console.error("Erro ao ler histórico de leads:", error);
    return NextResponse.json({ error: "Erro ao ler histórico" }, { status: 500 });
  }
}
