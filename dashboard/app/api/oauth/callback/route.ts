import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const OAUTH_CONFIG: Record<string, {
  tokenUrl: string;
  userInfoUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  platformName: string;
  mapUser: (data: unknown) => { contaId: string; nomeConta: string; avatarUrl: string };
}> = {
  youtube: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    platformName: 'youtube',
    mapUser: (data: unknown) => {
      const d = data as { items?: [{ id: string; snippet: { title: string; thumbnails: { default: { url: string } } } }] };
      const channel = d?.items?.[0];
      return {
        contaId: channel?.id || '',
        nomeConta: channel?.snippet?.title || 'Canal YouTube',
        avatarUrl: channel?.snippet?.thumbnails?.default?.url || '',
      };
    },
  },
  twitch: {
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    userInfoUrl: 'https://api.twitch.tv/helix/users',
    clientIdEnv: 'TWITCH_CLIENT_ID',
    clientSecretEnv: 'TWITCH_CLIENT_SECRET',
    platformName: 'twitch',
    mapUser: (data: unknown) => {
      const d = data as { data?: [{ id: string; login: string; display_name: string; profile_image_url: string }] };
      const user = d?.data?.[0];
      return {
        contaId: user?.id || '',
        nomeConta: user?.display_name || user?.login || 'Streamer',
        avatarUrl: user?.profile_image_url || '',
      };
    },
  },
};

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const plataforma = req.nextUrl.searchParams.get('plataforma');
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const config = OAUTH_CONFIG[plataforma || ''];

  if (!code || !config) {
    return NextResponse.redirect(new URL('/integracoes?erro=parametros', baseUrl));
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/integracoes?erro=config', baseUrl));
  }

  try {
    const redirectUri = `${baseUrl}/api/oauth/callback?plataforma=${plataforma}`;

    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token error:', await tokenRes.text());
      return NextResponse.redirect(new URL('/integracoes?erro=token', baseUrl));
    }

    const tokenData = await tokenRes.json();

    const userRes = await fetch(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        ...(plataforma === 'twitch' ? { 'Client-Id': clientId } : {}),
      },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/integracoes?erro=user', baseUrl));
    }

    const userData = await userRes.json();
    const mapped = config.mapUser(userData);

    const saveRes = await fetch(`${baseUrl}/api/integracoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plataforma,
        nomeConta: mapped.nomeConta,
        avatarUrl: mapped.avatarUrl,
        contaId: mapped.contaId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpira: tokenData.expires_in
          ? Date.now() + tokenData.expires_in * 1000
          : null,
      }),
    });

    if (!saveRes.ok) {
      return NextResponse.redirect(new URL('/integracoes?erro=save', baseUrl));
    }

    return NextResponse.redirect(new URL('/integracoes?sucesso=1', baseUrl));
  } catch (erro) {
    console.error('OAuth error:', erro);
    return NextResponse.redirect(new URL('/integracoes?erro=desconhecido', baseUrl));
  }
}
