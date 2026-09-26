import { NextResponse } from 'next/server';
import { getTvLeadsFromDb } from '@/lib/db';
import { calculateDashboardData } from '@/lib/tv/aggregates';

export const revalidate = 0; // Dynamic route

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period') || 'hoje';
    const period = ['hoje', 'semana', 'mes', 'trimestre', 'todo_periodo'].includes(periodParam) ? periodParam : 'hoje';
    
    // Ler do banco de dados Neon (ultra-rápido, evita timeout da Vercel)
    const leads = await getTvLeadsFromDb();
    
    let dashboardData = calculateDashboardData(leads, period as 'hoje' | 'semana' | 'mes' | 'trimestre' | 'todo_periodo');
    
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Erro ao carregar dados da TV do Neon:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

