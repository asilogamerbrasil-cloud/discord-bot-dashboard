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

export const administradores = sqliteTable('administradores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  discordId: text('discord_id').notNull().unique(),
  nome: text('nome').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['owner', 'admin'] }).notNull().default('admin'),
  adicionadoEm: integer('adicionado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const integracoes = sqliteTable('integracoes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  plataforma: text('plataforma', { enum: ['youtube', 'twitch', 'tiktok', 'instagram', 'shopee'] }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpira: integer('token_expira', { mode: 'timestamp' }),
  nomeConta: text('nome_conta'),
  avatarUrl: text('avatar_url'),
  contaId: text('conta_id'),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  webhookUrl: text('webhook_url'),
  mensagemTemplate: text('mensagem_template').default('Novo conteudo no {plataforma}!\n\n{titulo}\n{url}'),
  metadata: text('metadata'),
  criadoEm: integer('criado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const mensagensProgramadas = sqliteTable('mensagens_programadas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull().default('Nova Mensagem'),
  tipo: text('tipo', { enum: ['manual', 'shopee_preset'] }).notNull().default('manual'),
  mensagem: text('mensagem').notNull().default(''),
  timerIntervalo: integer('timer_intervalo').notNull().default(3600),
  servidoresCanais: text('servidores_canais'),
  shopeePreset: text('shopee_preset'),
  ultimoEnvio: integer('ultimo_envio', { mode: 'timestamp' }),
  ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
  criadoEm: integer('criado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  atualizadoEm: integer('atualizado_em', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
