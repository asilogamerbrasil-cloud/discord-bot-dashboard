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
