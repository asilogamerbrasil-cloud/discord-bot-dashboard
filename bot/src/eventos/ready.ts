import type { Client } from 'discord.js';
import { GerenciadorConfig } from './configuracao.js';

export async function eventoReady(client: Client<true>) {
  console.log('[BOT] ========================================');
  console.log(`[BOT] Conectado como: ${client.user.tag}`);
  console.log(`[BOT] ID: ${client.user.id}`);
  console.log(`[BOT] Servidores: ${client.guilds.cache.size}`);
  if (client.guilds.cache.size === 0) {
    console.log('[BOT] AVISO: Bot nao esta em nenhum servidor!');
    console.log('[BOT] Use o link para convidar: https://discord.com/oauth2/authorize?client_id=' + client.user.id + '&permissions=8&scope=bot%20applications.commands');
  } else {
    for (const [id, guild] of client.guilds.cache) {
      console.log(`[BOT]   - ${guild.name} (${id})`);
    }
  }
  console.log('[BOT] ========================================');

  await GerenciadorConfig.aplicarTudo(client);
}
