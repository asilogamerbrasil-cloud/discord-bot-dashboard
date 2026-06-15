import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { mensagensProgramadas, integracoes, envioLogs } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

const T = () => new Date().toISOString();

interface ShopeeProduct {
  productId: string; productName: string; productImage: string;
  price: number; originalPrice: number; discount: number;
  rating: number; soldCount: number; commissionRate: number; shopName: string;
}

interface ShopeePresetDef {
  nome: string; emoji: string; cor: number;
  keywords: string[]; categoria: string; defaultOrdenacao: string;
}

const SHOPEE_PRESETS: Record<string, ShopeePresetDef> = {
  top5_monitores:       { nome: 'Top 5 do Mes em Monitores',      emoji: '🏆', cor: 0xF1C40F, keywords: ['monitor gamer', 'monitor 144hz', 'monitor 4k', 'monitor curvo', 'monitor ultrawide'],         categoria: 'monitores',     defaultOrdenacao: 'sales' },
  promocoes_hardware:   { nome: 'Promocoes em Hardware',          emoji: '🔥', cor: 0xE74C3C, keywords: ['placa de video', 'processador', 'memoria ram', 'ssd', 'fonte', 'placa mae', 'water cooler'], categoria: 'hardware',     defaultOrdenacao: 'sales' },
  pcs_gamers_baratos:   { nome: 'PCs Gamers Mais Baratos do Mes', emoji: '💻', cor: 0x3498DB, keywords: ['pc gamer', 'computador gamer', 'notebook gamer'],                                        categoria: 'computadores',  defaultOrdenacao: 'price' },
  mais_vendidos_games:  { nome: 'Mais Vendidos em Games',         emoji: '🎮', cor: 0x9B59B6, keywords: ['jogo ps5', 'jogo ps4', 'jogo xbox', 'jogo switch', 'controle', 'cadeira gamer'],       categoria: 'games',        defaultOrdenacao: 'sales' },
  ofertas_relampago:    { nome: 'Ofertas Relampago',              emoji: '⚡', cor: 0xE67E22, keywords: ['promocao', 'oferta', 'desconto', 'queima estoque'],                                       categoria: 'geral',        defaultOrdenacao: 'commission' },
  perifericos_destaque: { nome: 'Perifericos em Destaque',        emoji: '🖱️', cor: 0x1ABC9C, keywords: ['mouse gamer', 'headset gamer', 'teclado mecanico', 'mousepad', 'microfone', 'webcam'],  categoria: 'perifericos',   defaultOrdenacao: 'sales' },
  achadinhos_dia:       { nome: 'Achadinhos do Dia',              emoji: '📦', cor: 0x2ECC71, keywords: ['promocao shopee', 'cupom', 'frete gratis', 'mais vendidos'],                              categoria: 'geral',        defaultOrdenacao: 'sales' },
};

function formatarMoeda(v: number) { return `R$ ${v.toFixed(2).replace(/\./g, ',')}`; }

