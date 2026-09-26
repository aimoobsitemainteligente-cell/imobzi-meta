import { NextResponse } from 'next/server';
import { mockEvents } from '@/lib/tv/mock';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');
  return NextResponse.json(mockEvents);
}
