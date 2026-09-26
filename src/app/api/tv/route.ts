import { NextResponse } from 'next/server';
import { getSheetsData } from '@/lib/tv/sheets';
import { calculateDashboardData } from '@/lib/tv/aggregates';


export async function GET() {
  try {
    const leads = await getSheetsData();
    const dashboardData = calculateDashboardData(leads);
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Erro ao carregar dados do sheets:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

