import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BASE = 'https://discord.com/api/v10';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) return NextResponse.json({ erro: 'Token nao configurado' }, { status: 500 });

    const { canalId, messageId, emoji, customId } = await req.json();

    if (customId) {
      // Click a button - this requires the bot's interaction handler
      // Discord API: POST /interactions/{interactionId}/{interactionToken}/callback
      // But we don't have the interaction token stored...
      // For buttons we need a different approach
      return NextResponse.json({
        erro: 'Clique em botao requer o token de interacao. Use reacoes para verificacao.',
      }, { status: 400 });
    }

    if (canalId && messageId && emoji) {
      const emojiStr = emoji.id
        ? `${emoji.nome}:${emoji.id}`
        : encodeURIComponent(emoji.nome);

      const res = await fetch(
        `${BASE}/channels/${canalId}/messages/${messageId}/reactions/${emojiStr}/@me`,
        {
          method: 'PUT',
          headers: { Authorization: `Bot ${token}` },
        }
      );

      if (!res.ok && res.status !== 204) {
        return NextResponse.json({ erro: 'Erro ao reagir' }, { status: 500 });
      }

      return NextResponse.json({ sucesso: true });
    }

    return NextResponse.json({ erro: 'Parametros invalidos' }, { status: 400 });
  } catch (erro) {
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
