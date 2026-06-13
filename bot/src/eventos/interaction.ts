import type { Interaction } from 'discord.js';
import { comandos } from '../comandos/index.js';

export async function eventoInteraction(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;

  const comando = comandos.get(interaction.commandName);
  if (!comando) return;

  try {
    await comando.executar(interaction);
  } catch (erro) {
    console.error(`Erro ao executar comando ${interaction.commandName}:`, erro);
    
    const resposta = { content: 'Ocorreu um erro ao executar este comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(resposta);
    } else {
      await interaction.reply(resposta);
    }
  }
}
