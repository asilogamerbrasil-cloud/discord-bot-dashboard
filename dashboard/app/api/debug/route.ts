import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || 'NAO_DEFINIDO',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NAO_DEFINIDO',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'DEFINIDO' : 'NAO_DEFINIDO',
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? 'DEFINIDO' : 'NAO_DEFINIDO',
    DATABASE_URL: process.env.DATABASE_URL || 'NAO_DEFINIDO',
  });
}
