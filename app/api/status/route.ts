import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'SUTRA',
    version: '1.0.0',
  });
}
