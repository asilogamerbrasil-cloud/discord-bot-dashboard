'use client';

import { useState, useEffect } from 'react';
import { 
  Youtube, Twitch, Music2, Camera, 
  Plug, Check, Trash2, Settings, X, 
  Globe, Bell, MessageSquare, ExternalLink
} from 'lucide-react';

interface Integracao {
  id: number;
  plataforma: 'youtube' | 'twitch' | 'tiktok' | 'instagram';
  accessToken: string | null;
  nomeConta: string | null;
  avatarUrl: string | null;
  contaId: string | null;
  ativo: boolean;
  webhookUrl: string | null;
  mensagemTemplate: string;
}

const PLATAFORMAS = [
  {
    id: 'youtube' as const,
    nome: 'YouTube',
    icone: Youtube,
    cor: '#FF0000',
    bgCor: 'bg-red-500/10',
    borderCor: 'border-red-500/30',
    hoverCor: 'hover:border-red-500/50',
    textoCor: 'text-red-400',
    descricao: 'Notifique sobre novos videos e lives',
  },
  {
    id: 'twitch' as const,
    nome: 'Twitch',
    icone: Twitch,
    cor: '#9146FF',
    bgCor: 'bg-purple-500/10',
    borderCor: 'border-purple-500/30',
    hoverCor: 'hover:border-purple-500/50',
    textoCor: 'text-purple-400',
    descricao: 'Avise quando suas lives comecarem',
  },
  {
    id: 'tiktok' as const,
    nome: 'TikTok',
    icone: Music2,
    cor: '#FF0050',
    bgCor: 'bg-pink-500/10',
    borderCor: 'border-pink-500/30',
    hoverCor: 'hover:border-pink-500/50',
    textoCor: 'text-pink-400',
    descricao: 'Compartilhe novos videos automaticamente',
  },
  {
    id: 'instagram' as const,
    nome: 'Instagram',
    icone: Camera,
    cor: '#E4405F',
    bgCor: 'bg-rose-500/10',
    borderCor: 'border-rose-500/30',
    hoverCor: 'hover:border-rose-500/50',
    textoCor: 'text-rose-400',
    descricao: 'Postagens, stories e reels',
  },
];

