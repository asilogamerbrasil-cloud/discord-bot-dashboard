'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Shield, Trash2, Crown, Plus } from 'lucide-react';

interface Admin {
  id: number;
  discordId: string;
  nome: string;
  avatarUrl: string | null;
  role: 'owner' | 'admin';
  adicionadoEm: string;
}

export default function PaginaAdmins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [discordId, setDiscordId] = useState('');
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregarAdmins();
  }, []);

  async function carregarAdmins() {
    try {
      const resposta = await fetch('/api/admins');
      if (resposta.ok) {
        setAdmins(await resposta.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  }

  async function adicionarAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro('');

    try {
      const resposta = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId, nome }),
      });

      if (resposta.ok) {
        await carregarAdmins();
        setDiscordId('');
        setNome('');
        setMostrarForm(false);
      } else {
        const data = await resposta.json();
        setErro(data.erro || 'Erro ao adicionar');
      }
    } catch (e) {
      setErro('Erro de conexao');
    } finally {
      setSalvando(false);
    }
  }

  async function removerAdmin(id: number) {
    if (!confirm('Tem certeza que deseja remover este administrador?')) return;

    try {
      const resposta = await fetch(`/api/admins?id=${id}`, { method: 'DELETE' });
      if (resposta.ok) {
        await carregarAdmins();
      } else {
        const data = await resposta.json();
        alert(data.erro);
      }
    } catch (e) {
      alert('Erro ao remover');
    }
  }

  const isOwner = admins.find(
    (a) => a.discordId === user?.id
  )?.role === 'owner';

  if (carregando) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Administradores</h1>
        <div className="animate-pulse text-[#B5BAC1]">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Administradores</h1>
        {isOwner && (
          <button
            onClick={() => setMostrarForm(!mostrarForm)}
            className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Admin
          </button>
        )}
      </div>

      {mostrarForm && (
        <form onSubmit={adicionarAdmin} className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-6 space-y-4 max-w-md">
          <h3 className="text-white font-medium">Adicionar Administrador</h3>

          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-md">
              {erro}
            </div>
          )}

          <div>
            <label className="block text-xs text-[#B5BAC1] mb-1">Discord ID</label>
            <input
              type="text"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              placeholder="Ex: 1515429281126289638"
              className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none"
              required
            />
            <p className="text-xs text-[#B5BAC1] mt-1">
              Ative o Modo Desenvolvedor no Discord para copiar IDs
            </p>
          </div>

          <div>
            <label className="block text-xs text-[#B5BAC1] mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do usuario"
              className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {salvando ? 'Adicionando...' : 'Adicionar'}
            </button>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="text-[#B5BAC1] hover:text-white px-4 py-2 rounded-md text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg">
        <div className="divide-y divide-[#1E1F22]">
          {admins.map((admin) => (
            <div key={admin.id} className="flex items-center gap-4 p-4">
              {admin.avatarUrl ? (
                <img src={admin.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-sm font-bold text-white">
                  {admin.nome[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{admin.nome}</span>
                  {admin.role === 'owner' && (
                    <span className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" />
                      Owner
                    </span>
                  )}
                  {admin.role === 'admin' && (
                    <span className="flex items-center gap-1 text-xs bg-[#5865F2]/10 text-[#5865F2] px-2 py-0.5 rounded-full">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#B5BAC1]">ID: {admin.discordId}</p>
              </div>
              {isOwner && admin.role !== 'owner' && (
                <button
                  onClick={() => removerAdmin(admin.id)}
                  className="text-[#B5BAC1] hover:text-red-400 transition-colors p-2"
                  title="Remover admin"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {admins.length === 0 && (
            <div className="p-8 text-center text-[#B5BAC1] text-sm">
              Nenhum administrador cadastrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
