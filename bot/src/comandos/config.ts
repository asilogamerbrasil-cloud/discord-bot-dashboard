import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Comando } from './index.js';

export const comandoConfig: Comando = {
  dados: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Gerencia as configuracoes do bot')
    .addSubcommand((sub) =>
      sub.setName('ver').setDescription('Ve as configuracoes atuais')
    ),
  executar: async (interaction: ChatInputCommandInteraction) => {
    const subcomando = interaction.options.getSubcommand();
    
    if (subcomando === 'ver') {
      const client = interaction.client;
      const botUser = client.user;
      
      await interaction.reply({
        embeds: [{
          title: '⚙️ Configuracao Atual',
          color: 0x5865F2,
          thumbnail: { url: botUser.displayAvatarURL() },
          fields: [
            { name: 'Nome', value: botUser.username, inline: true },
            { name: 'Tag', value: botUser.tag, inline: true },
          ],
        }],
      });
    }
  },
};
