import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const configuracaoGeral = sqliteTable('configuracao_geral', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nomeBot: text('nome_bot').notNull().default('Meu Bot'),
  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'),
  bio: text('bio').default('Ola! Sou um bot gerenciado pelo painel.'),
  status: text('status', { enum: ['online', 'idle', 'dnd', 'invisible'] })
    .notNull()
    .default('online'),
  atividade: text('atividade').default('{servidores} servidores'),
  criadoEm: integer('criado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const servidor = sqliteTable('servidor', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  guildId: text('guild_id').notNull().unique(),
  nome: text('nome').notNull(),
  donoId: text('dono_id').notNull(),
  verificaçãoAtiva: integer('verificacao_ativa', { mode: 'boolean' }).default(false),
  verificacaoConcluida: integer('verificacao_concluida', { mode: 'boolean' }).default(false),
  adicionadoEm: integer('adicionado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessaoUsuario = sqliteTable('sessao_usuario', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  discordId: text('discord_id').notNull().unique(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpira: integer('token_expira', { mode: 'timestamp' }),
  criadoEm: integer('criado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