export default function PaginaIntegracoes() {
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Integracao | null>(null);

  useEffect(() => {
    carregarIntegracoes();
  }, []);

  async function carregarIntegracoes() {
    try {
      const res = await fetch('/api/integracoes');
      if (res.ok) setIntegracoes(await res.json());
    } catch (e) { console.error(e); }
    finally { setCarregando(false); }
  }

  function obterIntegracao(plataforma: string) {
    return integracoes.find((i) => i.plataforma === plataforma);
  }

  async function conectar(plataforma: string) {
    if (plataforma === 'youtube') {
      window.location.href = `/api/oauth/login?plataforma=youtube`;
      return;
    }

    if (plataforma === 'twitch') {
      try {
        const res = await fetch('/api/integracoes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plataforma: 'twitch' }),
        });
        if (res.ok) {
          await carregarIntegracoes();
        } else {
          const data = await res.json();
          alert(data.erro || 'Erro ao conectar Twitch');
        }
      } catch (e) {
        alert('Erro ao conectar');
      }
      return;
    }

    const nome = prompt(`Nome da conta no ${plataforma}:`);
    if (!nome) return;

    try {
      const res = await fetch('/api/integracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plataforma, nomeConta: nome }),
      });
      if (res.ok) await carregarIntegracoes();
    } catch (e) { console.error(e); }
  }

  async function desconectar(id: number) {
    if (!confirm('Remover esta integracao?')) return;
    try {
      const res = await fetch(`/api/integracoes?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEditando(null);
        await carregarIntegracoes();
      }
    } catch (e) { console.error(e); }
  }

  async function toggleAtivo(integracao: Integracao) {
    try {
      const res = await fetch('/api/integracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: integracao.id, ativo: !integracao.ativo }),
      });
      if (res.ok) await carregarIntegracoes();
    } catch (e) { console.error(e); }
  }

  async function salvarConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;

    try {
      const res = await fetch('/api/integracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editando.id,
          webhookUrl: editando.webhookUrl,
          mensagemTemplate: editando.mensagemTemplate,
        }),
      });
      if (res.ok) {
        await carregarIntegracoes();
        setEditando(null);
      }
    } catch (e) { console.error(e); }
  }

  if (carregando) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Integracoes</h1>
        <div className="animate-pulse text-[#B5BAC1]">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Integracoes</h1>

      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-[#5865F2]" />
            <h2 className="text-lg font-semibold text-white">Redes Sociais</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATAFORMAS.map((plat) => {
              const integracao = obterIntegracao(plat.id);
              const Icon = plat.icone;
              const conectado = !!integracao;

              return (
                <div
                  key={plat.id}
                  className={`bg-[#2B2D31] border rounded-lg p-5 transition-colors ${
                    conectado
                      ? `border-[${plat.cor}]/50 ${plat.bgCor}`
                      : `border-[#1E1F22] ${plat.hoverCor}`
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${plat.cor}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: plat.cor }} />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{plat.nome}</h3>
                        <p className="text-xs text-[#B5BAC1]">{plat.descricao}</p>
                      </div>
                    </div>

                    {conectado && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={integracao.ativo}
                          onChange={() => toggleAtivo(integracao)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#3F4147] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5865F2]"></div>
                      </label>
                    )}
                  </div>

                  {conectado ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {integracao.avatarUrl ? (
                          <img src={integracao.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: plat.cor }}
                          >
                            {integracao.nomeConta?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-sm text-white">{integracao.nomeConta || 'Conectado'}</span>
                        <span className="flex items-center gap-1 text-xs text-green-400 ml-1">
                          <Check className="w-3 h-3" />
                          Conectado
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditando(integracao)}
                          className="flex items-center gap-1 text-xs text-[#B5BAC1] hover:text-white bg-[#1E1F22] hover:bg-[#313338] px-2 py-1 rounded transition-colors"
                        >
                          <Settings className="w-3 h-3" />
                          Configurar
                        </button>
                        <button
                          onClick={() => desconectar(integracao.id)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Desconectar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => conectar(plat.id)}
                      className="flex items-center gap-2 text-sm text-[#B5BAC1] hover:text-white bg-[#1E1F22] hover:bg-[#313338] px-3 py-2 rounded-md transition-colors w-full justify-center"
                    >
                      <Plug className="w-4 h-4" />
                      Conectar {plat.nome}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2B2D31] border border-[#313338] rounded-lg w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-[#1E1F22]">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurar {PLATAFORMAS.find((p) => p.id === editando.plataforma)?.nome}
              </h3>
              <button onClick={() => setEditando(null)} className="text-[#B5BAC1] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={salvarConfig} className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-[#B5BAC1] mb-1 flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  Webhook URL do Discord
                </label>
                <input
                  type="url"
                  value={editando.webhookUrl || ''}
                  onChange={(e) => setEditando((prev) => prev ? { ...prev, webhookUrl: e.target.value } : null)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none"
                />
                <p className="text-xs text-[#72767D] mt-1">
                  Crie um webhook no canal do Discord onde quer receber as notificacoes
                </p>
              </div>

              <div>
                <label className="block text-xs text-[#B5BAC1] mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  Template da Mensagem
                </label>
                <textarea
                  value={editando.mensagemTemplate}
                  onChange={(e) => setEditando((prev) => prev ? { ...prev, mensagemTemplate: e.target.value } : null)}
                  rows={4}
                  className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none resize-none font-mono"
                />
                <div className="text-xs text-[#72767D] mt-2 space-y-0.5">
                  <p>Variaveis disponiveis:</p>
                  <p><code className="bg-[#1E1F22] px-1 rounded">{'{plataforma}'}</code> - Nome da plataforma</p>
                  <p><code className="bg-[#1E1F22] px-1 rounded">{'{titulo}'}</code> - Titulo do conteudo</p>
                  <p><code className="bg-[#1E1F22] px-1 rounded">{'{url}'}</code> - Link do conteudo</p>
                  <p><code className="bg-[#1E1F22] px-1 rounded">{'{autor}'}</code> - Nome do canal/criador</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="text-[#B5BAC1] hover:text-white px-4 py-2 rounded-md text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