async function buscarProdutosShopee(keyword: string, appId: string, appSecret: string, orderBy: string, pageSize = 3): Promise<ShopeeProduct[]> {
  console.log(`[${T()}] [Shopee API] BUSCA INICIADA: keyword="${keyword}" orderBy="${orderBy}" pageSize=${pageSize} appId=${appId}`);
  const query = `
    query Search($keyword: String!, $pageSize: Int, $orderBy: String) {
      searchProduct(keyword: $keyword, pageSize: $pageSize, orderBy: $orderBy) {
        success
        data { products { productId productName productImage price originalPrice discount rating soldCount commissionRate shopName } }
      }
    }`;
  const payload = { query, variables: { keyword, pageSize, orderBy } };
  console.log(`[${T()}] [Shopee API] REQUEST payload:`, JSON.stringify({ ...payload, query: '[GRAPHQL]' }).substring(0, 200));

  try {
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'App-Id': appId, 'App-Secret': appSecret },
      body: JSON.stringify(payload),
    });
    console.log(`[${T()}] [Shopee API] RESPONSE status=${res.status} statusText="${res.statusText}"`);

    if (!res.ok) {
      const body = await res.text().catch(() => 'ERRO ao ler body');
      console.error(`[${T()}] [Shopee API] ERRO HTTP ${res.status}: ${body.substring(0, 500)}`);
      return [];
    }
    const json = await res.json();
    console.log(`[${T()}] [Shopee API] RESPONSE body:`, JSON.stringify(json).substring(0, 800));

    if (json.errors) {
      const err = json.errors[0];
      console.error(`[${T()}] [Shopee API] ERRO GraphQL [${err?.extensions?.code || 'N/A'}]: ${err?.message}`);
      console.error(`[${T()}] [Shopee API] ERRO completo:`, JSON.stringify(json.errors).substring(0, 500));
      return [];
    }

    const produtos = (json.data?.searchProduct?.data?.products || []) as ShopeeProduct[];
    console.log(`[${T()}] [Shopee API] SUCESSO: ${produtos.length} produtos encontrados`);
    if (produtos.length > 0) {
      console.log(`[${T()}] [Shopee API] 1o produto: "${produtos[0].productName}" R$${produtos[0].price} (${produtos[0].discount}% OFF)`);
    }
    return produtos;
  } catch (erro) {
    console.error(`[${T()}] [Shopee API] EXCECAO na busca:`, erro instanceof Error ? erro.message : String(erro));
    return [];
  }
}

async function gerarLinkAfiliado(productId: string, appId: string, appSecret: string): Promise<string> {
  console.log(`[${T()}] [Shopee Link] Gerando link para productId=${productId}`);
  const query = `query Link($productId: String!) { generateAffiliateLink(productId: $productId) { success data { affiliateLink shortLink } } }`;
  try {
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'App-Id': appId, 'App-Secret': appSecret },
      body: JSON.stringify({ query, variables: { productId } }),
    });
    console.log(`[${T()}] [Shopee Link] status=${res.status} para ${productId}`);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[${T()}] [Shopee Link] ERRO HTTP ${res.status}: ${body.substring(0, 300)}`);
      return '';
    }
    const json = await res.json();
    if (json.errors) {
      console.error(`[${T()}] [Shopee Link] ERRO GraphQL:`, JSON.stringify(json.errors).substring(0, 300));
      return '';
    }
    const link = json.data?.generateAffiliateLink?.data?.shortLink || json.data?.generateAffiliateLink?.data?.affiliateLink || '';
    console.log(`[${T()}] [Shopee Link] SUCESSO: ${link.substring(0, 60)}`);
    return link;
  } catch (erro) {
    console.error(`[${T()}] [Shopee Link] EXCECAO:`, erro instanceof Error ? erro.message : String(erro));
    return '';
  }
}

async function getProdutosEvitados(mensagemId: number, db: ReturnType<typeof getDb>): Promise<string[]> {
  try {
    const logs = await db.select().from(envioLogs).where(eq(envioLogs.mensagemId, mensagemId)).orderBy(desc(envioLogs.criadoEm)).limit(3);
    const ids = new Set<string>();
    for (const l of logs) {
      try { const arr = JSON.parse(l.produtosEnviados); arr.forEach((id: string) => ids.add(id)); } catch { /* JSON parse error */ }
    }
    console.log(`[${T()}] [Pendentes] Produtos evitados para msg #${mensagemId}: ${ids.size} ids`);
    return [...ids];
  } catch (erro) {
    console.error(`[${T()}] [Pendentes] ERRO ao buscar produtos evitados:`, erro instanceof Error ? erro.message : String(erro));
    return [];
  }
}

