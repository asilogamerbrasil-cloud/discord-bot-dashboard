'use client';

import { useState, useEffect } from 'react';
import { X, LogOut, Shield, MessageSquare, User, ChevronLeft, Eye, RefreshCw, ThumbsUp, Bot, Hash } from 'lucide-react';

interface ServidorInfo {
  id: string;
  nome: string;
  icone: string | null;
  dono: boolean;
}

interface Canal {
  id: string;
  nome: string;
}

interface Cargo {
  id: string;
  nome: string;
  cor: number;
  posicao: number;
}

interface Mensagem {
  id: string;
  conteudo: string;
  autor: { id: string; nome: string; avatar: string | null; bot: boolean };
  data: string;
  embeds: { titulo?: string; descricao?: string; campos?: { name: string; value: string }[] }[];
  botoes: { label: string; customId: string; estilo: number; emoji: { name: string; id?: string } | null; disabled: boolean }[];
  reacoes: { emoji: { id: string | null; nome: string; animado: boolean }; quantidade: number }[];
  anexos: { url: string; nome: string }[];
}

export default function PaginaServidores() {
  const [servidores, setServidores] = useState<ServidorInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [servidorSelecionado, setServidorSelecionado] = useState<ServidorInfo | null>(null);

  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=1515429281126289638&permissions=8&scope=bot%20applications.commands`;

  useEffect(() => {
    fetch('/api/servidores')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (Array.isArray(data)) setServidores(data);
        else setErro(data.erro || 'Erro ao carregar');
      })
      .catch(() => setErro('Erro ao conectar'))
      .finally(() => setCarregando(false));
  }, []);

  if (servidorSelecionado) {
    return (
      <PainelServidor
        servidor={servidorSelecionado}
        onVoltar={() => setServidorSelecionado(null)}
        onRemovido={(id) => {
          setServidores((prev) => prev.filter((s) => s.id !== id));
          setServidorSelecionado(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Servidores</h1>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors no-underline"
        >
          + Adicionar Bot
        </a>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-md">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="animate-pulse text-[#B5BAC1]">Carregando servidores...</div>
      ) : servidores.length === 0 ? (
        <div className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-8 text-center">
          <p className="text-[#B5BAC1]">Nenhum servidor encontrado.</p>
          <p className="text-[#B5BAC1] text-sm mt-1">
            O bot precisa estar em um servidor para aparecer aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servidores.map((s) => (
            <button
              key={s.id}
              onClick={() => setServidorSelecionado(s)}
              className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-4 hover:border-[#5865F2]/50 transition-colors text-left w-full"
            >
              <div className="flex items-center gap-3">
                {s.icone ? (
                  <img src={s.icone} alt="" className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#313338] flex items-center justify-center text-lg font-bold text-[#B5BAC1]">
                    {s.nome[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{s.nome}</p>
                  <p className="text-xs text-[#B5BAC1]">
                    {s.dono ? 'Dono' : 'Membro'} · Clique para gerenciar
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PainelServidor({
  servidor,
  onVoltar,
  onRemovido,
}: {
  servidor: ServidorInfo;
  onVoltar: () => void;
  onRemovido: (id: string) => void;
}) {
  const [aba, setAba] = useState<'acoes' | 'canais' | 'cargos' | 'nickname' | 'visao'>('acoes');
  const [canais, setCanais] = useState<Canal[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [canalSelecionado, setCanalSelecionado] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [novoNick, setNovoNick] = useState('');
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(false);

  // Visao ao Vivo
  const [canalVisao, setCanalVisao] = useState('');
  const [mensagensVisao, setMensagensVisao] = useState<Mensagem[]>([]);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);

  async function carregarCanais() {
    setCarregandoDados(true);
    try {
      const res = await fetch(`/api/servidores/${servidor.id}/canais`);
      if (res.ok) setCanais(await res.json());
    } catch (e) { console.error(e); }
    finally { setCarregandoDados(false); }
  }

  async function carregarCargos() {
    setCarregandoDados(true);
    try {
      const res = await fetch(`/api/servidores/${servidor.id}/cargos`);
      if (res.ok) setCargos(await res.json());
    } catch (e) { console.error(e); }
    finally { setCarregandoDados(false); }
  }

  async function carregarMensagens() {
    if (!canalVisao) return;
    setCarregandoMensagens(true);
    try {
      const res = await fetch(`/api/servidores/${servidor.id}/mensagens?canal=${canalVisao}`);
      if (res.ok) {
        const data = await res.json();
        setMensagensVisao(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error(e); }
    finally { setCarregandoMensagens(false); }
  }

  async function reagir(mensagemId: string, emoji: { id: string | null; nome: string }) {
    try {
      const res = await fetch(`/api/servidores/${servidor.id}/interagir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canalId: canalVisao, messageId: mensagemId, emoji }),
      });
      if (res.ok) {
        setMensagemStatus({ tipo: 'sucesso', texto: `Reagiu com ${emoji.nome}` });
        setTimeout(() => carregarMensagens(), 500);
      } else {
        const data = await res.json();
        setMensagemStatus({ tipo: 'erro', texto: data.erro || 'Erro' });
      }
    } catch (e) {
      setMensagemStatus({ tipo: 'erro', texto: 'Erro ao reagir' });
    }
  }

  async function sairServidor() {
    if (!confirm(`Tem certeza que deseja remover o bot do servidor "${servidor.nome}"?`)) return;
    try {
      const res = await fetch(`/api/servidores/${servidor.id}`, { method: 'DELETE' });
      if (res.ok) {
        onRemovido(servidor.id);
      } else {
        const data = await res.json();
        alert(data.erro || 'Erro ao sair');
      }
    } catch (e) {
      alert('Erro ao sair do servidor');
    }
  }

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault();
    setMensagemStatus(null);
    try {
      const res = await fetch(`/api/servidores/${servidor.id}/mensagem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canalId: canalSelecionado, mensagem }),
      });
      const data = await res.json();
      if (res.ok) {
        setMensagemStatus({ tipo: 'sucesso', texto: 'Mensagem enviada!' });
        setMensagem('');
      } else {
        setMensagemStatus({ tipo: 'erro', texto: data.erro || 'Erro' });
      }
    } catch (e) {
      setMensagemStatus({ tipo: 'erro', texto: 'Erro ao enviar' });
    }
  }

  async function alterarNickname(e: React.FormEvent) {
    e.preventDefault();
    setMensagemStatus(null);
    try {
      const res = await fetch(`/api/servidores/${servidor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: novoNick }),
      });
      if (res.ok) {
        setMensagemStatus({ tipo: 'sucesso', texto: 'Nome alterado!' });
        setNovoNick('');
      } else {
        const data = await res.json();
        setMensagemStatus({ tipo: 'erro', texto: data.erro || 'Erro' });
      }
    } catch (e) {
      setMensagemStatus({ tipo: 'erro', texto: 'Erro ao alterar' });
    }
  }

  function mudarAba(nova: 'acoes' | 'canais' | 'cargos' | 'nickname' | 'visao') {
    setAba(nova);
    setMensagemStatus(null);
    if ((nova === 'canais' || nova === 'visao') && canais.length === 0) carregarCanais();
    if (nova === 'cargos' && cargos.length === 0) carregarCargos();
  }

  function emojiParaStr(emoji: { id: string | null; nome: string; animado: boolean }): string {
    if (emoji.id) return `https://cdn.discordapp.com/emojis/${emoji.id}.png`;
    return emoji.nome;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onVoltar} className="text-[#B5BAC1] hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        {servidor.icone ? (
          <img src={servidor.icone} alt="" className="w-10 h-10 rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#313338] flex items-center justify-center font-bold text-white">
            {servidor.nome[0]?.toUpperCase()}
          </div>
        )}
        <h1 className="text-2xl font-bold text-white">{servidor.nome}</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'visao' as const, label: 'Visao ao Vivo', icon: Eye },
          { id: 'canais' as const, label: 'Enviar Msg', icon: MessageSquare },
          { id: 'cargos' as const, label: 'Cargos', icon: Shield },
          { id: 'nickname' as const, label: 'Nome', icon: User },
          { id: 'acoes' as const, label: 'Sair', icon: LogOut },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => mudarAba(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                aba === tab.id
                  ? 'bg-[#5865F2] text-white'
                  : 'bg-[#2B2D31] text-[#B5BAC1] hover:bg-[#313338] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {mensagemStatus && (
        <div
          className={`px-4 py-3 rounded-md text-sm ${
            mensagemStatus.tipo === 'sucesso'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {mensagemStatus.texto}
        </div>
      )}

      <div className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-6">
        {aba === 'visao' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visao ao Vivo
              </h3>
              {canalVisao && (
                <button
                  onClick={carregarMensagens}
                  className="flex items-center gap-1 text-xs text-[#B5BAC1] hover:text-white transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${carregandoMensagens ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              )}
            </div>

            {carregandoDados ? (
              <div className="animate-pulse text-[#B5BAC1] text-sm">Carregando canais...</div>
            ) : (
              <select
                value={canalVisao}
                onChange={(e) => {
                  setCanalVisao(e.target.value);
                  if (e.target.value) setTimeout(() => carregarMensagens(), 100);
                }}
                className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none"
              >
                <option value="">Selecione um canal para visualizar...</option>
                {canais.map((c) => (
                  <option key={c.id} value={c.id}># {c.nome}</option>
                ))}
              </select>
            )}

            {carregandoMensagens ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-[#1E1F22] rounded-lg p-3 h-16" />
                ))}
              </div>
            ) : mensagensVisao.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {mensagensVisao.map((msg) => (
                  <div key={msg.id} className="bg-[#1E1F22] rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      {msg.autor.avatar ? (
                        <img src={msg.autor.avatar} alt="" className="w-8 h-8 rounded-full mt-0.5" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                          {msg.autor.nome[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{msg.autor.nome}</span>
                          {msg.autor.bot && (
                            <span className="text-[10px] bg-[#5865F2]/20 text-[#5865F2] px-1.5 py-0.5 rounded font-bold">
                              BOT
                            </span>
                          )}
                          <span className="text-xs text-[#72767D]">
                            {new Date(msg.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {msg.conteudo && (
                          <p className="text-sm text-[#DBDEE1] mt-1 whitespace-pre-wrap break-words">{msg.conteudo}</p>
                        )}

                        {msg.embeds.map((embed, i) => (
                          <div key={i} className="mt-2 border-l-4 border-[#5865F2] pl-3 py-2 bg-[#2B2D31] rounded-r">
                            {embed.titulo && <p className="text-sm font-bold text-white">{embed.titulo}</p>}
                            {embed.descricao && <p className="text-sm text-[#B5BAC1]">{embed.descricao}</p>}
                            {embed.campos?.map((campo, j) => (
                              <div key={j} className="mt-1">
                                <p className="text-xs font-bold text-white">{campo.name}</p>
                                <p className="text-xs text-[#B5BAC1]">{campo.value}</p>
                              </div>
                            ))}
                          </div>
                        ))}

                        {msg.anexos.map((anexo, i) => (
                          <img key={i} src={anexo.url} alt={anexo.nome} className="mt-2 max-w-[300px] rounded-md" />
                        ))}

                        {msg.botoes.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {msg.botoes.map((btn, i) => (
                              <span
                                key={i}
                                className={`text-xs px-3 py-1 rounded-md ${
                                  btn.disabled
                                    ? 'bg-[#313338] text-[#72767D] cursor-not-allowed'
                                    : btn.estilo === 4
                                      ? 'bg-red-500/20 text-red-400'
                                      : btn.estilo === 3
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-[#4E5058] text-white'
                                }`}
                              >
                                {btn.emoji && (btn.emoji.id
                                  ? <img src={`https://cdn.discordapp.com/emojis/${btn.emoji.id}.png`} className="w-4 h-4 inline mr-1" alt="" />
                                  : <span className="mr-1">{btn.emoji.name}</span>
                                )}
                                {btn.label}
                                {btn.disabled && ' (desabilitado)'}
                              </span>
                            ))}
                            <span className="text-xs text-[#72767D] self-center ml-1">
                              (botoes sao informativos - para verificar, use reacoes abaixo)
                            </span>
                          </div>
                        )}

                        {msg.reacoes.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {msg.reacoes.map((r, i) => (
                              <button
                                key={i}
                                onClick={() => reagir(msg.id, r.emoji)}
                                className="flex items-center gap-1 bg-[#2B2D31] hover:bg-[#5865F2]/30 border border-[#3F4147] hover:border-[#5865F2] px-2 py-1 rounded-md text-xs text-[#B5BAC1] hover:text-white transition-colors"
                                title={`Clique para reagir com ${r.emoji.nome}`}
                              >
                                {r.emoji.id ? (
                                  <img src={emojiParaStr(r.emoji)} className="w-4 h-4" alt={r.emoji.nome} />
                                ) : (
                                  <span>{r.emoji.nome}</span>
                                )}
                                <span>{r.quantidade}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : canalVisao ? (
              <div className="text-center py-8 text-[#B5BAC1] text-sm">
                Nenhuma mensagem encontrada neste canal.
              </div>
            ) : null}
          </div>
        )}

        {aba === 'acoes' && (
          <div className="space-y-4">
            <h3 className="text-white font-medium">Acoes do Servidor</h3>
            <button
              onClick={sairServidor}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-3 rounded-md text-sm font-medium transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              Sair do Servidor
            </button>
          </div>
        )}

        {aba === 'canais' && (
          <form onSubmit={enviarMensagem} className="space-y-4 max-w-lg">
            <h3 className="text-white font-medium">Enviar Mensagem de Teste</h3>
            {carregandoDados ? (
              <div className="animate-pulse text-[#B5BAC1] text-sm">Carregando canais...</div>
            ) : (
              <>
                <select
                  value={canalSelecionado}
                  onChange={(e) => setCanalSelecionado(e.target.value)}
                  className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none"
                  required
                >
                  <option value="">Selecione um canal...</option>
                  {canais.map((c) => (
                    <option key={c.id} value={c.id}># {c.nome}</option>
                  ))}
                </select>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={3}
                  placeholder="Digite a mensagem de teste..."
                  className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none resize-none"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Enviar
                </button>
              </>
            )}
          </form>
        )}

        {aba === 'cargos' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-white font-medium">Cargos do Servidor</h3>
            {carregandoDados ? (
              <div className="animate-pulse text-[#B5BAC1] text-sm">Carregando cargos...</div>
            ) : (
              <div className="space-y-2">
                {cargos
                  .sort((a, b) => b.posicao - a.posicao)
                  .map((c) => (
                    <div key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-[#313338]">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: c.cor === 0 ? '#95a5a6' : `#${c.cor.toString(16).padStart(6, '0')}` }}
                      />
                      <span className="text-white text-sm">{c.nome}</span>
                    </div>
                  ))}
                {cargos.length === 0 && (
                  <p className="text-[#B5BAC1] text-sm">Nenhum cargo encontrado.</p>
                )}
              </div>
            )}
          </div>
        )}

        {aba === 'nickname' && (
          <form onSubmit={alterarNickname} className="space-y-4 max-w-lg">
            <h3 className="text-white font-medium">Alterar Nome no Servidor</h3>
            <input
              type="text"
              value={novoNick}
              onChange={(e) => setNovoNick(e.target.value)}
              placeholder="Deixe vazio para remover o apelido..."
              maxLength={32}
              className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Salvar Nome
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
