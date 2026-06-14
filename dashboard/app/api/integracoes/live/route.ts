import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { integracoes } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const plataforma = req.nextUrl.searchParams.get('plataforma');

  if (!plataforma || !['youtube', 'twitch'].includes(plataforma)) {
    return NextResponse.json({ erro: 'Plataforma invalida' }, { status: 400 });
  }

  try {
    const db = getDb();
    const [integracao] = await db
      .select()
      .from(integracoes)
      .where(eq(integracoes.plataforma, plataforma as 'youtube' | 'twitch'))
      .limit(1);

    if (!integracao || !integracao.accessToken) {
      return NextResponse.json({ aoVivo: false });
    }

    if (plataforma === 'twitch') {
      const clientId = process.env.TWITCH_CLIENT_ID;
      if (!clientId) return NextResponse.json({ aoVivo: false });

      const streamRes = await fetch(`https://api.twitch.tv/helix/streams?user_id=${integracao.contaId}`, {
        headers: {
          'Authorization': `Bearer ${integracao.accessToken}`,
          'Client-Id': clientId,
        },
      });

      if (!streamRes.ok) return NextResponse.json({ aoVivo: false });

      const streamData = await streamRes.json() as { data?: [{ title: string; viewer_count: number; game_name: string }] };
      const stream = streamData.data?.[0];

      return NextResponse.json({
        aoVivo: !!stream,
        titulo: stream?.title || null,
        jogo: stream?.game_name || null,
        espectadores: stream?.viewer_count || 0,
        url: stream ? `https://twitch.tv/${integracao.nomeConta}` : null,
      });
    }

    if (plataforma === 'youtube') {
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${integracao.contaId}&eventType=live&type=video`,
        { headers: { Authorization: `Bearer ${integracao.accessToken}` } }
      );

      if (!searchRes.ok) return NextResponse.json({ aoVivo: false });

      const searchData = await searchRes.json() as { items?: [{ id: { videoId: string }; snippet: { title: string } }] };
      const live = searchData.items?.[0];

      return NextResponse.json({
        aoVivo: !!live,
        titulo: live?.snippet?.title || null,
        url: live ? `https://youtube.com/watch?v=${live.id.videoId}` : null,
      });
    }

    return NextResponse.json({ aoVivo: false });
  } catch (erro) {
    console.error('Live status error:', erro);
    return NextResponse.json({ aoVivo: false });
  }
}
