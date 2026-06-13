// Tipos compartilhados entre bot e dashboard

export interface ConfiguracaoGeral {
  id: number;
  nomeBot: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string;
  status: 'online' | 'idle' | 'dnd' | 'invisible';
  atividade: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ServidorConfig {
  id: number;
  guildId: string;
  nome: string;
  donoId: string;
  verificacaoAtiva: boolean;
  verificacaoConcluida: boolean;
  adicionadoEm: Date;
}

export interface BotStatus {
  online: boolean;
  servidores: number;
  usuarios: number;
  comandosExecutados: number;
  uptime: number;
}
