import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { integracoes } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

const BASE_URL_PRD = 'https://dashboard-production-5c50.up.railway.app';

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
    userInfoUrl: 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    platformName: 'youtube',
    mapUser: (data: unknown) => {
      const d = data as { items?: [{ id: string; snippet: { title: string; thumbnails: { default: { url: string }; medium: { url: string }; high: { url: string } }; customUrl?: string }; statistics: { subscriberCount: string; videoCount: string; viewCount: string } }] };
      const channel = d?.items?.[0];
      return {
        contaId: channel?.id || '',
        nomeConta: channel?.snippet?.title || 'Canal YouTube',
        avatarUrl: channel?.snippet?.thumbnails?.high?.url || channel?.snippet?.thumbnails?.medium?.url || channel?.snippet?.thumbnails?.default?.url || '',
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
  const config = OAUTH_CONFIG[plataforma || ''];

  if (!code || !config) {
    return NextResponse.redirect(new URL('/integracoes?erro=parametros', BASE_URL_PRD));
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId || !clientSecret) {
    console.error(`OAuth missing: ${config.clientIdEnv}=${!!clientId} ${config.clientSecretEnv}=${!!clientSecret}`);
    return NextResponse.redirect(new URL('/integracoes?erro=config', BASE_URL_PRD));
  }

  try {
    const redirectUri = `${BASE_URL_PRD}/api/oauth/callback?plataforma=${plataforma}`;

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
      const errText = await tokenRes.text();
      console.error('Token exchange error:', errText.substring(0, 500));
      return NextResponse.redirect(new URL('/integracoes?erro=token', BASE_URL_PRD));
    }

    const tokenData = await tokenRes.json();

    const userRes = await fetch(config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        ...(plataforma === 'twitch' ? { 'Client-Id': clientId } : {}),
      },
    });

    if (!userRes.ok) {
      console.error('User info error:', await userRes.text().catch(() => ''));
      return NextResponse.redirect(new URL('/integracoes?erro=user', BASE_URL_PRD));
    }

    const userData = await userRes.json();
    const mapped = config.mapUser(userData);

    let metadata = null;
    if (plataforma === 'youtube') {
      const d = userData as { items?: [{ statistics?: { subscriberCount: string; videoCount: string; viewCount: string } }] };
      const stats = d?.items?.[0]?.statistics;
      if (stats) {
        metadata = JSON.stringify({
          inscritos: parseInt(stats.subscriberCount) || 0,
          videos: parseInt(stats.videoCount) || 0,
          visualizacoes: parseInt(stats.viewCount) || 0,
        });
      }
    }

    const db = getDb();
    const existente = await db
      .select()
      .from(integracoes)
      .where(eq(integracoes.plataforma, plataforma as 'youtube' | 'twitch'))
      .limit(1);

    if (existente.length > 0) {
      await db
        .update(integracoes)
        .set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenExpira: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
          nomeConta: mapped.nomeConta,
          avatarUrl: mapped.avatarUrl,
          contaId: mapped.contaId,
          metadata,
          atualizadoEm: new Date(),
        })
        .where(eq(integracoes.id, existente[0].id));
    } else {
      await db.insert(integracoes).values({
        plataforma: plataforma as 'youtube' | 'twitch' | 'tiktok' | 'instagram',
        nomeConta: mapped.nomeConta,
        avatarUrl: mapped.avatarUrl,
        contaId: mapped.contaId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpira: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
        metadata,
      });
    }

    return NextResponse.redirect(new URL('/integracoes?sucesso=1', BASE_URL_PRD));
  } catch (erro) {
    console.error('OAuth callback error:', erro);
    return NextResponse.redirect(new URL('/integracoes?erro=desconhecido', BASE_URL_PRD));
  }
}
