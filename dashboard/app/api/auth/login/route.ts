import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ erro: 'DISCORD_CLIENT_ID nao configurado' }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/callback`;

  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify guilds');

  return NextResponse.redirect(url.toString());
}
