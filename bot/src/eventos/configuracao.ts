import type { Client } from 'discord.js';
import { ActivityType } from 'discord.js';
import { db } from '../db/index.js';
import { configuracaoGeral } from '../db/schema.js';

export class GerenciadorConfig {
  static async carregarDoBanco() {
    const resultado = await db.select().from(configuracaoGeral).limit(1);

    if (resultado.length === 0) {
      await db.insert(configuracaoGeral).values({});
      return db.select().from(configuracaoGeral).limit(1).then((r) => r[0]);
    }

    return resultado[0];
  }

  static async aplicarPerfil(client: Client<true>) {
    try {
      const config = await GerenciadorConfig.carregarDoBanco();

      if (config.nomeBot && config.nomeBot !== client.user.username) {
        await client.user.setUsername(config.nomeBot);
      }

      if (config.avatarUrl) {
        await client.user.setAvatar(config.avatarUrl);
      }

      if (config.bannerUrl) {
        await client.user.setBanner(config.bannerUrl);
      }
    } catch (erro) {
      console.error('Erro ao aplicar perfil do Discord:', erro);
    }
  }

  static async aplicarPresenca(client: Client<true>) {
    try {
      const config = await GerenciadorConfig.carregarDoBanco();
      const servidores = client.guilds.cache.size;

      const atividadeTexto = (config.atividade || '{servidores} servidores').replace('{servidores}', String(servidores));

      client.user.setPresence({
        activities: [{ name: atividadeTexto, type: ActivityType.Watching }],
        status: config.status as 'online' | 'idle' | 'dnd' | 'invisible',
      });
    } catch (erro) {
      console.error('Erro ao aplicar presenca:', erro);
    }
  }

  static async aplicarTudo(client: Client<true>) {
    await GerenciadorConfig.aplicarPerfil(client);
    await GerenciadorConfig.aplicarPresenca(client);
    console.log('Configuracao do bot aplicada com sucesso!');
  }
}
