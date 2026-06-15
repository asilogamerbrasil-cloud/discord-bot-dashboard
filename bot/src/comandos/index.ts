import { REST, Routes, type ChatInputCommandInteraction } from 'discord.js';
import type { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';

export interface Comando {
  dados: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
  executar: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const comandos = new Map<string, Comando>();

import { comandoPing } from './ping.js';
import { comandoStatus } from './status.js';
import { comandoConfig } from './config.js';
import { comandoBuscar } from './buscar.js';

[comandoPing, comandoStatus, comandoConfig, comandoBuscar].forEach((cmd) => {
  comandos.set(cmd.dados.name, cmd);
});

export async function registrarComandos() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
  
  const dados = Array.from(comandos.values()).map((c) => c.dados.toJSON());
  
  try {
    console.log('Registrando comandos slash...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      { body: dados }
    );
    console.log(`${dados.length} comandos registrados!`);
  } catch (erro) {
    console.error('Erro ao registrar comandos:', erro);
  }
}
