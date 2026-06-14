import { NextResponse } from 'next/server';
import { criarSessao } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(new URL('/login?erro=sem_codigo', baseUrl));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?erro=token', baseUrl));
  }

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Discord token error:', errText);
      return NextResponse.redirect(new URL('/login?erro=token', baseUrl));
    }

    const tokenData = await tokenRes.json();

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/login?erro=user', baseUrl));
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

    return NextResponse.redirect(new URL('/', baseUrl));
  } catch (erro) {
    console.error('Callback error:', erro);
    return NextResponse.redirect(new URL('/login?erro=desconhecido', baseUrl));
  }
}
