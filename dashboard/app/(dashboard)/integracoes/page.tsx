'use client';

import { useState, useEffect } from 'react';
import { 
  Youtube, Twitch, Music2, Camera, 
  Plug, Check, Trash2, Settings, X, 
  Globe, Bell, MessageSquare, Search,
  Users, Video, Eye, Zap
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

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
  metadata: string | null;
}

const PLATAFORMAS = [
  { id: 'youtube' as const, nome: 'YouTube', icone: Youtube, cor: '#FF0000', descricao: 'Notifique sobre novos videos, shorts e lives' },
  { id: 'twitch' as const, nome: 'Twitch', icone: Twitch, cor: '#9146FF', descricao: 'Avise quando suas lives comecarem' },
  { id: 'tiktok' as const, nome: 'TikTok', icone: Music2, cor: '#FF0050', descricao: 'Compartilhe novos videos automaticamente' },
  { id: 'instagram' as const, nome: 'Instagram', icone: Camera, cor: '#E4405F', descricao: 'Postagens, stories e reels' },
];

function IntegracoesContent() {
  const searchParams = useSearchParams();
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Integracao | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [modalConectar, setModalConectar] = useState<string | null>(null);
  const [campoUsername, setCampoUsername] = useState('');
  const [conectando, setConectando] = useState(false);

  useEffect(() => { carregarIntegracoes(); }, []);

  useEffect(() => {
    if (searchParams.get('sucesso')) {
      setStatusMsg({ tipo: 'sucesso', texto: 'Conectado com sucesso!' });
      carregarIntegracoes();
    }
    if (searchParams.get('erro')) {
      const msgs: Record<string, string> = {
        token: 'Erro na autenticacao. Tente novamente.',
        user: 'Erro ao obter dados da conta.',
        save: 'Erro ao salvar conexao.',
        config: 'Credenciais nao configuradas.',
        parametros: 'Parametros invalidos.',
        desconhecido: 'Erro desconhecido.',
      };
      setStatusMsg({ tipo: 'erro', texto: msgs[searchParams.get('erro') || ''] || 'Erro' });
    }
  }, [searchParams]);

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
    if (plataforma === 'youtube' || plataforma === 'twitch') {
      window.location.href = `/api/oauth/login?plataforma=${plataforma}`;
      return;
    }
    setModalConectar(plataforma);
    setCampoUsername('');
  }

  async function confirmarConexaoManual() {
    if (!modalConectar || !campoUsername.trim()) return;
    setConectando(true);

    try {
      const res = await fetch('/api/integracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plataforma: modalConectar, nomeConta: campoUsername.trim() }),
      });
      if (res.ok) {
        await carregarIntegracoes();
        setModalConectar(null);
        setStatusMsg({ tipo: 'sucesso', texto: `${modalConectar} conectado!` });
      } else {
        const data = await res.json();
        setStatusMsg({ tipo: 'erro', texto: data.erro || 'Erro' });
      }
    } catch (e) {
      setStatusMsg({ tipo: 'erro', texto: 'Erro ao conectar' });
    } finally {
      setConectando(false);
    }
  }

  async function desconectar(id: number) {
    if (!confirm('Remover esta integracao?')) return;
    try {
      const res = await fetch(`/api/integracoes?id=${id}`, { method: 'DELETE' });
      if (res.ok) { setEditando(null); await carregarIntegracoes(); }
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
      const body: Record<string, unknown> = { id: editando.id };

      if (editando.plataforma === 'youtube' || editando.plataforma === 'twitch') {
        const meta = editando.metadata ? JSON.parse(editando.metadata) : {};
        body.metadata = JSON.stringify(meta);
      }
      
      if (editando.plataforma === 'tiktok' || editando.plataforma === 'instagram') {
        body.webhookUrl = editando.webhookUrl;
      }
      
      body.mensagemTemplate = editando.mensagemTemplate;

      const res = await fetch('/api/integracoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await carregarIntegracoes();
        setEditando(null);
      }
    } catch (e) { console.error(e); }
  }

  function atualizarMetadata(chave: string, valor: boolean) {
    if (!editando) return;
    const meta = editando.metadata ? JSON.parse(editando.metadata) : {};
    meta[chave] = valor;
    setEditando({ ...editando, metadata: JSON.stringify(meta) });
  }

  if (carregando) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold text-white">Integracoes</h1><div className="animate-pulse text-[#B5BAC1]">Carregando...</div></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Integracoes</h1>

      {statusMsg && (
        <div className={`px-4 py-3 rounded-md text-sm flex items-center justify-between ${statusMsg.tipo === 'sucesso' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {statusMsg.texto}
          <button onClick={() => setStatusMsg(null)} className="ml-2 hover:underline">X</button>
        </div>
      )}

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
            let meta: Record<string, unknown> = {};
            if (integracao?.metadata) {
              try { meta = JSON.parse(integracao.metadata); } catch {}
            }

            return (
              <div key={plat.id} className={`bg-[#2B2D31] border rounded-lg p-5 transition-colors ${conectado ? 'border-l-4 shadow-lg' : 'border-[#1E1F22] hover:border-[#3F4147]'}`}
                style={conectado ? { borderLeftColor: plat.cor } : {}}>
                
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${plat.cor}20` }}>
                      <Icon className="w-6 h-6" style={{ color: plat.cor }} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{plat.nome}</h3>
                      <p className="text-xs text-[#B5BAC1]">{plat.descricao}</p>
                    </div>
                  </div>
                  {conectado && (
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input type="checkbox" checked={integracao.ativo} onChange={() => toggleAtivo(integracao)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-[#3F4147] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5865F2]"></div>
                    </label>
                  )}
                </div>

                {conectado ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-[#1E1F22] rounded-lg p-3">
                      {integracao.avatarUrl ? (
                        <img src={integracao.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: plat.cor }}>
                          {(integracao.nomeConta || plat.nome)[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{integracao.nomeConta || 'Conectado'}</p>
                        <p className="text-xs text-green-400 flex items-center gap-1"><Check className="w-3 h-3" />Conectado</p>
                      </div>
                    </div>

                    {Object.keys(meta).length > 0 && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {(meta.inscritos !== undefined || meta.seguidores !== undefined) && (
                          <div className="col-span-2 bg-[#1E1F22] rounded p-2 text-center">
                            <p className="text-[#72767D]">{meta.inscritos !== undefined ? 'Inscritos' : 'Seguidores'}</p>
                            <p className="text-white font-bold flex items-center justify-center gap-1">
                              <Users className="w-3 h-3" />
                              {((meta.inscritos as number) || (meta.seguidores as number) || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {meta.videos !== undefined && (
                          <div className="bg-[#1E1F22] rounded p-2 text-center">
                            <p className="text-[#72767D]">Videos</p>
                            <p className="text-white font-bold flex items-center justify-center gap-1"><Video className="w-3 h-3" />{(meta.videos as number).toLocaleString()}</p>
                          </div>
                        )}
                        {meta.visualizacoes !== undefined && (
                          <div className="bg-[#1E1F22] rounded p-2 text-center">
                            <p className="text-[#72767D]">Views</p>
                            <p className="text-white font-bold flex items-center justify-center gap-1"><Eye className="w-3 h-3" />{(meta.visualizacoes as number).toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => setEditando(integracao)} className="flex items-center gap-1 text-xs text-[#B5BAC1] hover:text-white bg-[#1E1F22] hover:bg-[#313338] px-3 py-1.5 rounded transition-colors">
                        <Settings className="w-3 h-3" /> Configurar
                      </button>
                      <button onClick={() => desconectar(integracao.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded transition-colors">
                        <Trash2 className="w-3 h-3" /> Desconectar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => conectar(plat.id)} className="flex items-center gap-2 text-sm text-[#B5BAC1] hover:text-white bg-[#1E1F22] hover:bg-[#313338] px-3 py-2 rounded-md transition-colors w-full justify-center">
                    <Plug className="w-4 h-4" /> Conectar {plat.nome}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {modalConectar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2B2D31] border border-[#313338] rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[#1E1F22]">
              <h3 className="text-white font-semibold">Conectar {modalConectar}</h3>
              <button onClick={() => setModalConectar(null)} className="text-[#B5BAC1] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-[#B5BAC1] mb-1">Nome de usuario ou URL do perfil</label>
                <input
                  type="text"
                  value={campoUsername}
                  onChange={(e) => setCampoUsername(e.target.value)}
                  placeholder={modalConectar === 'instagram' ? '@usuario ou instagram.com/usuario' : '@usuario ou tiktok.com/@usuario'}
                  className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && confirmarConexaoManual()}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={confirmarConexaoManual} disabled={conectando || !campoUsername.trim()} className="bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                  {conectando ? 'Conectando...' : <><Search className="w-4 h-4" /> Conectar</>}
                </button>
                <button onClick={() => setModalConectar(null)} className="text-[#B5BAC1] hover:text-white px-4 py-2 rounded-md text-sm">Cancelar</button>
              </div>
              <p className="text-xs text-[#72767D]">A integracao OAuth completa vira em breve. Por enquanto, conecte manualmente.</p>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2B2D31] border border-[#313338] rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#1E1F22] sticky top-0 bg-[#2B2D31]">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurar {PLATAFORMAS.find((p) => p.id === editando.plataforma)?.nome}
              </h3>
              <button onClick={() => setEditando(null)} className="text-[#B5BAC1] hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={salvarConfig} className="p-4 space-y-4">
              {editando.plataforma === 'youtube' && (
                <div className="space-y-3">
                  <h4 className="text-white text-sm font-medium flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" />Tipos de Conteudo</h4>
                  <p className="text-xs text-[#B5BAC1]">Escolha quais tipos de conteudo o bot deve monitorar:</p>
                  
                  {[
                    { key: 'notificarVideos', label: 'Videos Novos', desc: 'Notificar quando um video novo for publicado' },
                    { key: 'notificarShorts', label: 'Shorts', desc: 'Notificar quando um Short for publicado' },
                    { key: 'notificarLives', label: 'Lives', desc: 'Notificar quando uma live comecar' },
                  ].map((op) => {
                    const meta = editando.metadata ? JSON.parse(editando.metadata) : {};
                    const ativo = meta[op.key] !== false;
                    return (
                      <label key={op.key} className="flex items-center justify-between bg-[#1E1F22] rounded-lg p-3 cursor-pointer">
                        <div>
                          <p className="text-white text-sm">{op.label}</p>
                          <p className="text-xs text-[#72767D]">{op.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={ativo}
                          onChange={(e) => atualizarMetadata(op.key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#3F4147] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:absolute after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5865F2] relative flex-shrink-0">
                          <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${ativo ? 'left-[18px]' : 'left-[2px]'}`} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {editando.plataforma === 'twitch' && (
                <div className="space-y-3">
                  <h4 className="text-white text-sm font-medium flex items-center gap-2"><Zap className="w-4 h-4 text-purple-400" />Notificacoes</h4>
                  {[
                    { key: 'notificarLives', label: 'Lives', desc: 'Notificar quando entrar ao vivo' },
                  ].map((op) => {
                    const meta = editando.metadata ? JSON.parse(editando.metadata) : {};
                    const ativo = meta[op.key] !== false;
                    return (
                      <label key={op.key} className="flex items-center justify-between bg-[#1E1F22] rounded-lg p-3 cursor-pointer">
                        <div>
                          <p className="text-white text-sm">{op.label}</p>
                          <p className="text-xs text-[#72767D]">{op.desc}</p>
                        </div>
                        <input type="checkbox" checked={ativo} onChange={(e) => atualizarMetadata(op.key, e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-[#3F4147] peer-focus:outline-none rounded-full relative flex-shrink-0">
                          <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${ativo ? 'left-[18px]' : 'left-[2px]'}`} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {(editando.plataforma === 'tiktok' || editando.plataforma === 'instagram') && (
                <div>
                  <label className="block text-xs text-[#B5BAC1] mb-1 flex items-center gap-1">
                    <Bell className="w-3 h-3" /> Webhook do Discord
                  </label>
                  <input
                    type="url"
                    value={editando.webhookUrl || ''}
                    onChange={(e) => setEditando((prev) => prev ? { ...prev, webhookUrl: e.target.value } : null)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-[#B5BAC1] mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Template da Mensagem
                </label>
                <textarea
                  value={editando.mensagemTemplate}
                  onChange={(e) => setEditando((prev) => prev ? { ...prev, mensagemTemplate: e.target.value } : null)}
                  rows={3}
                  className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none resize-none font-mono"
                />
                <p className="text-xs text-[#72767D] mt-1">
                  Variaveis: <code className="bg-[#1E1F22] px-1 rounded">{'{plataforma}'}</code> <code className="bg-[#1E1F22] px-1 rounded">{'{titulo}'}</code> <code className="bg-[#1E1F22] px-1 rounded">{'{url}'}</code> <code className="bg-[#1E1F22] px-1 rounded">{'{autor}'}</code>
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">Salvar</button>
                <button type="button" onClick={() => setEditando(null)} className="text-[#B5BAC1] hover:text-white px-4 py-2 rounded-md text-sm">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaginaIntegracoes() {
  return (
    <Suspense fallback={<div className="animate-pulse text-[#B5BAC1] p-6">Carregando...</div>}>
      <IntegracoesContent />
    </Suspense>
  );
}
