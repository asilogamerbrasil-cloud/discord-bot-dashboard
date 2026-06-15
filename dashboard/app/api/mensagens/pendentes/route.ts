import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { mensagensProgramadas, integracoes, envioLogs } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { createHash } from 'crypto';

const T = () => new Date().toISOString();

function gerarAuthShopee(appId: string, appSecret: string, bodyString: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const factor = `${appId}${timestamp}${bodyString}${appSecret}`;
  const signature = createHash('sha256').update(factor, 'utf8').digest('hex');
  return `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`;
}

interface ShopeeProductV2 {
  productName: string;
  productLink: string;
  price: string;
  commissionRate: string;
  shopName: string;
  ratingStar: string;
  offerLink: string;
  imageUrl: string;
  sales: number;
  shopId: number;
  itemId: number;
  sellerCommissionRate: string;
}

interface ShopeePresetDef {
  nome: string;
  emoji: string;
  cor: number;
  keywords: string[];
  categoria: string;
  defaultSortType: number;
  qtdProdutos: number;
  header: string;
  footer: string;
}

const SHOPEE_PRESETS: Record<string, ShopeePresetDef> = {
  // ============ MONITORES ============
  monitores_ranking: {
    nome: 'Top 7 Monitores Mais Vendidos Essa Semana',
    emoji: '🖥️', cor: 0xF1C40F, qtdProdutos: 7, defaultSortType: 0,
    keywords: ['monitor gamer', 'monitor 144hz', 'monitor 4k', 'monitor curvo', 'monitor ultrawide'],
    categoria: 'monitores',
    header: 'Garanti uma dessas ofertas? Os gamers estao trocando de monitor AGORA e essas sao as escolhas favoritas \u{1F447}',
    footer: 'Eletronico Estoque limitado, precos podem subir em breve!'
  },
  monitores_performance: {
    nome: 'Monitores 144Hz+ Para Quem Joga Pra Ganhar',
    emoji: '🎯', cor: 0xE74C3C, qtdProdutos: 3, defaultSortType: 0,
    keywords: ['monitor 144hz', 'monitor 165hz', 'monitor 240hz', 'monitor gamer 1ms'],
    categoria: 'monitores',
    header: 'Lag nao combina com vitoria \u{1F3C6}\nEsses monitores estao com desconto AGORA e vao deixar sua gameplay muito mais fluida.',
    footer: 'Promocao pode acabar a qualquer momento'
  },
  monitores_upgrade: {
    nome: 'Hora de Trocar Aquele Monitor Antigo',
    emoji: '📺', cor: 0x3498DB, qtdProdutos: 3, defaultSortType: 0,
    keywords: ['monitor gamer barato', 'monitor full hd', 'monitor led', 'monitor ips'],
    categoria: 'monitores',
    header: 'Se sua tela ainda e 60Hz, voce esta jogando no modo dificil sem saber \u{1F605}',
    footer: 'Mais fluidez, mais precisao, mais vitorias'
  },

  // ============ CONTROLES ============
  controles_comparativo: {
    nome: 'Melhores Controles PC em Promocao',
    emoji: '🎮', cor: 0x9B59B6, qtdProdutos: 3, defaultSortType: 0,
    keywords: ['controle pc', 'controle gamer', 'controle sem fio', 'joystick pc'],
    categoria: 'controles',
    header: 'Seu controle ta dando trabalho? Hora de upar de equipamento \u{1F60F}',
    footer: 'Todos com desconto exclusivo via app'
  },
  controles_urgencia: {
    nome: 'Ultimas Horas: Controles com Desconto',
    emoji: '⏰', cor: 0xE67E22, qtdProdutos: 2, defaultSortType: 0,
    keywords: ['controle gamer promocao', 'controle barato', 'joystick desconto'],
    categoria: 'controles',
    header: 'Quem comprou, ja garantiu o combo perfeito pro fim de semana de jogo \u{1F389}',
    footer: 'Promocao sensivel ao estoque'
  },
  controles_destaque: {
    nome: 'Esse Controle Ta Arrasando nas Vendas',
    emoji: '🕹️', cor: 0x1ABC9C, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['controle gamer mais vendido', 'controle pro', 'controle elite'],
    categoria: 'controles',
    header: 'Compativel com PC, conexao estavel e ergonomia premium.\nNao deixa essa passar \u{1F440}',
    footer: 'Estoque limitado!'
  },

  // ============ PLACAS DE VIDEO ============
  gpu_ranking: {
    nome: 'Placas de Video Mais Vendidas Este Mes',
    emoji: '💻', cor: 0x2ECC71, qtdProdutos: 3, defaultSortType: 0,
    keywords: ['placa de video', 'rtx', 'rx', 'gtx', 'gpu'],
    categoria: 'placas de video',
    header: 'A galera ta fazendo upgrade e essas sao as campeas de vendas \u{1F4C8}',
    footer: 'Performance pra rodar tudo no Ultra'
  },
  gpu_custo: {
    nome: 'GPUs com Melhor Custo-Beneficio Hoje',
    emoji: '💰', cor: 0x27AE60, qtdProdutos: 3, defaultSortType: 0,
    keywords: ['placa de video barata', 'gpu custo beneficio', 'placa de video entrada'],
    categoria: 'placas de video',
    header: 'Nao precisa gastar uma fortuna pra jogar bem \u{1F440}\nSeparamos as opcoes que cabem no seu bolso e ainda entregam otimos FPS.',
    footer: 'Preco pode mudar a qualquer momento'
  },
  gpu_oferta: {
    nome: 'Essa GPU Nao Fica Nesse Preco Por Muito Tempo',
    emoji: '🟢', cor: 0x16A085, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['placa de video oferta', 'gpu promocao', 'placa de video desconto'],
    categoria: 'placas de video',
    header: 'Upgrade real de FPS pra quem joga no ultra settings \u{1F3AF}',
    footer: 'Corre que essa nao dura!'
  },

  // ============ PERIFERICOS ============
  perifericos_setup: {
    nome: 'Monte Seu Setup Gamer Com Essas Ofertas',
    emoji: '⚙️', cor: 0x8E44AD, qtdProdutos: 3, defaultSortType: 0,
    keywords: ['mouse gamer', 'teclado mecanico', 'headset gamer', 'mousepad'],
    categoria: 'perifericos',
    header: 'Mouse, teclado, headset... tudo o que voce precisa pra elevar o nivel \u{1F199}',
    footer: 'Combo perfeito, preco que nao vai durar'
  },
  headset_foco: {
    nome: 'Melhores Headsets Gamer em Promocao',
    emoji: '🎧', cor: 0xC0392B, qtdProdutos: 2, defaultSortType: 0,
    keywords: ['headset gamer', 'headset 7.1', 'fone gamer', 'headset sem fio'],
    categoria: 'perifericos',
    header: 'Ouca cada passo do inimigo antes dele te ouvir \u{1F442}',
    footer: 'Som imersivo pelo melhor preco'
  },
  teclado_mouse: {
    nome: 'Combo Teclado + Mouse com Desconto',
    emoji: '⌨️', cor: 0x2980B9, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['kit teclado mouse gamer', 'combo gamer', 'teclado mouse barato'],
    categoria: 'perifericos',
    header: 'Precisao e velocidade pra elevar seu jogo a outro nivel \u{1F3AE}',
    footer: 'Oferta imperdivel!'
  },

  // ============ RELAMPAGO ============
  flash_simples: {
    nome: 'Oferta Flash',
    emoji: '⚡', cor: 0xF39C12, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['promocao relampago', 'queima estoque', 'super oferta', 'desconto hoje'],
    categoria: 'geral',
    header: 'Apareceu agora e vai sumir rapido!',
    footer: 'Nao dorme nessa!'
  },
  contagem_regressiva: {
    nome: 'Relampago: Termina em Poucas Horas',
    emoji: '⏳', cor: 0xD35400, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['promocao hoje', 'desconto do dia', 'oferta limitada', 'ultimas unidades'],
    categoria: 'geral',
    header: 'Corre que essa nao dura muito \u{1F3C3}\u{1F4A8}',
    footer: 'Preco pode subir a qualquer instante!'
  },
  estoque_baixo: {
    nome: 'Atencao: Estoque Baixo',
    emoji: '🚨', cor: 0xE74C3C, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['estoque limitado', 'ultimas pecas', 'quase esgotado', 'promocao imperdivel'],
    categoria: 'geral',
    header: 'Quase esgotado nesse preco!',
    footer: 'Quando acabar, acabou...'
  },
  pergunta_gancho: {
    nome: 'Ja Trocou Seu Equipamento Esse Ano?',
    emoji: '❓', cor: 0x7D3C98, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['gamer promocao', 'setup gamer barato', 'acessorio gamer', 'hardware desconto'],
    categoria: 'geral',
    header: 'Ta com desconto AGORA \u{1F447}',
    footer: 'Hora do upgrade!'
  },
  comparacao_preco: {
    nome: 'Preco Despencou',
    emoji: '📉', cor: 0xE91E63, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['maior desconto', 'preco baixou', 'promocao imperdivel', 'desconto hoje shopee'],
    categoria: 'geral',
    header: 'Essa queda de preco nao e todo dia \u{1F440}',
    footer: 'Preco minimo historico!'
  },

  // ============ MIX / VARIADOS ============
  achadinhos_dia: {
    nome: 'Achadinhos Gamer do Dia',
    emoji: '🔍', cor: 0x2ECC71, qtdProdutos: 4, defaultSortType: 0,
    keywords: ['promocao shopee', 'cupom', 'frete gratis', 'mais vendidos', 'gamer oferta'],
    categoria: 'geral',
    header: 'Esses aqui ninguem esperava encontrar com esse preco \u{1F631}',
    footer: 'Corre que e rapidinho!'
  },
  surpresa_dia: {
    nome: 'Oferta Surpresa - So Hoje',
    emoji: '🎲', cor: 0x6C3483, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['promocao aleatoria', 'achado shopee', 'desconto misterioso', 'surpresa gamer'],
    categoria: 'geral',
    header: 'Toda hora aparece algo diferente por aqui... hoje a sorte ta do seu lado \u{1F340}',
    footer: 'Aproveita antes que alguem compre na sua frente!'
  },
  mix_variado: {
    nome: 'Mix de Ofertas Pra Gamer',
    emoji: '🛒', cor: 0x5DADE2, qtdProdutos: 4, defaultSortType: 0,
    keywords: ['controle', 'monitor gamer', 'headset', 'teclado', 'mouse gamer'],
    categoria: 'geral',
    header: 'Separamos um pouco de tudo pra voce que ta montando ou upgradando o setup \u{1F527}',
    footer: 'Mix completo pro seu setup!'
  },
  roleta_ofertas: {
    nome: 'Roleta de Ofertas',
    emoji: '🎰', cor: 0xF1C40F, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['promocao do dia', 'escolha aleatoria', 'top vendas hoje', 'gamer destaque'],
    categoria: 'geral',
    header: 'Hoje saiu essa aqui pra voce \u{1F447}',
    footer: 'Amanha pode ser outra coisa, fica de olho!'
  },
  top_dia: {
    nome: 'Produto do Dia',
    emoji: '🏆', cor: 0xD4AC0D, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['mais vendido hoje', 'top produto', 'bestseller gamer', 'campeao vendas'],
    categoria: 'geral',
    header: 'Esse foi o mais clicado por aqui hoje \u{1F447}',
    footer: 'Vem ver o motivo!'
  },

  // ============ SAZONAIS ============
  fim_de_semana: {
    nome: 'Prepara o Fim de Semana de Jogo',
    emoji: '🛋️', cor: 0x5DADE2, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['setup gamer', 'fim de semana gamer', 'diversao garantida', 'jogo novo'],
    categoria: 'geral',
    header: 'Sextou e o setup merece um upgrade \u{1F3AE}',
    footer: 'Chega mais pro fim de semana!'
  },
  pagamento_salario: {
    nome: 'Caiu o Pagamento? Hora de Investir no Setup',
    emoji: '💸', cor: 0x27AE60, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['upgrade pc gamer', 'investir setup', 'hardware promocao', 'pc gamer mes'],
    categoria: 'geral',
    header: 'Aproveita esse mes pra dar aquele upgrade que tava devendo \u{1F60E}',
    footer: 'Seu setup merece!'
  },
  frete_gratis: {
    nome: 'Frete Gratis Nessas Ofertas',
    emoji: '🚚', cor: 0x1ABC9C, qtdProdutos: 2, defaultSortType: 0,
    keywords: ['frete gratis', 'sem frete', 'entrega gratuita', 'promocao frete'],
    categoria: 'geral',
    header: 'Sem pegadinha, sem custo extra \u{2705}',
    footer: 'Frete gratis = economia garantida!'
  },
  lancamento: {
    nome: 'Chegou Novidade',
    emoji: '🆕', cor: 0x8E44AD, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['lancamento gamer', 'novo produto', 'recem chegado', 'novidade shopee'],
    categoria: 'geral',
    header: 'Acaba de entrar em promocao de lancamento \u{1F4E6}',
    footer: 'Seja um dos primeiros a garantir!'
  },
  reposicao_estoque: {
    nome: 'Voltou ao Estoque',
    emoji: '🔄', cor: 0x2ECC71, qtdProdutos: 1, defaultSortType: 0,
    keywords: ['voltou estoque', 'reposicao', 'disponivel novamente', 'voltou promocao'],
    categoria: 'geral',
    header: 'Esgotou e voltou com desconto extra \u{1F440}',
    footer: 'Dessa vez nao vai perder, ne?'
  },
};

