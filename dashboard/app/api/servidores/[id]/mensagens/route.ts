import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASE = 'https://discord.com/api/v10';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) return NextResponse.json({ erro: 'Token nao configurado' }, { status: 500 });

    const canalId = req.nextUrl.searchParams.get('canal');
    if (!canalId) return NextResponse.json({ erro: 'Parametro canal obrigatorio' }, { status: 400 });

    const res = await fetch(
      `${BASE}/channels/${canalId}/messages?limit=20`,
      { headers: { Authorization: `Bot ${token}` } }
    );

    if (!res.ok) {
      return NextResponse.json({ erro: 'Erro ao buscar mensagens' }, { status: 500 });
    }

    const messages = await res.json();

    const mensagens = messages.map((m: {
      id: string;
      content: string;
      author: { id: string; username: string; avatar: string | null; bot?: boolean };
      timestamp: string;
      embeds?: { title?: string; description?: string; fields?: { name: string; value: string }[] }[];
      components?: { type: number; components: { type: number; style: number; label?: string; custom_id?: string; emoji?: { name: string; id?: string }; disabled?: boolean }[] }[];
      reactions?: { emoji: { name: string; id?: string }; count: number }[];
      attachments?: { url: string; filename: string }[];
    }) => ({
      id: m.id,
      conteudo: m.content || '',
      autor: {
        id: m.author.id,
        nome: m.author.username,
        avatar: m.author.avatar
          ? `https://cdn.discordapp.com/avatars/${m.author.id}/${m.author.avatar}.png`
          : null,
        bot: m.author.bot || false,
      },
      data: m.timestamp,
      embeds: (m.embeds || []).map((e) => ({
        titulo: e.title,
        descricao: e.description,
        campos: e.fields,
      })),
      botoes: (m.components || []).flatMap((row) =>
        (row.components || [])
          .filter((c) => c.type === 2)
          .map((c) => ({
            label: c.label || '',
            customId: c.custom_id || '',
            estilo: c.style,
            emoji: c.emoji || null,
            disabled: c.disabled || false,
          }))
      ),
      reacoes: (m.reactions || []).map((r) => ({
        emoji: r.emoji.id
          ? { id: r.emoji.id, nome: r.emoji.name, animado: true }
          : { id: null, nome: r.emoji.name, animado: false },
        quantidade: r.count,
      })),
      anexos: (m.attachments || []).map((a) => ({
        url: a.url,
        nome: a.filename,
      })),
    }));

    return NextResponse.json(mensagens);
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
