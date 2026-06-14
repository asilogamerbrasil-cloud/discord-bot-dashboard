import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASE_URL = 'https://dashboard-production-5c50.up.railway.app';

const OAUTH_CONFIG: Record<string, {
  authUrl: string;
  clientIdEnv: string;
  scope: string;
  extraParams?: Record<string, string>;
}> = {
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  twitch: {
    authUrl: 'https://id.twitch.tv/oauth2/authorize',
    clientIdEnv: 'TWITCH_CLIENT_ID',
    scope: 'user:read:email',
    extraParams: { force_verify: 'true' },
  },
  instagram: {
    authUrl: 'https://api.instagram.com/oauth/authorize',
    clientIdEnv: 'INSTAGRAM_CLIENT_ID',
    scope: 'user_profile,user_media',
  },
};

export async function GET(req: NextRequest) {
  const plataforma = req.nextUrl.searchParams.get('plataforma');
  const config = OAUTH_CONFIG[plataforma || ''];

  if (!config) {
    return NextResponse.json({ erro: 'Plataforma invalida' }, { status: 400 });
  }

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) {
    return NextResponse.json({
      erro: `${config.clientIdEnv} nao configurado. Configure no Railway.`,
    }, { status: 500 });
  }

  const redirectUri = `${BASE_URL}/api/oauth/callback?plataforma=${plataforma}`;

  const url = new URL(config.authUrl);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scope);

  if (config.extraParams) {
    Object.entries(config.extraParams).forEach(([k, v]) => {
      url.searchParams.set(k, v);
    });
  }

  return NextResponse.redirect(url.toString());
}
