import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Comando } from './index.js';

export const comandoStatus: Comando = {
  dados: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Mostra informacoes do bot'),
  executar: async (interaction: ChatInputCommandInteraction) => {
    const client = interaction.client;
    const servidores = client.guilds.cache.size;
    const usuarios = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    
    await interaction.reply({
      embeds: [{
        title: '📊 Status do Bot',
        color: 0x5865F2,
        fields: [
          { name: 'Servidores', value: `${servidores}`, inline: true },
          { name: 'Usuarios', value: `${usuarios}`, inline: true },
          { name: 'Latencia', value: `${client.ws.ping}ms`, inline: true },
        ],
        timestamp: new Date().toISOString(),
      }],
    });
  },
};
