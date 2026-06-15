import { SlashCommandBuilder, type ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType, type TextChannel, type Message } from 'discord.js';
import type { Comando } from './index.js';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:3000';
const API_KEY = process.env.INTERNAL_API_KEY || '';

function formatarMoeda(v: number) { return `R$ ${v.toFixed(2).replace(/\./g, ',')}`; }

function estrelas(r: number): string {
  if (r <= 0) return '';
  return '\u{2B50}'.repeat(Math.floor(r)) + (r - Math.floor(r) >= 0.5 ? '\u{1F31F}' : '');
}

function formatarVendas(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

export const comandoBuscar: Comando = {
  dados: new SlashCommandBuilder()
    .setName('buscar')
    .setDescription('Busca produtos na Shopee por tags personalizadas com filtros de qualidade'),

  executar: async (interaction: ChatInputCommandInteraction) => {
  const tags: string[] = [];
  const userId = interaction.user.id;

  const channel = interaction.channel as TextChannel;
  if (!channel) {
    await interaction.reply({ content: '\u{274C} Canal nao encontrado.', ephemeral: true });
    return;
  }

  // Fase 1: Coletar tags
  await interaction.reply({
    content: '\u{1F50D} **Busca Shopee por Tags**\n\nDigite uma tag de busca por vez (ex: `Monitor Gamer 144hz`, `Teclado Mecanico RGB`).\nDigite **`fim`** quando terminar.\n\n\u{1F4CC} Tag #1:',
    ephemeral: true,
  });

  const filter = (m: Message) => m.author.id === userId;
  const collector = channel.createMessageCollector({ filter, time: 120000, max: 10 });

  collector.on('collect', async (msg: Message) => {
    const texto = msg.content.trim();

    if (texto.toLowerCase() === 'fim' || texto.toLowerCase() === 'concluir') {
      collector.stop('concluido');
      return;
    }

    if (texto.length < 3) {
      await msg.reply(`\u{26A0}\u{FE0F} Tag muito curta! Digite ao menos 3 caracteres.`).catch(() => {});
      return;
    }

    tags.push(texto);
    await msg.reply(`\u{2705} Tag **"${texto}"** adicionada! (${tags.length} no total)\n\nDigite outra tag ou **\`fim\`** para continuar.`).catch(() => {});
  });

  collector.on('end', async (_collected: unknown, reason: string) => {
    if (tags.length === 0) {
      await interaction.editReply({ content: '\u{274C} Nenhuma tag foi digitada. Busca cancelada.' });
      return;
    }

    // Fase 2: Escolher quantidade
    const qtdRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('qtd_2').setLabel('2').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('qtd_4').setLabel('4').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('qtd_6').setLabel('6').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('qtd_8').setLabel('8').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('qtd_10').setLabel('10').setStyle(ButtonStyle.Secondary),
    );

    const qtdMsg = await interaction.editReply({
      content: `\u{1F4CB} **${tags.length} tags coletadas:** ${tags.map(t => `\`${t}\``).join(', ')}\n\nQuantos produtos por tag?`,
      components: [qtdRow],
    });

    let quantidade = 4;
    let ordenacao = 'promocao';

    try {
      const qtdBtn = await qtdMsg.awaitMessageComponent({
        filter: (i) => i.user.id === userId,
        time: 30000,
        componentType: ComponentType.Button,
      });

      quantidade = parseInt(qtdBtn.customId.split('_')[1]);
      await qtdBtn.deferUpdate();

      // Fase 3: Escolher ordenacao
      const ordRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ordem')
          .setPlaceholder('Escolha a ordenacao...')
          .addOptions([
            { label: 'Maior Desconto', value: 'promocao', description: 'Produtos com maior % OFF primeiro', emoji: '\u{1F525}' },
            { label: 'Mais Vendidos', value: 'vendas', description: 'Mais vendidos primeiro', emoji: '\u{1F6D2}' },
            { label: 'Melhor Avaliados', value: 'estrelas', description: 'Maior rating primeiro', emoji: '\u{2B50}' },
            { label: 'Menor Preco', value: 'preco', description: 'Mais baratos primeiro', emoji: '\u{1F4B0}' },
          ])
      );

      await interaction.editReply({
        content: `\u{1F4CB} **${tags.length} tags** | \u{1F4E6} ${quantidade} produtos/tag\n\nEscolha a ordenacao:`,
        components: [ordRow],
      });

      const ordSel = await qtdMsg.awaitMessageComponent({
        filter: (i) => i.user.id === userId,
        time: 30000,
        componentType: ComponentType.StringSelect,
      });

      ordenacao = ordSel.values[0];
      await ordSel.deferUpdate();

      // Fase 4: Buscar na API
      await interaction.editReply({
        content: `\u{1F50D} Buscando ${quantidade} produtos por tag com ordenacao por **${ordenacao}**...\n\nTags: ${tags.map(t => `\`${t}\``).join(', ')}`,
        components: [],
      });

      const res = await fetch(`${DASHBOARD_URL}/api/mensagens/buscar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ tags, quantidade, ordenacao }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ erro: 'Erro desconhecido' }));
        await interaction.editReply({ content: `\u{274C} Erro: ${(err as { erro?: string }).erro || 'Falha na busca'}` });
        return;
      }

      const data = await res.json() as { resultados: Array<{ tag: string; produtos: Array<{ productName: string; price: number; priceMin: number; priceMax: number; priceDiscountRate: number; sales: number; rating: number; shopName: string; offerLink: string; imageUrl: string; tag: string }> }>; total: number };

      if (!data.resultados || data.total === 0) {
        await interaction.editReply({ content: '\u{1F614} Nenhum produto encontrado com os filtros de qualidade. Tente tags diferentes ou reduza os criterios.' });
        return;
      }

      // Fase 5: Enviar resultado no canal
      const embeds = [];
      for (const r of data.resultados) {
        if (r.produtos.length === 0) continue;

        const disc = r.produtos.map((p, i) => {
          const emojis = ['\u{1F3AE}', '\u{1F4BB}', '\u{1F579}\u{FE0F}', '\u{1F3A7}', '\u{1F5B1}\u{FE0F}'];
          const emoji = emojis[i % emojis.length];
          const parts = [];
          parts.push(`${emoji} **${p.productName.substring(0, 60)}${p.productName.length > 60 ? '...' : ''}**`);

          const infoParts = [];
          if (p.rating > 0) infoParts.push(`${estrelas(p.rating)}`);
          if (p.sales > 0) infoParts.push(`\u{1F6D2} ${formatarVendas(p.sales)} vendidos`);
          if (p.shopName) infoParts.push(`\u{1F3EA} ${p.shopName}`);
          if (infoParts.length > 0) parts.push(infoParts.join(' | '));

          if (p.priceDiscountRate > 0) {
            parts.push(`\u{1F4B0} De ${formatarMoeda(p.priceMax || p.priceMin || p.price)} por **${formatarMoeda(p.price)}** (\u{1F525} -${p.priceDiscountRate}%)`);
          } else {
            parts.push(`\u{1F4B0} **${formatarMoeda(p.price)}**`);
          }

          if (p.offerLink) parts.push(`\u{1F517} [Comprar](${p.offerLink})`);

          return parts.join('\n');
        }).join('\n\n');

        embeds.push({
          color: 0xEE4D2D,
          title: `\u{1F3F7}\u{FE0F} ${r.tag}`,
          description: `${'━'.repeat(22)}\n${disc}`,
          thumbnail: r.produtos[0]?.imageUrl ? { url: r.produtos[0].imageUrl } : undefined,
          footer: { text: '\u{26A1} Ofertas via Shopee Afiliados • Filtros: Brasil | +10 vendas | +4 estrelas' },
          timestamp: new Date().toISOString(),
        });
      }

      await channel.send({
        content: `\u{1F50D} **Resultado da busca por tags** — ${data.total} produtos encontrados`,
        embeds,
      });

      await interaction.editReply({
        content: `\u{2705} Busca concluida! **${data.total} produtos** encontrados em **${data.resultados.length} tags** com filtros de qualidade.\n\nTags: ${tags.map(t => `\`${t}\``).join(', ')} | Ordem: ${ordenacao} | ${quantidade}/tag`,
        components: [],
      });

    } catch {
      await interaction.editReply({ content: '\u{23F0} Tempo esgotado ou interacao cancelada.', components: [] });
    }
  });
  },
};