function formatarMoeda(v: number) { return `R$ ${v.toFixed(2).replace(/\./g, ',')}`; }

function emojiNumero(i: number): string {
  const emojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  return emojis[i] || `${i + 1}️⃣`;
}

const EMOJIS_BULLET = ['🔥', '⚡', '💥', '🚀', '🎮', '💻', '🖥️', '🎁', '⭐', '✅'];

async function buscarProdutosShopee(keyword: string, appId: string, appSecret: string, sortType: number, limit: number): Promise<ShopeeProductV2[]> {
  console.log(`[${T()}] [Shopee API] keyword="${keyword}" limit=${limit}`);

  const query = `query { productOfferV2(keyword: "${keyword.replace(/"/g, '\\"')}", limit: ${limit}, sortType: ${sortType}) { nodes { productName productLink price commissionRate shopName ratingStar offerLink imageUrl sales shopId itemId sellerCommissionRate } } }`;
  const body = { query };
  const bodyString = JSON.stringify(body);

  try {
    const auth = gerarAuthShopee(appId, appSecret, bodyString);
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: bodyString,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[${T()}] [Shopee API] ERRO HTTP ${res.status}: ${text.substring(0, 300)}`);
      return [];
    }

    const json = await res.json();
    if (json.errors) {
      console.error(`[${T()}] [Shopee API] ERRO: ${json.errors[0]?.message}`);
      return [];
    }

    const produtos = (json.data?.productOfferV2?.nodes || []) as ShopeeProductV2[];
    console.log(`[${T()}] [Shopee API] ${produtos.length} produtos`);
    return produtos;
  } catch (erro) {
    console.error(`[${T()}] [Shopee API] EXCECAO:`, erro instanceof Error ? erro.message : String(erro));
    return [];
  }
}

async function getProdutosEvitados(mensagemId: number, db: ReturnType<typeof getDb>): Promise<number[]> {
  try {
    const logs = await db.select().from(envioLogs).where(eq(envioLogs.mensagemId, mensagemId)).orderBy(desc(envioLogs.criadoEm)).limit(3);
    const ids = new Set<number>();
    for (const l of logs) {
      try { const arr = JSON.parse(l.produtosEnviados); arr.forEach((id: number) => ids.add(id)); } catch {}
    }
    return [...ids];
  } catch { return []; }
}

async function montarMensagemShopee(
  presetKey: string, appId: string, appSecret: string, config: {
    qtdProdutos?: number; sortType?: number; cta?: string; mensagemId?: number;
  } = {}, db: ReturnType<typeof getDb>
): Promise<{ mensagem: string; embeds: Array<Record<string, unknown>>; presetKey: string; produtosIds: number[] } | null> {
  const preset = SHOPEE_PRESETS[presetKey];
  if (!preset) {
    console.error(`[${T()}] [MontarMsg] Preset "${presetKey}" nao encontrado`);
    return null;
  }

  const qtd = config.qtdProdutos || preset.qtdProdutos;
  const sortType = config.sortType ?? preset.defaultSortType;
  const keyword = preset.keywords[Math.floor(Math.random() * preset.keywords.length)];
  const cta = config.cta || '';

  console.log(`[${T()}] [MontarMsg] ${preset.nome} | "${keyword}" | ${qtd} produtos`);

  const produtos = await buscarProdutosShopee(keyword, appId, appSecret, sortType, qtd + 5);
  if (produtos.length === 0) {
    console.error(`[${T()}] [MontarMsg] 0 produtos retornados`);
    return null;
  }

  const evitados = config.mensagemId ? await getProdutosEvitados(config.mensagemId, db) : [];
  const filtrados = produtos.filter(p => !evitados.includes(p.itemId));
  const pool = filtrados.length >= qtd ? filtrados : produtos;
  const melhores = pool.slice(0, qtd);
  if (melhores.length === 0) return null;

  const embeds = [];
  const produtosIds: number[] = [];

  const cor = preset.cor;
  const linhas = ['━'.repeat(26)];

  for (let i = 0; i < melhores.length; i++) {
    const p = melhores[i];
    produtosIds.push(p.itemId);

    const preco = parseFloat(p.price) || 0;
    const commRate = parseFloat(p.commissionRate) || 0;
    const rating = parseFloat(p.ratingStar) || 0;
    const link = p.offerLink || p.productLink;

    const emojiMarcador = preset.qtdProdutos > 2 ? emojiNumero(i) : EMOJIS_BULLET[i % EMOJIS_BULLET.length];

    const fields = [];
    fields.push({ name: '💰 Preco', value: `**${formatarMoeda(preco)}**`, inline: true });
    if (commRate > 0) fields.push({ name: '💵 Comissao', value: `${commRate}%`, inline: true });
    if (p.sales > 0) fields.push({ name: '🛒 Vendidos', value: p.sales.toLocaleString(), inline: true });

    const descParts = [`⭐ ${rating.toFixed(1)}`, `🏪 ${p.shopName}`];
    if (link) descParts.push(`\n🔗 [Comprar Agora](${link})`);

    embeds.push({
      color: cor,
      author: { name: `${emojiMarcador} ${p.productName.substring(0, 56)}${p.productName.length > 56 ? '...' : ''}`, icon_url: undefined },
      description: descParts.join(' | '),
      fields,
      thumbnail: p.imageUrl ? { url: p.imageUrl } : undefined,
    });
  }

  const headerTexto = preset.header.replace(/\{emoji\}/g, preset.emoji);
  const footerTexto = preset.footer.replace(/\{emoji\}/g, preset.emoji);
  const separador = '━'.repeat(26);
  const mensagem = `# ${preset.emoji} ${preset.nome} ${preset.emoji}\n${separador}\n${headerTexto}\n\n${cta || ''}`;

  if (embeds.length > 0 && embeds[0]) {
    embeds[0] = { ...embeds[0] as Record<string, unknown>, footer: { text: footerTexto.includes('{emoji}') ? footerTexto.replace(/\{emoji\}/g, preset.emoji) : footerTexto } };
    embeds[0] = { ...embeds[0] as Record<string, unknown>, timestamp: new Date().toISOString() };
  }

  console.log(`[${T()}] [MontarMsg] SUCESSO: ${embeds.length} embeds`);
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
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }
  try {
    const db = getDb();
    const agora = new Date();
    const ativas = await db.select().from(mensagensProgramadas).where(eq(mensagensProgramadas.ativo, true));

    const pendentes = await Promise.all(ativas.map(async (m) => {
      try {
        if (!m.servidoresCanais) return null;
        const canais: Array<{ servidorId: string; servidorNome: string; canalId: string; canalNome: string }> = JSON.parse(m.servidoresCanais);
        if (canais.length === 0) return null;

        const ultimo = m.ultimoEnvio ? new Date(m.ultimoEnvio) : null;
        if (ultimo && (agora.getTime() - ultimo.getTime()) < m.timerIntervalo * 1000) return null;

        let conteudo: { mensagem: string; embeds?: Array<Record<string, unknown>> } = { mensagem: m.mensagem };
        let presetKeyUsada = '';
        let produtosIds: number[] = [];

        if (m.tipo === 'shopee_preset') {
          const shopeeInt = await db.select().from(integracoes).where(and(eq(integracoes.plataforma, 'shopee'), eq(integracoes.ativo, true))).limit(1);
          if (shopeeInt.length === 0 || !shopeeInt[0].accessToken || !shopeeInt[0].contaId) return null;

          let shopeeConfig: { modoRotacao?: string; presetsSelecionados?: string[]; ultimaKey?: string; qtdProdutos?: number; sortType?: number; cta?: string } | null = null;
          try { if (m.shopeeConfig) shopeeConfig = JSON.parse(m.shopeeConfig); } catch {}

          const presetAtual = selecionarPresetRotacao(shopeeConfig, m.shopeePreset || 'achadinhos_dia');
          const resultado = await montarMensagemShopee(presetAtual, shopeeInt[0].contaId!, shopeeInt[0].accessToken!, {
            qtdProdutos: shopeeConfig?.qtdProdutos,
            sortType: shopeeConfig?.sortType,
            cta: shopeeConfig?.cta,
            mensagemId: m.id,
          }, db);

          if (!resultado) return null;

          if (shopeeConfig && shopeeConfig.modoRotacao === 'sequencial') {
            shopeeConfig.ultimaKey = presetAtual;
            await db.update(mensagensProgramadas).set({ shopeeConfig: JSON.stringify(shopeeConfig) }).where(eq(mensagensProgramadas.id, m.id));
          }

          conteudo = { mensagem: resultado.mensagem, embeds: resultado.embeds };
          presetKeyUsada = presetAtual;
          produtosIds = resultado.produtosIds;
          console.log(`[${T()}] [GET] Msg #${m.id}: PRONTA - ${resultado.embeds.length} embeds`);
        }

        return { id: m.id, mensagem: conteudo.mensagem, embeds: conteudo.embeds || [], canais, presetKey: presetKeyUsada, produtosIds };
      } catch (erro) {
        console.error(`[${T()}] [GET] ERRO Msg #${m?.id}:`, erro instanceof Error ? erro.message : String(erro));
        return null;
      }
    }));

    const resultado = pendentes.filter((p): p is NonNullable<typeof p> => p !== null);
    return NextResponse.json({ pendentes: resultado });
  } catch (erro) {
    console.error(`[${T()}] [GET] ERRO FATAL:`, erro instanceof Error ? erro.message : String(erro));
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 });
  }
  try {
    const { id, produtosIds } = await req.json();
    if (!id) return NextResponse.json({ erro: 'ID obrigatorio' }, { status: 400 });

    const db = getDb();
    if (produtosIds && Array.isArray(produtosIds) && produtosIds.length > 0) {
      await db.insert(envioLogs).values({
        mensagemId: id,
        presetKey: 'confirmado',
        produtosEnviados: JSON.stringify(produtosIds),
      });
    }
    await db.update(mensagensProgramadas).set({ ultimoEnvio: new Date() }).where(eq(mensagensProgramadas.id, id));
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    console.error(`[${T()}] [POST] ERRO:`, erro instanceof Error ? erro.message : String(erro));
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
