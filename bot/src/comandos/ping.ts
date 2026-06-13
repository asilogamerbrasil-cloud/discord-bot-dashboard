import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Comando } from './index.js';

export const comandoPing: Comando = {
  dados: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica a latencia do bot'),
  executar: async (interaction: ChatInputCommandInteraction) => {
    const latencia = Date.now() - interaction.createdTimestamp;
    await interaction.reply(`🏓 Pong! Latencia: ${latencia}ms`);
  },
};
