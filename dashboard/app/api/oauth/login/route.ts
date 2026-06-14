import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const OAUTH_CONFIG: Record<string, {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scope: string;
  extraParams?: Record<string, string>;
}> = {
  youtube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  twitch: {
    authUrl: 'https://id.twitch.tv/oauth2/authorize',
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    userInfoUrl: 'https://api.twitch.tv/helix/users',
    clientIdEnv: 'TWITCH_CLIENT_ID',
    clientSecretEnv: 'TWITCH_CLIENT_SECRET',
    scope: 'user:read:email',
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
      erro: `${config.clientIdEnv} nao configurado. Configure no painel do Railway.`,
    }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/oauth/callback?plataforma=${plataforma}`;

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
