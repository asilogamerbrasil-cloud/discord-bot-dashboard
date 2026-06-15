import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { integracoes } from '@/lib/schema';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';

type StatusPlataforma = 'online' | 'error' | 'offline' | 'unknown';

interface StatusResult {
  plataforma: string;
  status: StatusPlataforma;
  nome: string | null;
  mensagem?: string;
}

async function checkYoutube(i: typeof integracoes.$inferSelect): Promise<StatusResult> {
  if (!i.accessToken || !i.contaId) {
    return { plataforma: 'youtube', status: 'offline', nome: i.nomeConta, mensagem: 'Sem token' };
  }
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&mine=true`,
      { headers: { Authorization: `Bearer ${i.accessToken}` } }
    );
    if (res.ok) {
      return { plataforma: 'youtube', status: 'online', nome: i.nomeConta };
    }
    return { plataforma: 'youtube', status: 'error', nome: i.nomeConta, mensagem: `HTTP ${res.status}` };
  } catch {
    return { plataforma: 'youtube', status: 'error', nome: i.nomeConta, mensagem: 'Erro de conexao' };
  }
}

async function checkTwitch(i: typeof integracoes.$inferSelect): Promise<StatusResult> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  if (!i.accessToken || !i.contaId || !clientId) {
    return { plataforma: 'twitch', status: 'offline', nome: i.nomeConta, mensagem: 'Sem token' };
  }
  try {
    const res = await fetch('https://api.twitch.tv/helix/users', {
      headers: { Authorization: `Bearer ${i.accessToken}`, 'Client-Id': clientId },
    });
    if (res.ok) {
      return { plataforma: 'twitch', status: 'online', nome: i.nomeConta };
    }
    return { plataforma: 'twitch', status: 'error', nome: i.nomeConta, mensagem: `HTTP ${res.status}` };
  } catch {
    return { plataforma: 'twitch', status: 'error', nome: i.nomeConta, mensagem: 'Erro de conexao' };
  }
}

async function checkShopee(i: typeof integracoes.$inferSelect): Promise<StatusResult> {
  if (!i.accessToken || !i.contaId) {
    return { plataforma: 'shopee', status: 'offline', nome: i.nomeConta, mensagem: 'Sem credenciais' };
  }
  try {
    const query = `query($keyword: String!, $limit: Int) { productOfferV2(keyword: $keyword, limit: $limit) { nodes { productName } } }`;
    const body = { query, variables: { keyword: 'teste', limit: 1 } };
    const bodyString = JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000);
    const factor = `${i.contaId}${timestamp}${bodyString}${i.accessToken}`;
    const signature = createHash('sha256').update(factor, 'utf8').digest('hex');
    const auth = `SHA256 Credential=${i.contaId},Timestamp=${timestamp},Signature=${signature}`;

    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
      },
      body: bodyString,
    });
    if (!res.ok) {
      return { plataforma: 'shopee', status: 'error', nome: i.nomeConta, mensagem: `HTTP ${res.status}` };
    }
    const json = await res.json();
    if (json.errors) {
      return { plataforma: 'shopee', status: 'error', nome: i.nomeConta, mensagem: json.errors[0]?.message || 'Erro GraphQL' };
    }
    return { plataforma: 'shopee', status: 'online', nome: i.nomeConta };
  } catch {
    return { plataforma: 'shopee', status: 'error', nome: i.nomeConta, mensagem: 'Erro de conexao' };
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const todas = await db.select().from(integracoes).orderBy(integracoes.criadoEm);

    if (todas.length === 0) {
      return NextResponse.json({
        timestamp: Date.now(),
        servico: 'online',
        geral: { total: 0, online: 0, error: 0, offline: 0, status: 'sem integracoes' as const },
        redesSociais: { total: 0, online: 0, error: 0, offline: 0 },
        afiliados: { total: 0, online: 0, error: 0, offline: 0 },
        plataformas: [] as StatusResult[],
      });
    }

    const checks = await Promise.allSettled(
      todas.map(async (i): Promise<StatusResult> => {
        if (!i.ativo) {
          return { plataforma: i.plataforma, status: 'offline', nome: i.nomeConta, mensagem: 'Desativado' };
        }

        switch (i.plataforma) {
          case 'youtube': return checkYoutube(i);
          case 'twitch': return checkTwitch(i);
          case 'tiktok': return { plataforma: 'tiktok', status: i.contaId ? 'online' : 'offline', nome: i.nomeConta, mensagem: i.contaId ? undefined : 'Nao conectado' };
          case 'instagram': return { plataforma: 'instagram', status: i.contaId ? 'online' : 'offline', nome: i.nomeConta, mensagem: i.contaId ? undefined : 'Nao conectado' };
          case 'shopee': return checkShopee(i);
          default: return { plataforma: i.plataforma, status: 'unknown', nome: i.nomeConta };
        }
      })
    );

    const results: StatusResult[] = checks.map((c, idx) => {
      if (c.status === 'fulfilled') return c.value;
      return { plataforma: todas[idx].plataforma, status: 'error', nome: todas[idx].nomeConta, mensagem: 'Falha na verificacao' };
    });

    const calcularResumo = (filtro: string[]) => {
      const r = results.filter(p => filtro.includes(p.plataforma));
      return {
        total: r.length,
        online: r.filter(p => p.status === 'online').length,
        error: r.filter(p => p.status === 'error').length,
        offline: r.filter(p => p.status === 'offline').length,
      };
    };

    const redesSociais = calcularResumo(['youtube', 'twitch', 'tiktok', 'instagram']);
    const afiliados = calcularResumo(['shopee']);
    const geral = {
      total: results.length,
      online: results.filter(r => r.status === 'online').length,
      error: results.filter(r => r.status === 'error').length,
      offline: results.filter(r => r.status === 'offline').length,
      status: results.some(r => r.status === 'error')
        ? ('erro' as const)
        : results.every(r => r.status === 'online')
          ? ('tudo certo' as const)
          : ('parcial' as const),
    };

    const servico = 'online' as const;

    return NextResponse.json({
      timestamp: Date.now(),
      servico,
      geral,
      redesSociais,
      afiliados,
      plataformas: results,
    });
  } catch (erro) {
    console.error('Status error:', erro);
    return NextResponse.json({
      timestamp: Date.now(),
      servico: 'online',
      geral: { total: 0, online: 0, error: 0, offline: 0, status: 'erro interno' },
      redesSociais: { total: 0, online: 0, error: 0, offline: 0 },
      afiliados: { total: 0, online: 0, error: 0, offline: 0 },
      plataformas: [],
    }, { status: 500 });
  }
}
