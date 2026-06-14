'use client';

import { useState, useEffect } from 'react';
import { X, LogOut, Shield, MessageSquare, User, ChevronLeft } from 'lucide-react';

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
  const [aba, setAba] = useState<'acoes' | 'canais' | 'cargos' | 'nickname'>('acoes');
  const [canais, setCanais] = useState<Canal[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [canalSelecionado, setCanalSelecionado] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [novoNick, setNovoNick] = useState('');
  const [mensagemStatus, setMensagemStatus] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [carregandoDados, setCarregandoDados] = useState(false);

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

  function mudarAba(nova: 'acoes' | 'canais' | 'cargos' | 'nickname') {
    setAba(nova);
    setMensagemStatus(null);
    if (nova === 'canais' && canais.length === 0) carregarCanais();
    if (nova === 'cargos' && cargos.length === 0) carregarCargos();
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

      <div className="flex gap-2">
        {[
          { id: 'acoes' as const, label: 'Acoes', icon: LogOut },
          { id: 'canais' as const, label: 'Enviar Mensagem', icon: MessageSquare },
          { id: 'cargos' as const, label: 'Cargos', icon: Shield },
          { id: 'nickname' as const, label: 'Alterar Nome', icon: User },
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

      <div className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-6 max-w-lg">
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
          <form onSubmit={enviarMensagem} className="space-y-4">
            <h3 className="text-white font-medium">Enviar Mensagem de Teste</h3>

            {carregandoDados ? (
              <div className="animate-pulse text-[#B5BAC1] text-sm">Carregando canais...</div>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-[#B5BAC1] mb-1">Canal</label>
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
                </div>

                <div>
                  <label className="block text-xs text-[#B5BAC1] mb-1">Mensagem</label>
                  <textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    rows={3}
                    placeholder="Digite a mensagem de teste..."
                    className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none resize-none"
                    required
                  />
                </div>

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
          <div className="space-y-4">
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
          <form onSubmit={alterarNickname} className="space-y-4">
            <h3 className="text-white font-medium">Alterar Nome no Servidor</h3>
            <div>
              <label className="block text-xs text-[#B5BAC1] mb-1">Novo nome</label>
              <input
                type="text"
                value={novoNick}
                onChange={(e) => setNovoNick(e.target.value)}
                placeholder="Deixe vazio para remover o apelido..."
                maxLength={32}
                className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none"
              />
            </div>
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