async function montarMensagemShopee(
  presetKey: string, appId: string, appSecret: string, config: {
    qtdProdutos?: number; ordenacao?: string; cta?: string; mensagemId?: number;
  } = {}, db: ReturnType<typeof getDb>
): Promise<{ mensagem: string; embeds: Array<Record<string, unknown>>; presetKey: string; produtosIds: string[] } | null> {
  console.log(`[${T()}] [MontarMsg] INICIO: presetKey=${presetKey} qtd=${config.qtdProdutos || 4} ordem=${config.ordenacao || 'default'}`);

  const preset = SHOPEE_PRESETS[presetKey];
  if (!preset) {
    console.error(`[${T()}] [MontarMsg] FALHA: preset "${presetKey}" nao encontrado! Presets disponiveis: ${Object.keys(SHOPEE_PRESETS).join(', ')}`);
    return null;
  }

  const qtd = config.qtdProdutos || 4;
  const orderBy = config.ordenacao || preset.defaultOrdenacao;
  const cta = config.cta || 'Comprar Agora 🛒';
  const keyword = preset.keywords[Math.floor(Math.random() * preset.keywords.length)];

  console.log(`[${T()}] [MontarMsg] keyword="${keyword}" orderBy="${orderBy}" qtd=${qtd} cta="${cta}"`);

  const produtos = await buscarProdutosShopee(keyword, appId, appSecret, orderBy, qtd + 3);
  if (produtos.length === 0) {
    console.error(`[${T()}] [MontarMsg] FALHA: 0 produtos retornados da Shopee`);
    return null;
  }

  const evitados = config.mensagemId ? await getProdutosEvitados(config.mensagemId, db) : [];
  const filtrados = produtos.filter(p => !evitados.includes(p.productId));
  console.log(`[${T()}] [MontarMsg] ${produtos.length} produtos, ${filtrados.length} apos filtro de evitados (${evitados.length} evitados)`);

  const pool = filtrados.length >= qtd ? filtrados : produtos;
  const melhores = pool.slice(0, qtd);

  if (melhores.length === 0) {
    console.error(`[${T()}] [MontarMsg] FALHA: pool vazio apos filtro`);
    return null;
  }

  console.log(`[${T()}] [MontarMsg] Selecionados ${melhores.length} produtos para montar embeds`);

  const embeds = [];
  const produtosIds: string[] = [];

  for (let i = 0; i < melhores.length; i++) {
    const p = melhores[i];
    console.log(`[${T()}] [MontarMsg] Processando produto ${i + 1}/${melhores.length}: "${p.productName}"`);

    const link = await gerarLinkAfiliado(p.productId, appId, appSecret);
    produtosIds.push(p.productId);

    const fields = [];
    fields.push({ name: '💰 Preco', value: `~~${formatarMoeda(p.originalPrice)}~~ **${formatarMoeda(p.price)}**`, inline: true });
    fields.push({ name: '📉 Desconto', value: `${p.discount}% OFF`, inline: true });
    if (p.commissionRate > 0) fields.push({ name: '💵 Comissao', value: `${p.commissionRate}%`, inline: true });

    const embed = {
      color: preset.cor,
      author: { name: `${i + 1}. ${p.productName.substring(0, 60)}${p.productName.length > 60 ? '...' : ''}` },
      description: `⭐ ${p.rating.toFixed(1)} | 🛒 ${(p.soldCount || 0).toLocaleString()} vendidos | Loja: ${p.shopName}${link ? `\n🔗 [${link.substring(0, 40)}...](${link})` : '\n⚠️ Link nao gerado'}`,
      fields,
      thumbnail: p.productImage ? { url: p.productImage } : undefined,
      footer: { text: 'Oferta via Shopee Afiliados • Clique no link abaixo' },
    };

    embeds.push(embed);
  }

  const mensagem = `# ${preset.emoji} ${preset.nome} ${preset.emoji}\n\n${cta}\n\n👇 **Clique nos links abaixo e aproveite:**`;

  console.log(`[${T()}] [MontarMsg] SUCESSO: ${embeds.length} embeds montados com ${produtosIds.length} produtos`);
  return { mensagem, embeds, presetKey, produtosIds };
}

