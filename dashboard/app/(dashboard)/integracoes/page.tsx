'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Youtube, Twitch, Music2, Camera, 
  Plug, Check, Trash2, Settings, X, 
  Globe, MessageSquare, Search, Zap,
  Users, Video, Eye, Send, Plus, Star,
  Server, Hash, Play, ShoppingBag, DollarSign, TrendingUp,
  Activity, AlertTriangle
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface Integracao {
  id: number;
  plataforma: 'youtube' | 'twitch' | 'tiktok' | 'instagram' | 'shopee';
  accessToken: string | null;
  nomeConta: string | null;
  avatarUrl: string | null;
  contaId: string | null;
  ativo: boolean;
  webhookUrl: string | null;
  mensagemTemplate: string;
  metadata: string | null;
}

interface Preset {
  nome: string;
  template: string;
}

interface ServidorInfo { id: string; nome: string; icone: string | null; }
interface CanalInfo { id: string; nome: string; }

interface StatusPlataformaItem {
  plataforma: string;
  status: 'online' | 'error' | 'offline' | 'unknown';
  nome: string | null;
  mensagem?: string;
}

interface StatusIntegracoes {
  timestamp: number;
  servico: 'online' | 'deploying';
  geral: { total: number; online: number; error: number; offline: number; status: 'tudo certo' | 'erro' | 'parcial' | 'sem integracoes' | 'erro interno' };
  redesSociais: { total: number; online: number; error: number; offline: number };
  afiliados: { total: number; online: number; error: number; offline: number };
  plataformas: StatusPlataformaItem[];
}

const PRESETS_PADRAO: Record<string, Preset[]> = {
  youtube: [
    { nome: '🎬 Video Novo', template: '🔥 **VIDEO NOVO NO CANAL!** 🔥\n\n📺 **{titulo}**\n🔗 {url}\n\n👊 Deixa o like, comenta e compartilha!\n📢 {autor}' },
    { nome: '📱 Shorts', template: '⚡ **SHORT NOVO!** ⚡\n\n📱 **{titulo}**\n🔗 {url}\n\n💬 O que achou? Comenta ai!\n📢 {autor}' },
    { nome: '🔴 Ao Vivo', template: '🔴 **ESTAMOS AO VIVO!** 🔴\n\n🎮 **{titulo}**\n🔗 {url}\n\n👋 Cola com a gente! Nao vai perder ne?\n📢 {autor}' },
  ],
  twitch: [
    { nome: '🎮 Live On', template: '🟣 **LIVE ON!** 🟣\n\n🎮 **{titulo}**\n🎯 Jogando: **{jogo}**\n🔗 {url}\n\n👋 Bora la trocar ideia com a galera!\n📢 {autor}' },
    { nome: '💜 Stream', template: '💜 **STREAM INICIANDO!** 💜\n\n📺 **{titulo}**\n🎯 **{jogo}**\n🔗 {url}\n\n🔥 Vem com a gente! Ta demais!\n📢 {autor}' },
  ],
  tiktok: [
    { nome: '🎵 TikTok', template: '🎵 **NOVO VIDEO NO TIKTOK!** 🎵\n\n📱 **{titulo}**\n🔗 {url}\n\n❤️ Curte e compartilha com a rapaziada!\n📢 {autor}' },
    { nome: '🔥 Viral', template: '🔥 **SAIU MAIS UM!** 🔥\n\n📱 **{titulo}**\n🔗 {url}\n\n⚡ Confere la e me diz o que achou!\n📢 {autor}' },
  ],
  instagram: [
    { nome: '📸 Post Novo', template: '📸 **NOVO POST NO INSTA!** 📸\n\n✨ **{titulo}**\n🔗 {url}\n\n❤️ Deixa o like la e compartilha!\n📢 {autor}' },
    { nome: '📖 Stories', template: '📖 **NOVOS STORIES!** 📖\n\n👀 Corre pra ver antes que suma!\n🔗 {url}\n\n📢 {autor}' },
  ],
  shopee: [
    { nome: '🛒 Oferta Relâmpago', template: '⚡ **OFERTA IMPERDÍVEL NA SHOPEE!** ⚡\n\n🛍️ **{titulo}**\n💰 De: ~~R$ {preco_original}~~ Por: **R$ {preco_final}**\n🔗 {url}\n\n🔥 Corre que é por tempo limitado!\n📢 {autor}' },
    { nome: '🏷️ Produto em Destaque', template: '🏷️ **ACHAMOS ESSA PROMOÇÃO PRA VOCÊ!** 🏷️\n\n📦 **{titulo}**\n💵 Apenas **R$ {preco_final}**\n⭐ {avaliacao} estrelas\n🔗 {url}\n\n🛒 Garanta o seu antes que acabe!\n📢 {autor}' },
    { nome: '📢 Promoção do Dia', template: '📢 **PROMOÇÃO DO DIA NA SHOPEE!** 📢\n\n🛍️ **{titulo}**\n💲 De R$ {preco_original} por **R$ {preco_final}**\n📊 {vendas} vendidos\n🔗 {url}\n\n👇 Clique e confira!\n📢 {autor}' },
  ],
};

