import { NextResponse } from 'next/server';

export async function GET() {
  const relevantKeys = [
    'DISCORD_CLIENT_ID',
    'DISCORD_CLIENT_SECRET', 
    'DISCORD_TOKEN',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'DATABASE_URL',
    'RAILWAY_SERVICE_ID',
    'RAILWAY_ENVIRONMENT_ID',
    'RAILWAY_PROJECT_ID',
  ];

  const env: Record<string, string> = {};
  for (const key of relevantKeys) {
    env[key] = process.env[key] ? 'SET' : 'MISSING';
  }
  
  return NextResponse.json({ env, cwd: process.cwd(), nodeEnv: process.env.NODE_ENV });
}