function selecionarPresetRotacao(
  config: { modoRotacao?: string; presetsSelecionados?: string[]; ultimaKey?: string } | null,
  presetAtual: string
): string {
  if (!config || !config.modoRotacao || config.modoRotacao === 'fixo') return presetAtual;
  const pool = config.presetsSelecionados || [presetAtual];
  if (pool.length === 0) return presetAtual;
  if (config.modoRotacao === 'randomico') return pool[Math.floor(Math.random() * pool.length)];
  if (config.modoRotacao === 'sequencial') {
    const idx = pool.indexOf(config.ultimaKey || '');
    const nextIdx = (idx + 1) % pool.length;
    return pool[nextIdx] || presetAtual;
  }
  return presetAtual;
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    console.error(`[${T()}] [Pendentes GET] Acesso negado - API key invalida`);
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const agora = new Date();
    console.log(`[${T()}] [Pendentes GET] Buscando mensagens ativas...`);

    const ativas = await db.select().from(mensagensProgramadas).where(eq(mensagensProgramadas.ativo, true));
    console.log(`[${T()}] [Pendentes GET] ${ativas.length} mensagens ativas encontradas`);

    const pendentes = await Promise.all(ativas.map(async (m) => {
      try {
        console.log(`[${T()}] [Pendentes GET] Msg #${m.id} "${m.nome}": tipo=${m.tipo} ativo=${m.ativo} ultimoEnvio=${m.ultimoEnvio || 'nunca'} timer=${m.timerIntervalo}s`);

        if (!m.servidoresCanais) {
          console.log(`[${T()}] [Pendentes GET] Msg #${m.id}: PULADA - sem canais configurados`);
          return null;
        }
        const canais: Array<{ servidorId: string; servidorNome: string; canalId: string; canalNome: string }> = JSON.parse(m.servidoresCanais);
        if (canais.length === 0) {
          console.log(`[${T()}] [Pendentes GET] Msg #${m.id}: PULADA - lista de canais vazia`);
          return null;
        }

        const ultimo = m.ultimoEnvio ? new Date(m.ultimoEnvio) : null;
        if (ultimo && (agora.getTime() - ultimo.getTime()) < m.timerIntervalo * 1000) {
          const falta = Math.ceil((m.timerIntervalo * 1000 - (agora.getTime() - ultimo.getTime())) / 1000);
          console.log(`[${T()}] [Pendentes GET] Msg #${m.id}: NAO PRONTA - faltam ${falta}s`);
          return null;
        }

        let conteudo: { mensagem: string; embeds?: Array<Record<string, unknown>> } = { mensagem: m.mensagem };
        let presetKeyUsada = '';
        let produtosIds: string[] = [];

        if (m.tipo === 'shopee_preset') {
          console.log(`[${T()}] [Pendentes GET] Msg #${m.id}: tipo SHOPEE - buscando integracao...`);

          const shopeeInt = await db.select().from(integracoes).where(and(eq(integracoes.plataforma, 'shopee'), eq(integracoes.ativo, true))).limit(1);
          if (shopeeInt.length === 0) {
            console.error(`[${T()}] [Pendentes GET] Msg #${m.id}: PULADA - Shopee nao conectada (nenhuma integracao ativa)`);
            return null;
          }
          if (!shopeeInt[0].accessToken || !shopeeInt[0].contaId) {
            console.error(`[${T()}] [Pendentes GET] Msg #${m.id}: PULADA - credenciais Shopee incompletas (contaId=${!!shopeeInt[0].contaId}, token=${!!shopeeInt[0].accessToken})`);
            return null;
          }

          console.log(`[${T()}] [Pendentes GET] Shopee OK: AppId=${shopeeInt[0].contaId}`);

          let shopeeConfig: { modoRotacao?: string; presetsSelecionados?: string[]; ultimaKey?: string; qtdProdutos?: number; ordenacao?: string; cta?: string } | null = null;
          try { if (m.shopeeConfig) shopeeConfig = JSON.parse(m.shopeeConfig); } catch (e) {
            console.error(`[${T()}] [Pendentes GET] Msg #${m.id}: ERRO ao parsear shopeeConfig JSON:`, e instanceof Error ? e.message : String(e));
          }

          const presetAtual = selecionarPresetRotacao(shopeeConfig, m.shopeePreset || 'achadinhos_dia');
          console.log(`[${T()}] [Pendentes GET] Msg #${m.id}: preset=${presetAtual} rotacao=${shopeeConfig?.modoRotacao || 'fixo'}`);

          const resultado = await montarMensagemShopee(presetAtual, shopeeInt[0].contaId!, shopeeInt[0].accessToken!, {
            qtdProdutos: shopeeConfig?.qtdProdutos || 4,
            ordenacao: shopeeConfig?.ordenacao,
            cta: shopeeConfig?.cta,
            mensagemId: m.id,
          }, db);

          if (!resultado) {
            console.error(`[${T()}] [Pendentes GET] Msg #${m.id}: PULADA - montarMensagemShopee retornou null (ver logs acima)`);
            return null;
          }

          if (shopeeConfig && shopeeConfig.modoRotacao === 'sequencial') {
            shopeeConfig.ultimaKey = presetAtual;
            await db.update(mensagensProgramadas).set({ shopeeConfig: JSON.stringify(shopeeConfig) }).where(eq(mensagensProgramadas.id, m.id));
          }

          conteudo = { mensagem: resultado.mensagem, embeds: resultado.embeds };
          presetKeyUsada = presetAtual;
          produtosIds = resultado.produtosIds;

          console.log(`[${T()}] [Pendentes GET] Msg #${m.id}: PRONTA - ${resultado.embeds.length} embeds, ${resultado.produtosIds.length} produtos, ${canais.length} canais`);
        } else {
          console.log(`[${T()}] [Pendentes GET] Msg #${m.id}: PRONTA - mensagem manual, ${canais.length} canais`);
        }

        return { id: m.id, mensagem: conteudo.mensagem, embeds: conteudo.embeds || [], canais, presetKey: presetKeyUsada, produtosIds };
      } catch (erro) {
        console.error(`[${T()}] [Pendentes GET] Msg #${m?.id || '?'}: ERRO FATAL no processamento:`, erro instanceof Error ? `${erro.message}\n${erro.stack}` : String(erro));
        return null;
      }
    }));

    const resultado = pendentes.filter(Boolean);
    console.log(`[${T()}] [Pendentes GET] RESULTADO: ${resultado.length} pendentes retornadas de ${ativas.length} ativas`);
    if (resultado.length > 0) {
      console.log(`[${T()}] [Pendentes GET] IDs pendentes: ${resultado.map((p: { id: number }) => `#${p.id}`).join(', ')}`);
    }
    return NextResponse.json({ pendentes: resultado });
  } catch (erro) {
    console.error(`[${T()}] [Pendentes GET] ERRO FATAL:`, erro instanceof Error ? `${erro.message}\n${erro.stack}` : String(erro));
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { id, produtosIds } = body;
    if (!id) return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });

    console.log(`[${T()}] [Pendentes POST] Confirmando envio #${id}${produtosIds ? ` com ${produtosIds.length} produtos` : ''}`);

    const db = getDb();

    if (produtosIds && Array.isArray(produtosIds) && produtosIds.length > 0) {
      await db.insert(envioLogs).values({
        mensagemId: id,
        presetKey: 'confirmado',
        produtosEnviados: JSON.stringify(produtosIds),
      });
      console.log(`[${T()}] [Pendentes POST] EnvioLogs inserido para msg #${id}`);
    }

    await db.update(mensagensProgramadas).set({ ultimoEnvio: new Date() }).where(eq(mensagensProgramadas.id, id));
    console.log(`[${T()}] [Pendentes POST] Envio #${id} confirmado com sucesso`);
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error(`[${T()}] [Pendentes POST] ERRO:`, erro instanceof Error ? `${erro.message}\n${erro.stack}` : String(erro));
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
