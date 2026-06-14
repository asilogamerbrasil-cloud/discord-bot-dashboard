import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASE = 'https://discord.com/api/v10';

async function discordFetch(endpoint: string, options: RequestInit = {}) {
  const token = process.env.DISCORD_TOKEN;
  if (!token) throw new Error('DISCORD_TOKEN nao configurado');

  const headers: Record<string, string> = {
    Authorization: `Bot ${token}`,
    ...options.headers as Record<string, string> || {},
  };

  if (options.method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const errMsg = errText ? (() => { try { return JSON.parse(errText).message; } catch { return errText.substring(0, 200); } })() : res.statusText;
    throw new Error(errMsg || `Erro ${res.status}`);
  }

  if (res.status === 204) return { sucesso: true };
  return res.json();
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await discordFetch(`/users/@me/guilds/${params.id}`, { method: 'DELETE' });
    return NextResponse.json({ sucesso: true });
  } catch (erro: unknown) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { nickname } = await req.json();
    await discordFetch(`/guilds/${params.id}/members/@me`, {
      method: 'PATCH',
      body: JSON.stringify({ nick: nickname || '' }),
    });
    return NextResponse.json({ sucesso: true });
  } catch (erro: unknown) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 500 });
  }
}
