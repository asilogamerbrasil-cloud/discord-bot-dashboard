import type { Client } from 'discord.js';
import { GerenciadorConfig } from './configuracao.js';

export async function eventoReady(client: Client<true>) {
  console.log(`Bot conectado como ${client.user.tag}`);
  console.log(`Presente em ${client.guilds.cache.size} servidores`);

  await GerenciadorConfig.aplicarTudo(client);
}
