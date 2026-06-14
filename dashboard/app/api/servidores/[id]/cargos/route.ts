import { NextResponse } from 'next/server';

const BASE = 'https://discord.com/api/v10';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) return NextResponse.json({ erro: 'Token nao configurado' }, { status: 500 });

    const res = await fetch(`${BASE}/guilds/${params.id}/roles`, {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!res.ok) {
      return NextResponse.json({ erro: 'Erro ao buscar cargos' }, { status: 500 });
    }

    const roles = await res.json();

    const cargos = roles.map((r: { id: string; name: string; color: number; position: number }) => ({
      id: r.id,
      nome: r.name,
      cor: r.color,
      posicao: r.position,
    }));

    return NextResponse.json(cargos);
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
