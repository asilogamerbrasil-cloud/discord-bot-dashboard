'use client';

import { useState, useEffect } from 'react';

interface Configuracao {
  id: number;
  nomeBot: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string;
  status: string;
  atividade: string;
}

export default function PaginaConfiguracoes() {
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    carregarConfig();
  }, []);

  async function carregarConfig() {
    try {
      const resposta = await fetch('/api/config');
      if (resposta.ok) {
        const dados = await resposta.json();
        setConfig(dados);
      }
    } catch (erro) {
      console.error('Erro ao carregar:', erro);
    } finally {
      setCarregando(false);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;

    setSalvando(true);
    setMensagem(null);

    try {
      const resposta = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeBot: config.nomeBot,
          avatarUrl: config.avatarUrl || null,
          bannerUrl: config.bannerUrl || null,
          bio: config.bio,
          status: config.status,
          atividade: config.atividade,
        }),
      });

      if (resposta.ok) {
        const atualizada = await resposta.json();
        setConfig(atualizada);
        setMensagem({ tipo: 'sucesso', texto: 'Configuracao salva com sucesso!' });
      } else {
        const erro = await resposta.json();
        setMensagem({ tipo: 'erro', texto: erro.erro || 'Erro ao salvar' });
      }
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexao' });
    } finally {
      setSalvando(false);
      setTimeout(() => setMensagem(null), 3000);
    }
  }

  if (carregando) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Configuracoes Gerais</h1>
        <div className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-8 text-center">
          <div className="animate-pulse text-[#B5BAC1]">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Configuracoes Gerais</h1>

      {mensagem && (
        <div
          className={`px-4 py-3 rounded-md text-sm ${
            mensagem.tipo === 'sucesso'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <form onSubmit={salvar} className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-6 space-y-6 max-w-2xl">
        <div className="flex items-start gap-4 pb-6 border-b border-[#1E1F22]">
          {config?.avatarUrl ? (
            <img
              src={config.avatarUrl}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-[#5865F2]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#5865F2] flex items-center justify-center text-2xl text-white font-bold">
              {(config?.nomeBot || 'B')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h3 className="text-white font-semibold">{config?.nomeBot || 'Meu Bot'}</h3>
            <p className="text-xs text-[#B5BAC1]">Preview do avatar</p>
          </div>
        </div>

        <CampoConfig label="Nome do Bot" descricao="Nome que aparece no Discord (2-32 caracteres)">
          <input
            type="text"
            value={config?.nomeBot || ''}
            onChange={(e) => setConfig((c) => (c ? { ...c, nomeBot: e.target.value } : c))}
            minLength={2}
            maxLength={32}
            className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none transition-colors"
          />
        </CampoConfig>

        <CampoConfig label="Avatar URL" descricao="URL da imagem do avatar (deve ser PNG, JPG ou GIF)">
          <input
            type="url"
            value={config?.avatarUrl || ''}
            onChange={(e) => setConfig((c) => (c ? { ...c, avatarUrl: e.target.value || null } : c))}
            placeholder="https://exemplo.com/avatar.png"
            className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none transition-colors"
          />
        </CampoConfig>

        <CampoConfig label="Banner URL" descricao="URL da imagem do banner do perfil">
          <input
            type="url"
            value={config?.bannerUrl || ''}
            onChange={(e) => setConfig((c) => (c ? { ...c, bannerUrl: e.target.value || null } : c))}
            placeholder="https://exemplo.com/banner.png"
            className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none transition-colors"
          />
        </CampoConfig>

        <CampoConfig label="Bio" descricao="Descricao que aparece no perfil do bot (max 190 caracteres)">
          <textarea
            rows={3}
            value={config?.bio || ''}
            onChange={(e) => setConfig((c) => (c ? { ...c, bio: e.target.value } : c))}
            maxLength={190}
            className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none resize-none transition-colors"
          />
          <p className="text-xs text-[#B5BAC1] mt-1">
            {(config?.bio || '').length}/190
          </p>
        </CampoConfig>

        <CampoConfig label="Status" descricao="Status de presenca do bot">
          <select
            value={config?.status || 'online'}
            onChange={(e) => setConfig((c) => (c ? { ...c, status: e.target.value } : c))}
            className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none transition-colors"
          >
            <option value="online">Online 🟢</option>
            <option value="idle">Ausente 🟡</option>
            <option value="dnd">Nao Perturbe 🔴</option>
            <option value="invisible">Invisivel ⚫</option>
          </select>
        </CampoConfig>

        <CampoConfig label="Atividade" descricao='Mensagem de status ("Jogando...", "Assistindo..."). Use {servidores} para mostrar o numero de servidores'>
          <input
            type="text"
            value={config?.atividade || ''}
            onChange={(e) => setConfig((c) => (c ? { ...c, atividade: e.target.value } : c))}
            maxLength={128}
            className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none transition-colors"
          />
        </CampoConfig>

        <div className="pt-4 border-t border-[#1E1F22] flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {salvando ? 'Salvando...' : 'Salvar Alteracoes'}
          </button>
          <button
            type="button"
            onClick={carregarConfig}
            className="text-[#B5BAC1] hover:text-white text-sm transition-colors"
          >
            Desfazer
          </button>
        </div>
      </form>
    </div>
  );
}

function CampoConfig({
  label,
  descricao,
  children,
}: {
  label: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-1">{label}</label>
      <p className="text-xs text-[#B5BAC1] mb-2">{descricao}</p>
      {children}
    </div>
  );
}
