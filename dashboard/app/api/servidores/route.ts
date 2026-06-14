import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      return NextResponse.json({ erro: 'DISCORD_TOKEN nao configurado' }, { status: 500 });
    }

    const resposta = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bot ${token}` },
    });

    if (!resposta.ok) {
      return NextResponse.json({ erro: 'Erro ao buscar servidores' }, { status: 500 });
    }

    const guilds = await resposta.json();

    const servidores = guilds.map((g: { id: string; name: string; icon: string | null; owner: boolean }) => ({
      id: g.id,
      nome: g.name,
      icone: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
        : null,
      dono: g.owner,
    }));

    return NextResponse.json(servidores);
  } catch (erro) {
    console.error('Erro ao buscar servidores:', erro);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
