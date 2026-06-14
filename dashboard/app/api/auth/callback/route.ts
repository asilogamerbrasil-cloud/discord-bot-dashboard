import { NextResponse } from 'next/server';
import { criarSessao } from '@/lib/auth';
import type { NextRequest } from 'next/server';

const DISCORD_CLIENT_ID = '1515429281126289638';
const DISCORD_CLIENT_SECRET = 'Dy3eFMa4uh5Ag1VtaNLeV6JJJzfOCHwR';
const REDIRECT_URI = 'https://dashboard-production-5c50.up.railway.app/api/auth/callback';
const BASE_URL = 'https://dashboard-production-5c50.up.railway.app';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?erro=sem_codigo', BASE_URL));
  }

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Discord token error:', await tokenRes.text());
      return NextResponse.redirect(new URL('/login?erro=token', BASE_URL));
    }

    const tokenData = await tokenRes.json();

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/login?erro=user', BASE_URL));
    }

    const userData = await userRes.json();

    await criarSessao({
      id: userData.id,
      nome: userData.global_name || userData.username,
      avatar: userData.avatar
        ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
        : null,
      accessToken: tokenData.access_token,
    });

    return NextResponse.redirect(new URL('/', BASE_URL));
  } catch (erro) {
    console.error('Callback error:', erro);
    return NextResponse.redirect(new URL('/login?erro=desconhecido', BASE_URL));
  }
}
