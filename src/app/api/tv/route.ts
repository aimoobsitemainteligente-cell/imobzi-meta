import { NextResponse } from 'next/server';
import { getSheetsData } from '@/lib/tv/sheets';
import { calculateDashboardData } from '@/lib/tv/aggregates';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period') || 'hoje';
    const period = ['hoje', 'semana', 'mes', 'todo_periodo'].includes(periodParam) ? periodParam : 'hoje';
    
    const leads = await getSheetsData();
    let dashboardData = calculateDashboardData(leads, period as 'hoje' | 'semana' | 'mes' | 'todo_periodo');
    
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Erro ao carregar dados do sheets:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

