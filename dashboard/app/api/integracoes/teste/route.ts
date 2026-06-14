import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASE = 'https://discord.com/api/v10';

export async function POST(req: NextRequest) {
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) return NextResponse.json({ erro: 'Token nao configurado' }, { status: 500 });

    const { canalId, mensagem } = await req.json();
    if (!canalId || !mensagem) {
      return NextResponse.json({ erro: 'canalId e mensagem obrigatorios' }, { status: 400 });
    }

    const res = await fetch(`${BASE}/channels/${canalId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: mensagem }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erro ao enviar' }));
      return NextResponse.json({ erro: err.message }, { status: 500 });
    }

    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
