import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASE = 'https://discord.com/api/v10';

async function discordFetch(endpoint: string, options: RequestInit = {}) {
  const token = process.env.DISCORD_TOKEN;
  if (!token) throw new Error('DISCORD_TOKEN nao configurado');

  const res = await fetch(`${BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erro ${res.status}`);
  }

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