const PLATAFORMAS = [
  { id: 'youtube' as const, nome: 'YouTube', icone: Youtube, cor: '#FF0000', descricao: 'Videos, shorts e lives' },
  { id: 'twitch' as const, nome: 'Twitch', icone: Twitch, cor: '#9146FF', descricao: 'Lives e streams' },
  { id: 'tiktok' as const, nome: 'TikTok', icone: Music2, cor: '#FF0050', descricao: 'Videos curtos' },
  { id: 'instagram' as const, nome: 'Instagram', icone: Camera, cor: '#E4405F', descricao: 'Posts, stories e reels' },
];

const PLATAFORMAS_AFILIADOS = [
  { id: 'shopee' as const, nome: 'Shopee', icone: ShoppingBag, cor: '#EE4D2D', descricao: 'API de Afiliados (GraphQL)' },
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
  const [campoAppId, setCampoAppId] = useState('');
  const [campoSenha, setCampoSenha] = useState('');

  // Config tabs
  const [abaConfig, setAbaConfig] = useState<'conteudo' | 'teste'>('conteudo');

  // Presets
  const [novoPresetNome, setNovoPresetNome] = useState('');
  const [novoPresetTemplate, setNovoPresetTemplate] = useState('');
  const [mostrarAddPreset, setMostrarAddPreset] = useState(false);

  // Teste
  const [servidores, setServidores] = useState<ServidorInfo[]>([]);
  const [canais, setCanais] = useState<CanalInfo[]>([]);
  const [servidorTeste, setServidorTeste] = useState('');
  const [canalTeste, setCanalTeste] = useState('');
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [liveStatus, setLiveStatus] = useState<Record<string, { aoVivo: boolean; titulo?: string; url?: string; espectadores?: number; jogo?: string }>>({});
  const [statusGeral, setStatusGeral] = useState<StatusIntegracoes | null>(null);

  const carregarStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/integracoes/status');
      if (r.ok) {
        const data = await r.json();
        setStatusGeral(data);
      }
    } catch {}
  }, []);

  useEffect(() => { carregarIntegracoes(); carregarStatus(); }, []);

  useEffect(() => {
    const plataformasLive = ['youtube', 'twitch'];
    integracoes.forEach(async (i) => {
      if (plataformasLive.includes(i.plataforma) && i.contaId) {
        try {
          const r = await fetch(`/api/integracoes/live?plataforma=${i.plataforma}`);
          if (r.ok) {
            const data = await r.json();
            setLiveStatus(prev => ({ ...prev, [i.plataforma]: data }));
          }
        } catch {}
      }
    });
  }, [integracoes]);

  useEffect(() => {
    const interval = setInterval(() => {
      carregarStatus();
      carregarIntegracoes();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchParams.get('sucesso')) { setStatusMsg({ tipo: 'sucesso', texto: 'Conectado!' }); carregarIntegracoes(); }
    if (searchParams.get('erro')) {
      const msgs: Record<string, string> = { token:'Erro auth', user:'Erro dados', save:'Erro salvar', config:'Credenciais faltando', desconhecido:'Erro' };
      setStatusMsg({ tipo: 'erro', texto: msgs[searchParams.get('erro')||'']||'Erro' });
    }
  }, [searchParams]);

  async function carregarIntegracoes() {
    try { const r = await fetch('/api/integracoes'); if (r.ok) setIntegracoes(await r.json()); }
    catch(e){} finally { setCarregando(false); }
  }

  function obterIntegracao(p: string) { return integracoes.find(i => i.plataforma === p); }
  function obterStatusPlataforma(p: string): StatusPlataformaItem | undefined { return statusGeral?.plataformas?.find(s => s.plataforma === p); }
  function corStatus(s: string) { return s === 'online' ? '#2ECC71' : s === 'error' ? '#E74C3C' : s === 'offline' ? '#72767D' : '#F1C40F'; }
  function labelStatus(s: string) { return s === 'online' ? 'Online' : s === 'error' ? 'Erro' : s === 'offline' ? 'Offline' : 'Desconhecido'; }

  async function conectar(plataforma: string) {
    if (plataforma === 'youtube' || plataforma === 'twitch') {
      window.location.href = `/api/oauth/login?plataforma=${plataforma}`;
      return;
    }
    setModalConectar(plataforma); setCampoUsername(''); setCampoAppId(''); setCampoSenha('');
  }

  async function confirmarConexaoManual() {
    if (!modalConectar) return;
    if (modalConectar === 'shopee') {
      if (!campoAppId.trim() || !campoSenha.trim()) return;
      setConectando(true);
      try {
        const r = await fetch('/api/integracoes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plataforma: 'shopee', nomeConta: `Shopee (${campoAppId.trim()})`, contaId: campoAppId.trim(), accessToken: campoSenha.trim() }) });
        if (r.ok) { await carregarIntegracoes(); setModalConectar(null); }
        else { const d = await r.json(); setStatusMsg({ tipo:'erro', texto: d.erro||'Erro' }); }
      } catch { setStatusMsg({ tipo:'erro', texto: 'Erro' }); }
      finally { setConectando(false); }
      return;
    }
    if (!campoUsername.trim()) return;
    setConectando(true);
    try {
      const r = await fetch('/api/integracoes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plataforma: modalConectar, nomeConta: campoUsername.trim() }) });
      if (r.ok) { await carregarIntegracoes(); setModalConectar(null); }
      else { const d = await r.json(); setStatusMsg({ tipo:'erro', texto: d.erro||'Erro' }); }
    } catch { setStatusMsg({ tipo:'erro', texto: 'Erro' }); }
    finally { setConectando(false); }
  }

  async function desconectar(id: number) {
    if (!confirm('Remover?')) return;
    await fetch(`/api/integracoes?id=${id}`, { method:'DELETE' });
    setEditando(null); await carregarIntegracoes();
  }

  async function toggleAtivo(i: Integracao) {
    await fetch('/api/integracoes', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: i.id, ativo: !i.ativo }) });
    await carregarIntegracoes();
  }

  function abrirConfig(integracao: Integracao) {
    setEditando(integracao);
    setAbaConfig('conteudo');
    setMostrarAddPreset(false);
    setResultadoTeste(null);
    setServidorTeste(''); setCanalTeste(''); setServidores([]); setCanais([]);
  }

  function getMeta() { if (!editando || !editando.metadata) return {}; try { return JSON.parse(editando.metadata); } catch { return {}; } }
  function getPresets(): Preset[] { const m = getMeta(); return m.presets || PRESETS_PADRAO[editando?.plataforma || ''] || []; }
  function getPresetSelecionado(): string { const m = getMeta(); return m.presetSelecionado || getPresets()[0]?.nome || ''; }

  function atualizarMeta(chave: string, valor: unknown) {
    if (!editando) return;
    const meta = getMeta();
    meta[chave] = valor;
    setEditando({ ...editando, metadata: JSON.stringify(meta) });
  }

  function selecionarPreset(nome: string) { atualizarMeta('presetSelecionado', nome); }

  function adicionarPreset() {
    if (!novoPresetNome.trim() || !novoPresetTemplate.trim()) return;
    const presets = [...getPresets(), { nome: novoPresetNome.trim(), template: novoPresetTemplate.trim() }];
    atualizarMeta('presets', presets);
    atualizarMeta('presetSelecionado', novoPresetNome.trim());
    setNovoPresetNome(''); setNovoPresetTemplate(''); setMostrarAddPreset(false);
  }

  function removerPreset(nome: string) {
    const presets = getPresets().filter(p => p.nome !== nome);
    atualizarMeta('presets', presets);
    if (getPresetSelecionado() === nome && presets.length > 0) atualizarMeta('presetSelecionado', presets[0].nome);
  }

  async function carregarServidores() {
    try { const r = await fetch('/api/servidores'); if (r.ok) setServidores(await r.json()); } catch {}
  }

  async function carregarCanais(serverId: string) {
    setServidorTeste(serverId); setCanalTeste(''); setCanais([]);
    if (!serverId) return;
    try { const r = await fetch(`/api/servidores/${serverId}/canais`); if (r.ok) setCanais(await r.json()); } catch {}
  }

  async function enviarTeste() {
    if (!canalTeste) return;
    const preset = getPresets().find(p => p.nome === getPresetSelecionado());
    const template = preset?.template || editando?.mensagemTemplate || 'Teste {plataforma}';
    
    const msg = template
      .replace(/{titulo}/g, '🎯 Titulo de Exemplo')
      .replace(/{url}/g, 'https://exemplo.com/conteudo')
      .replace(/{autor}/g, editando?.nomeConta || 'Canal')
      .replace(/{jogo}/g, '🎮 Jogo Exemplo')
      .replace(/{plataforma}/g, editando?.plataforma || 'Plataforma')
      .replace(/{preco_original}/g, 'R$ 99,90')
      .replace(/{preco_final}/g, 'R$ 49,90')
      .replace(/{avaliacao}/g, '4.8')
      .replace(/{vendas}/g, '1.2k');

    setEnviandoTeste(true); setResultadoTeste(null);
    try {
      const r = await fetch('/api/integracoes/teste', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canalId: canalTeste, mensagem: msg }),
      });
      if (r.ok) setResultadoTeste({ tipo: 'sucesso', texto: 'Mensagem de teste enviada!' });
      else { const d = await r.json(); setResultadoTeste({ tipo: 'erro', texto: d.erro || 'Erro' }); }
    } catch { setResultadoTeste({ tipo: 'erro', texto: 'Erro ao enviar' }); }
    finally { setEnviandoTeste(false); }
  }

  async function salvarConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    try {
      const body: Record<string, unknown> = { id: editando.id, metadata: editando.metadata, mensagemTemplate: editando.mensagemTemplate };
      if (editando.plataforma === 'tiktok' || editando.plataforma === 'instagram') body.webhookUrl = editando.webhookUrl;
      await fetch('/api/integracoes', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      await carregarIntegracoes();
      setEditando(null);
    } catch {}
  }

  function atualizarToggle(chave: string, valor: boolean) { atualizarMeta(chave, valor); }

  async function exportarIntegracoes() {
    const data = JSON.stringify(integracoes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integracoes-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importarIntegracoes(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Formato invalido');
      for (const item of data) {
        await fetch('/api/integracoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      }
      await carregarIntegracoes();
      setStatusMsg({ tipo: 'sucesso', texto: `${data.length} integracoes importadas!` });
    } catch {
      setStatusMsg({ tipo: 'erro', texto: 'Arquivo invalido' });
    }
    e.target.value = '';
  }

  if (carregando) return <div className="space-y-6"><h1 className="text-2xl font-bold text-white">Integracoes</h1><div className="animate-pulse text-[#B5BAC1]">Carregando...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Integracoes</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportarIntegracoes} disabled={integracoes.length===0} className="text-xs bg-[#313338] hover:bg-[#3F4147] disabled:opacity-40 text-[#B5BAC1] px-3 py-1.5 rounded flex items-center gap-1 transition-colors">Exportar Backup</button>
          <label className="text-xs bg-[#313338] hover:bg-[#3F4147] text-[#B5BAC1] px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer transition-colors">Importar Backup
            <input type="file" accept=".json" onChange={importarIntegracoes} className="hidden"/>
          </label>
        </div>
      </div>

      {statusMsg && (
        <div className={`px-4 py-3 rounded-md text-sm flex items-center justify-between ${statusMsg.tipo==='sucesso'?'bg-green-500/10 border border-green-500/30 text-green-400':'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {statusMsg.texto} <button onClick={()=>setStatusMsg(null)} className="ml-2 hover:underline">X</button>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-4"><Globe className="w-5 h-5 text-[#5865F2]" /><h2 className="text-lg font-semibold text-white">Redes Sociais</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLATAFORMAS.map(plat => {
            const integracao = obterIntegracao(plat.id); const Icon = plat.icone; const conectado = !!integracao;
            let meta: Record<string,unknown> = {}; if (integracao?.metadata) try { meta=JSON.parse(integracao.metadata); } catch {}
            return (
              <div key={plat.id} className={`bg-[#2B2D31] border rounded-lg p-5 transition-colors ${conectado?'border-l-4 shadow-lg':'border-[#1E1F22] hover:border-[#3F4147]'}`} style={conectado?{borderLeftColor:plat.cor}:{}}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor:`${plat.cor}20`}}><Icon className="w-6 h-6" style={{color:plat.cor}}/></div>
                    <div><h3 className="text-white font-semibold">{plat.nome}</h3><p className="text-xs text-[#B5BAC1]">{plat.descricao}</p></div>
                  </div>
                  {conectado && <label className="relative inline-flex items-center cursor-pointer flex-shrink-0"><input type="checkbox" checked={integracao.ativo} onChange={()=>toggleAtivo(integracao)} className="sr-only peer"/><div className="w-9 h-5 bg-[#3F4147] rounded-full peer-checked:bg-[#5865F2] relative"><div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${integracao.ativo?'left-[18px]':'left-[2px]'}`}/></div></label>}
                </div>
                {conectado ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-[#1E1F22] rounded-lg p-3">
                      {integracao.avatarUrl ? <img src={integracao.avatarUrl} className="w-10 h-10 rounded-full"/> : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{backgroundColor:plat.cor}}>{(integracao.nomeConta||plat.nome)[0]?.toUpperCase()}</div>}
                      <div className="flex-1 min-w-0"><p className="text-white font-medium text-sm truncate">{integracao.nomeConta||'Conectado'}</p>{(()=>{const s=obterStatusPlataforma(plat.id);const c=s?corStatus(s.status):'#2ECC71';const l=s?labelStatus(s.status):'Conectado';const Ico=s?.status==='online'?Check:s?.status==='error'?AlertTriangle:Activity;return <p className="text-xs flex items-center gap-1" style={{color:c}}><Ico className="w-3 h-3"/>{l}{s?.mensagem&&<span className="text-[#72767D] ml-1">- {s.mensagem}</span>}</p>;})()}</div>
                    </div>
                    {['youtube', 'twitch'].includes(plat.id) && liveStatus[plat.id] && (
                      liveStatus[plat.id].aoVivo ? (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"/><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"/></span>
                          <span className="text-red-400 font-semibold text-xs">AO VIVO</span>
                          {liveStatus[plat.id].titulo && <span className="text-[#B5BAC1] text-xs truncate">{liveStatus[plat.id].titulo}</span>}
                        </div>
                      ) : (
                        <div className="text-xs text-[#72767D] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#72767D]"/> Offline</div>
                      )
                    )}
                    {Object.keys(meta).filter(k=>['inscritos','seguidores','videos','visualizacoes'].includes(k)).length>0 && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {(meta.inscritos!==undefined||meta.seguidores!==undefined) && <div className="col-span-2 bg-[#1E1F22] rounded p-2 text-center"><p className="text-[#72767D]">{meta.inscritos!==undefined?'Inscritos':'Seguidores'}</p><p className="text-white font-bold flex items-center justify-center gap-1"><Users className="w-3 h-3"/>{((meta.inscritos as number)||(meta.seguidores as number)||0).toLocaleString()}</p></div>}
                        {meta.videos!==undefined && <div className="bg-[#1E1F22] rounded p-2 text-center"><p className="text-[#72767D]">Videos</p><p className="text-white font-bold"><Video className="w-3 h-3 inline"/>{' '}{(meta.videos as number).toLocaleString()}</p></div>}
                        {meta.visualizacoes!==undefined && <div className="bg-[#1E1F22] rounded p-2 text-center"><p className="text-[#72767D]">Views</p><p className="text-white font-bold"><Eye className="w-3 h-3 inline"/>{' '}{(meta.visualizacoes as number).toLocaleString()}</p></div>}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={()=>abrirConfig(integracao)} className="flex items-center gap-1 text-xs text-[#B5BAC1] hover:text-white bg-[#1E1F22] hover:bg-[#313338] px-3 py-1.5 rounded transition-colors"><Settings className="w-3 h-3"/>Configurar</button>
                      <button onClick={()=>desconectar(integracao.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded transition-colors"><Trash2 className="w-3 h-3"/>Desconectar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>conectar(plat.id)} className="flex items-center gap-2 text-sm text-[#B5BAC1] hover:text-white bg-[#1E1F22] hover:bg-[#313338] px-3 py-2 rounded-md transition-colors w-full justify-center"><Plug className="w-4 h-4"/>Conectar {plat.nome}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4 mt-8"><DollarSign className="w-5 h-5 text-[#2ECC71]" /><h2 className="text-lg font-semibold text-white">Afiliados</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLATAFORMAS_AFILIADOS.map(plat => {
            const integracao = obterIntegracao(plat.id); const Icon = plat.icone; const conectado = !!integracao;
            let meta: Record<string,unknown> = {}; if (integracao?.metadata) try { meta=JSON.parse(integracao.metadata); } catch {}
            return (
              <div key={plat.id} className={`bg-[#2B2D31] border rounded-lg p-5 transition-colors ${conectado?'border-l-4 shadow-lg':'border-[#1E1F22] hover:border-[#3F4147]'}`} style={conectado?{borderLeftColor:plat.cor}:{}}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor:`${plat.cor}20`}}><Icon className="w-6 h-6" style={{color:plat.cor}}/></div>
                    <div><h3 className="text-white font-semibold">{plat.nome}</h3><p className="text-xs text-[#B5BAC1]">{plat.descricao}</p></div>
                  </div>
                  {conectado && <label className="relative inline-flex items-center cursor-pointer flex-shrink-0"><input type="checkbox" checked={integracao.ativo} onChange={()=>toggleAtivo(integracao)} className="sr-only peer"/><div className="w-9 h-5 bg-[#3F4147] rounded-full peer-checked:bg-[#5865F2] relative"><div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${integracao.ativo?'left-[18px]':'left-[2px]'}`}/></div></label>}
                </div>
                {conectado ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-[#1E1F22] rounded-lg p-3">
                      {integracao.avatarUrl ? <img src={integracao.avatarUrl} className="w-10 h-10 rounded-full"/> : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{backgroundColor:plat.cor}}>{(integracao.nomeConta||plat.nome)[0]?.toUpperCase()}</div>}
                      <div className="flex-1 min-w-0"><p className="text-white font-medium text-sm truncate">{integracao.nomeConta||'Conectado'}</p>{(()=>{const s=obterStatusPlataforma(plat.id);const c=s?corStatus(s.status):'#2ECC71';const l=s?labelStatus(s.status):'Conectado';const Ico=s?.status==='online'?Check:s?.status==='error'?AlertTriangle:Activity;return <p className="text-xs flex items-center gap-1" style={{color:c}}><Ico className="w-3 h-3"/>{l}{s?.mensagem&&<span className="text-[#72767D] ml-1">- {s.mensagem}</span>}</p>;})()}</div>
                    </div>
                    {Object.keys(meta).filter(k=>['vendas','cliques','comissao'].includes(k)).length>0 && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {(meta.vendas!==undefined||meta.cliques!==undefined) && (
                          <>
                            {meta.cliques!==undefined && <div className="bg-[#1E1F22] rounded p-2 text-center"><p className="text-[#72767D]">Cliques</p><p className="text-white font-bold flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3"/>{(meta.cliques as number).toLocaleString()}</p></div>}
                            {meta.vendas!==undefined && <div className="bg-[#1E1F22] rounded p-2 text-center"><p className="text-[#72767D]">Vendas</p><p className="text-white font-bold flex items-center justify-center gap-1"><ShoppingBag className="w-3 h-3"/>{(meta.vendas as number).toLocaleString()}</p></div>}
                          </>
                        )}
                        {meta.comissao!==undefined && <div className="col-span-2 bg-[#1E1F22] rounded p-2 text-center"><p className="text-[#72767D]">Comissao Total</p><p className="text-white font-bold flex items-center justify-center gap-1"><DollarSign className="w-3 h-3"/>R$ {((meta.comissao as number)||0).toFixed(2)}</p></div>}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={()=>abrirConfig(integracao)} className="flex items-center gap-1 text-xs text-[#B5BAC1] hover:text-white bg-[#1E1F22] hover:bg-[#313338] px-3 py-1.5 rounded transition-colors"><Settings className="w-3 h-3"/>Configurar</button>
                      <button onClick={()=>desconectar(integracao.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded transition-colors"><Trash2 className="w-3 h-3"/>Desconectar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={()=>conectar(plat.id)} className="flex items-center gap-2 text-sm text-[#B5BAC1] hover:text-white bg-[#1E1F22] hover:bg-[#313338] px-3 py-2 rounded-md transition-colors w-full justify-center"><Plug className="w-4 h-4"/>Conectar {plat.nome}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {modalConectar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2B2D31] border border-[#313338] rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-[#1E1F22]"><h3 className="text-white font-semibold">Conectar {modalConectar}</h3><button onClick={()=>setModalConectar(null)} className="text-[#B5BAC1] hover:text-white"><X className="w-5 h-5"/></button></div>
            <div className="p-4 space-y-4">
              {modalConectar === 'shopee' ? (
                <>
                  <div><label className="block text-xs text-[#B5BAC1] mb-1">App ID</label><input type="text" value={campoAppId} onChange={e=>setCampoAppId(e.target.value)} placeholder="18381900711" className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none" autoFocus/></div>
                  <div><label className="block text-xs text-[#B5BAC1] mb-1">Senha / Secret Key</label><input type="password" value={campoSenha} onChange={e=>setCampoSenha(e.target.value)} placeholder="••••••••••••••••" className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none" onKeyDown={e=>e.key==='Enter'&&confirmarConexaoManual()}/></div>
                </>
              ) : (
                <div><label className="block text-xs text-[#B5BAC1] mb-1">Nome de usuario ou URL</label><input type="text" value={campoUsername} onChange={e=>setCampoUsername(e.target.value)} placeholder="@usuario" className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none" autoFocus onKeyDown={e=>e.key==='Enter'&&confirmarConexaoManual()}/></div>
              )}
              <div className="flex gap-2"><button onClick={confirmarConexaoManual} disabled={conectando||(modalConectar==='shopee'?(!campoAppId.trim()||!campoSenha.trim()):!campoUsername.trim())} className="bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">{conectando?'...':<><Search className="w-4 h-4"/>Conectar</>}</button><button onClick={()=>setModalConectar(null)} className="text-[#B5BAC1] hover:text-white px-4 py-2 rounded-md text-sm">Cancelar</button></div>
            </div>
          </div>
        </div>
      )}

      {editando && (() => {
        const presets = getPresets();
        const presetSel = getPresetSelecionado();
        const presetAtual = presets.find(p=>p.nome===presetSel);
        const plataformaNome = PLATAFORMAS.find(p=>p.id===editando.plataforma)?.nome || PLATAFORMAS_AFILIADOS.find(p=>p.id===editando.plataforma)?.nome || '';

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#2B2D31] border border-[#313338] rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-[#1E1F22] sticky top-0 bg-[#2B2D31] z-10">
                <h3 className="text-white font-semibold flex items-center gap-2"><Settings className="w-4 h-4"/>Configurar {plataformaNome}</h3>
                <button onClick={()=>setEditando(null)} className="text-[#B5BAC1] hover:text-white"><X className="w-5 h-5"/></button>
              </div>

              <div className="flex border-b border-[#1E1F22]">
                {[{id:'conteudo' as const, label:'Conteudo', icon:Zap},{id:'teste' as const, label:'Teste', icon:Play}].map(tab=>{const Icon=tab.icon; return (
                  <button key={tab.id} onClick={()=>{setAbaConfig(tab.id);setResultadoTeste(null);if(tab.id==='teste')carregarServidores();}} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${abaConfig===tab.id?'border-b-2 text-white':'text-[#B5BAC1] hover:text-white'}`} style={abaConfig===tab.id?{borderBottomColor:'#5865F2'}:{}}><Icon className="w-4 h-4"/>{tab.label}</button>
                )})}
              </div>

              <form onSubmit={salvarConfig} className="p-4 space-y-4">
                {abaConfig === 'conteudo' && (
                  <>
                    {(editando.plataforma==='youtube'||editando.plataforma==='twitch') && (
                      <div className="space-y-3">
                        <h4 className="text-white text-sm font-medium flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400"/>Tipos de Conteudo</h4>
                        {(editando.plataforma==='youtube' ? [
                          {key:'notificarVideos',label:'Videos Novos',desc:'Notificar videos novos'},
                          {key:'notificarShorts',label:'Shorts',desc:'Notificar shorts'},
                          {key:'notificarLives',label:'Lives',desc:'Notificar lives'},
                        ] : [
                          {key:'notificarLives',label:'Lives',desc:'Notificar ao entrar ao vivo'},
                        ]).map(op=>{const ativo=getMeta()[op.key]!==false; return (
                          <label key={op.key} className="flex items-center justify-between bg-[#1E1F22] rounded-lg p-3 cursor-pointer">
                            <div><p className="text-white text-sm">{op.label}</p><p className="text-xs text-[#72767D]">{op.desc}</p></div>
                            <div className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${ativo?'bg-[#5865F2]':'bg-[#3F4147]'}`} onClick={()=>atualizarToggle(op.key,!ativo)}><div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${ativo?'left-[18px]':'left-[2px]'}`}/></div>
                          </label>
                        )})}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white text-sm font-medium flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400"/>Presets de Mensagem</h4>
                        <button type="button" onClick={()=>setMostrarAddPreset(!mostrarAddPreset)} className="text-xs text-[#5865F2] hover:text-[#4752C4] flex items-center gap-1"><Plus className="w-3 h-3"/>Novo</button>
                      </div>

                      {mostrarAddPreset && (
                        <div className="bg-[#1E1F22] rounded-lg p-3 space-y-2">
                          <input type="text" value={novoPresetNome} onChange={e=>setNovoPresetNome(e.target.value)} placeholder="Nome do preset" className="w-full bg-[#2B2D31] border border-[#3F4147] rounded px-2 py-1.5 text-white text-sm focus:border-[#5865F2] focus:outline-none"/>
                          <textarea value={novoPresetTemplate} onChange={e=>setNovoPresetTemplate(e.target.value)} rows={3} placeholder="Template... Use {titulo}, {url}, {autor}" className="w-full bg-[#2B2D31] border border-[#3F4147] rounded px-2 py-1.5 text-white text-sm focus:border-[#5865F2] focus:outline-none resize-none font-mono"/>
                          <div className="flex gap-2"><button type="button" onClick={adicionarPreset} className="bg-[#5865F2] text-white px-3 py-1 rounded text-xs">Adicionar</button><button type="button" onClick={()=>setMostrarAddPreset(false)} className="text-[#B5BAC1] text-xs">Cancelar</button></div>
                        </div>
                      )}

                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {presets.map(p=>(
                          <div key={p.nome} className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${presetSel===p.nome?'bg-[#5865F2]/20 border border-[#5865F2]/30':'hover:bg-[#313338]'}`} onClick={()=>selecionarPreset(p.nome)}>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm">{p.nome}</p>
                              <p className="text-xs text-[#72767D] truncate">{p.template.substring(0,60)}...</p>
                            </div>
                            {presets.length > 1 && <button type="button" onClick={e=>{e.stopPropagation();removerPreset(p.nome);}} className="text-[#72767D] hover:text-red-400 ml-2"><X className="w-3 h-3"/></button>}
                          </div>
                        ))}
                      </div>

                      {presetAtual && (
                        <div className="bg-[#1E1F22] rounded-lg p-3">
                          <p className="text-xs text-[#72767D] mb-2">Preview:</p>
                          <div className="text-sm text-white whitespace-pre-wrap font-mono bg-[#0F0F11] rounded p-2 text-xs leading-relaxed">
                            {presetAtual.template.replace(/{titulo}/g,'🎯 Titulo Exemplo').replace(/{url}/g,'https://exemplo.com').replace(/{autor}/g,'Canal').replace(/{jogo}/g,'🎮 Jogo').replace(/{plataforma}/g,plataformaNome).replace(/{preco_original}/g,'R$ 99,90').replace(/{preco_final}/g,'R$ 49,90').replace(/{avaliacao}/g,'4.8').replace(/{vendas}/g,'1.2k')}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {abaConfig === 'teste' && (
                  <div className="space-y-4">
                    <h4 className="text-white text-sm font-medium flex items-center gap-2"><Play className="w-4 h-4 text-green-400"/>Enviar Teste</h4>

                    <div>
                      <label className="block text-xs text-[#B5BAC1] mb-1 flex items-center gap-1"><Server className="w-3 h-3"/>Servidor</label>
                      <select value={servidorTeste} onChange={e=>carregarCanais(e.target.value)} className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none">
                        <option value="">Selecione...</option>
                        {servidores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </div>

                    {canais.length > 0 && (
                      <div>
                        <label className="block text-xs text-[#B5BAC1] mb-1 flex items-center gap-1"><Hash className="w-3 h-3"/>Canal</label>
                        <select value={canalTeste} onChange={e=>setCanalTeste(e.target.value)} className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none">
                          <option value="">Selecione...</option>
                          {canais.map(c=><option key={c.id} value={c.id}># {c.nome}</option>)}
                        </select>
                      </div>
                    )}

                    {resultadoTeste && (
                      <div className={`px-3 py-2 rounded text-xs ${resultadoTeste.tipo==='sucesso'?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{resultadoTeste.texto}</div>
                    )}

                    <button type="button" onClick={enviarTeste} disabled={!canalTeste||enviandoTeste} className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                      {enviandoTeste?'Enviando...':<><Send className="w-4 h-4"/>Enviar Teste</>}
                    </button>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-[#1E1F22]">
                  <button type="submit" className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">Salvar</button>
                  <button type="button" onClick={()=>setEditando(null)} className="text-[#B5BAC1] hover:text-white px-4 py-2 rounded-md text-sm">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function PaginaIntegracoes() {
  return <Suspense fallback={<div className="animate-pulse text-[#B5BAC1] p-6">Carregando...</div>}><IntegracoesContent /></Suspense>;
}
