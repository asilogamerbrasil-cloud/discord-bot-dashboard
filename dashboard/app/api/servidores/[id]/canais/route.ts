import { NextResponse } from 'next/server';

const BASE = 'https://discord.com/api/v10';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) return NextResponse.json({ erro: 'Token nao configurado' }, { status: 500 });

    const res = await fetch(`${BASE}/guilds/${params.id}/channels`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ erro: 'Erro ao buscar canais' }, { status: 500 });
    }

    const channels = await res.json();

    const canaisTexto = channels
      .filter((c: { type: number }) => c.type === 0)
      .map((c: { id: string; name: string }) => ({
        id: c.id,
        nome: c.name,
      }));

    return NextResponse.json(canaisTexto);
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
