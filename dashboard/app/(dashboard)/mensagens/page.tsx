'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Settings, X, Send, Clock,
  MessageSquare, Server, Hash, Zap, ShoppingBag,
  Bold, Italic, Underline, Strikethrough, Code,
  Quote, EyeOff, Link, Smile, Type, List,
  Image, Edit3, Play, Pause, Copy, Eye, Check
} from 'lucide-react';

interface ServidorCanal {
  servidorId: string; servidorNome: string; canalId: string; canalNome: string;
}

interface MensagemProgramada {
  id: number; nome: string; tipo: 'manual' | 'shopee_preset';
  mensagem: string; timerIntervalo: number; servidoresCanais: string | null;
  shopeePreset: string | null; shopeeConfig: string | null;
  ultimoEnvio: string | null; ativo: boolean; criadoEm: string; atualizadoEm: string;
}

interface ServidorInfo { id: string; nome: string; icone: string | null; }
interface CanalInfo { id: string; nome: string; }

interface ShopeeConfig {
  modoRotacao: 'fixo' | 'sequencial' | 'randomico';
  presetsSelecionados: string[];
  qtdProdutos: number;
  ordenacao: string;
  cta: string;
}

const TIMER_PRESETS = [
  { label: '30 min', valor: 1800 }, { label: '1 hora', valor: 3600 },
  { label: '2 horas', valor: 7200 }, { label: '4 horas', valor: 14400 },
  { label: '6 horas', valor: 21600 }, { label: '12 horas', valor: 43200 },
  { label: '24 horas', valor: 86400 }, { label: 'Personalizado', valor: -1 },
];

const SHOPEE_PRESETS_LIST: Array<{ key: string; nome: string; emoji: string; cor: string; desc: string }> = [
  { key: 'top5_monitores',       nome: 'Top 5 do Mes em Monitores',      emoji: '🏆', cor: '#F1C40F', desc: 'Monitores gamer, 144hz, 4K, ultrawide' },
  { key: 'promocoes_hardware',   nome: 'Promocoes em Hardware',          emoji: '🔥', cor: '#E74C3C', desc: 'Placas de video, processadores, memorias, SSDs' },
  { key: 'pcs_gamers_baratos',   nome: 'PCs Gamers Mais Baratos do Mes', emoji: '💻', cor: '#3498DB', desc: 'PCs e notebooks gamer com menor preco' },
  { key: 'mais_vendidos_games',  nome: 'Mais Vendidos em Games',         emoji: '🎮', cor: '#9B59B6', desc: 'Jogos, controles, cadeiras gamer mais vendidos' },
  { key: 'ofertas_relampago',    nome: 'Ofertas Relampago',              emoji: '⚡', cor: '#E67E22', desc: 'Promocoes, descontos e queima de estoque' },
  { key: 'perifericos_destaque', nome: 'Perifericos em Destaque',        emoji: '🖱️', cor: '#1ABC9C', desc: 'Mouses, headsets, teclados, microfones, webcams' },
  { key: 'achadinhos_dia',       nome: 'Achadinhos do Dia',              emoji: '📦', cor: '#2ECC71', desc: 'Promocoes, cupons, frete gratis, mais vendidos' },
];

const ORDENACOES = [
  { value: 'sales', label: 'Mais Vendidos' },
  { value: 'discount', label: 'Maior Desconto' },
  { value: 'price_asc', label: 'Menor Preco' },
  { value: 'commission', label: 'Maior Comissao' },
  { value: 'newest', label: 'Mais Recentes' },
];

const FORMAT_BUTTONS = [
  { label: 'Negrito', icon: Bold, wrap: '**', desc: '**texto**' },
  { label: 'Italico', icon: Italic, wrap: '*', desc: '*texto*' },
  { label: 'Sublinhado', icon: Underline, wrap: '__', desc: '__texto__' },
  { label: 'Riscado', icon: Strikethrough, wrap: '~~', desc: '~~texto~~' },
  { label: 'Codigo', icon: Code, wrap: '`', desc: '`codigo`' },
  { label: 'Spoiler', icon: EyeOff, wrap: '||', desc: '||spoiler||' },
  { label: 'Citacao', icon: Quote, wrap: '> ', desc: '> citacao', line: true },
  { label: 'Link', icon: Link, wrap: '[', suffix: '](url)', desc: '[texto](url)' },
];

export default function PaginaMensagens() {
  const [mensagens, setMensagens] = useState<MensagemProgramada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Partial<MensagemProgramada> | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [servidores, setServidores] = useState<ServidorInfo[]>([]);
  const [canaisSelecionados, setCanaisSelecionados] = useState<ServidorCanal[]>([]);
  const [servidorAtual, setServidorAtual] = useState('');
  const [canalAtual, setCanalAtual] = useState('');
  const [canaisServidor, setCanaisServidor] = useState<CanalInfo[]>([]);
  const [timerPersonalizado, setTimerPersonalizado] = useState('');
  const [timerHoras, setTimerHoras] = useState('1');

  const [shopeeConfig, setShopeeConfig] = useState<ShopeeConfig>({
    modoRotacao: 'fixo', presetsSelecionados: ['achadinhos_dia'],
    qtdProdutos: 4, ordenacao: 'discount', cta: 'Comprar Agora 🛒',
  });
  const [previewShow, setPreviewShow] = useState(false);

  useEffect(() => { carregarMensagens(); carregarServidores(); }, []);

  async function carregarMensagens() {
    try { const r = await fetch('/api/mensagens'); if (r.ok) setMensagens(await r.json()); } catch(e){} finally { setCarregando(false); }
  }
  async function carregarServidores() {
    try { const r = await fetch('/api/servidores'); if (r.ok) setServidores(await r.json()); } catch {}
  }
  async function carregarCanais(serverId: string) {
    setServidorAtual(serverId); setCanalAtual(''); setCanaisServidor([]);
    if (!serverId) return;
    try { const r = await fetch(`/api/servidores/${serverId}/canais`); if (r.ok) setCanaisServidor(await r.json()); } catch {}
  }

  function adicionarCanal() {
    if (!servidorAtual || !canalAtual) return;
    const servidor = servidores.find(s => s.id === servidorAtual);
    const canal = canaisServidor.find(c => c.id === canalAtual);
    if (!servidor || !canal) return;
    if (canaisSelecionados.find(c => c.canalId === canalAtual && c.servidorId === servidorAtual)) return;
    setCanaisSelecionados([...canaisSelecionados, { servidorId: servidorAtual, servidorNome: servidor.nome, canalId: canalAtual, canalNome: canal.nome }]);
    setServidorAtual(''); setCanalAtual(''); setCanaisServidor([]);
  }
  function removerCanal(idx: number) { setCanaisSelecionados(canaisSelecionados.filter((_, i) => i !== idx)); }

  function novaMensagem() {
    setEditando({ tipo: 'manual', mensagem: '', nome: 'Nova Mensagem', timerIntervalo: 3600 });
    setCanaisSelecionados([]); setTimerPersonalizado(''); setTimerHoras('1');
    setShopeeConfig({ modoRotacao: 'fixo', presetsSelecionados: ['achadinhos_dia'], qtdProdutos: 4, ordenacao: 'discount', cta: 'Comprar Agora 🛒' });
    setPreviewShow(false);
  }
  function editarMensagem(m: MensagemProgramada) {
    setEditando({ ...m });
    setCanaisSelecionados(m.servidoresCanais ? JSON.parse(m.servidoresCanais) : []);
    setTimerPersonalizado('');
    const preset = TIMER_PRESETS.find(t => t.valor === m.timerIntervalo);
    setTimerHoras(preset ? preset.label : String(Math.floor(m.timerIntervalo / 3600)));
    try { if (m.shopeeConfig) setShopeeConfig(JSON.parse(m.shopeeConfig)); } catch { setShopeeConfig({ modoRotacao: 'fixo', presetsSelecionados: [m.shopeePreset || 'achadinhos_dia'], qtdProdutos: 4, ordenacao: 'discount', cta: 'Comprar Agora 🛒' }); }
    setPreviewShow(false);
  }

  function inserirFormatacao(wrap: string, suffix?: string) {
    if (!editando) return;
    const textarea = document.getElementById('editor-mensagem') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart, end = textarea.selectionEnd;
    const selected = (editando.mensagem || '').substring(start, end);
    const antes = (editando.mensagem || '').substring(0, start), depois = (editando.mensagem || '').substring(end);
    setEditando({ ...editando, mensagem: `${antes}${wrap}${selected}${suffix || wrap}${depois}` });
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + wrap.length, end + wrap.length); }, 0);
  }

  function getTimerValor(): number {
    const preset = TIMER_PRESETS.find(t => t.label === timerHoras);
    if (preset && preset.valor > 0) return preset.valor;
    if (timerHoras === 'Personalizado' && timerPersonalizado) return parseInt(timerPersonalizado) * 60 || 60;
    return 3600;
  }

  function togglePreset(key: string) {
    const prev = shopeeConfig.presetsSelecionados;
    const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
    setShopeeConfig({ ...shopeeConfig, presetsSelecionados: next.length > 0 ? next : ['achadinhos_dia'] });
  }

  async function salvar() {
    if (!editando || canaisSelecionados.length === 0) return;
    const body: Record<string, unknown> = {
      nome: editando.nome || 'Nova Mensagem', tipo: editando.tipo || 'manual',
      mensagem: editando.mensagem || '', timerIntervalo: getTimerValor(),
      servidoresCanais: canaisSelecionados,
      shopeePreset: editando.tipo === 'shopee_preset' ? shopeeConfig.presetsSelecionados[0] : null,
      shopeeConfig: editando.tipo === 'shopee_preset' ? shopeeConfig : null,
    };
    try {
      const method = editando.id ? 'PATCH' : 'POST';
      const r = await fetch('/api/mensagens', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editando.id ? { ...body, id: editando.id } : body) });
      if (r.ok) { await carregarMensagens(); setEditando(null); setStatusMsg({ tipo: 'sucesso', texto: 'Salvo!' }); }
      else { const d = await r.json(); setStatusMsg({ tipo: 'erro', texto: d.erro || 'Erro' }); }
    } catch { setStatusMsg({ tipo: 'erro', texto: 'Erro ao salvar' }); }
  }

  async function alternarAtivo(m: MensagemProgramada) {
    await fetch('/api/mensagens', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, ativo: !m.ativo }) });
    await carregarMensagens();
  }
  async function forcarEnvio(m: MensagemProgramada) {
    await fetch('/api/mensagens', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, ultimoEnvio: null }) });
    setStatusMsg({ tipo: 'sucesso', texto: 'Proximo ciclo do agendador enviara esta mensagem!' });
    await carregarMensagens();
  }
  async function excluir(id: number) {
    if (!confirm('Excluir mensagem programada?')) return;
    await fetch(`/api/mensagens?id=${id}`, { method: 'DELETE' });
    setEditando(null); await carregarMensagens();
  }

  function formatarIntervalo(seg: number): string {
    if (seg < 3600) return `${seg / 60}min`;
    if (seg < 86400) return `${seg / 3600}h`;
    return `${seg / 86400}d`;
  }

  function presetLabel(key: string) { return SHOPEE_PRESETS_LIST.find(p => p.key === key)?.nome || key; }

  if (carregando) return <div className="animate-pulse text-[#B5BAC1] p-6">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-[#5865F2]" />
          <h1 className="text-2xl font-bold text-white">Mensagens Programadas</h1>
        </div>
        <button onClick={novaMensagem} className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4"/> Nova Mensagem
        </button>
      </div>

      {statusMsg && (
        <div className={`px-4 py-3 rounded-md text-sm flex items-center justify-between ${statusMsg.tipo==='sucesso'?'bg-green-500/10 border border-green-500/30 text-green-400':'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {statusMsg.texto} <button onClick={()=>setStatusMsg(null)} className="ml-2 hover:underline">X</button>
        </div>
      )}

      {mensagens.length === 0 && !editando && (
        <div className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-12 text-center">
          <MessageSquare className="w-12 h-12 text-[#3F4147] mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Nenhuma mensagem programada</h3>
          <p className="text-[#B5BAC1] text-sm mb-4">Crie mensagens para publicar automaticamente nos seus servidores.</p>
          <button onClick={novaMensagem} className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2">
            <Plus className="w-4 h-4"/> Criar Primeira Mensagem
          </button>
        </div>
      )}

      {mensagens.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mensagens.map(m => {
            const canais = m.servidoresCanais ? JSON.parse(m.servidoresCanais) as ServidorCanal[] : [];
            const cfg: ShopeeConfig = (() => { try { return m.shopeeConfig ? JSON.parse(m.shopeeConfig) : { modoRotacao: 'fixo', presetsSelecionados: [m.shopeePreset || 'achadinhos_dia'], qtdProdutos: 4, ordenacao: 'discount', cta: 'Comprar Agora 🛒' }; } catch { return { modoRotacao: 'fixo', presetsSelecionados: [m.shopeePreset || 'achadinhos_dia'], qtdProdutos: 4, ordenacao: 'discount', cta: 'Comprar Agora 🛒' }; } })();
            return (
              <div key={m.id} className="bg-[#2B2D31] border border-[#1E1F22] rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {m.tipo === 'shopee_preset' ? <ShoppingBag className="w-5 h-5 text-[#EE4D2D]" /> : <Type className="w-5 h-5 text-[#5865F2]" />}
                    <div>
                      <h3 className="text-white font-semibold">{m.nome}</h3>
                      <p className="text-xs text-[#B5BAC1] flex items-center gap-2 flex-wrap">
                        <Clock className="w-3 h-3"/>{formatarIntervalo(m.timerIntervalo)}
                        <span className="text-[#3F4147]">|</span>{canais.length} canal(is)
                        {m.tipo === 'shopee_preset' && cfg.modoRotacao !== 'fixo' && <><span className="text-[#3F4147]">|</span><span className="text-purple-400">{cfg.modoRotacao === 'randomico' ? 'Randomico' : 'Sequencial'} ({cfg.presetsSelecionados.length} presets)</span></>}
                        {m.ultimoEnvio && <><span className="text-[#3F4147]">|</span>Ultimo: {new Date(m.ultimoEnvio).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</>}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={m.ativo} onChange={() => alternarAtivo(m)} className="sr-only peer"/>
                    <div className={`w-9 h-5 rounded-full relative transition-colors ${m.ativo ? 'bg-[#5865F2]' : 'bg-[#3F4147]'}`}>
                      <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${m.ativo ? 'left-[18px]' : 'left-[2px]'}`}/>
                    </div>
                  </label>
                </div>
                <div className="bg-[#1E1F22] rounded p-3 mb-3">
                  <p className="text-sm text-[#B5BAC1] whitespace-pre-wrap line-clamp-3">
                    {m.mensagem || (m.tipo === 'shopee_preset' ? `${cfg.presetsSelecionados.length} preset(s) selecionado(s) | Ordenacao: ${ORDENACOES.find(o=>o.value===cfg.ordenacao)?.label || 'Maior Desconto'} | ${cfg.qtdProdutos} produtos por envio` : '(Sem conteudo)')}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => editarMensagem(m)} className="flex items-center gap-1 text-xs text-[#B5BAC1] hover:text-white bg-[#313338] hover:bg-[#3F4147] px-3 py-1.5 rounded transition-colors"><Edit3 className="w-3 h-3"/>Editar</button>
                  <button onClick={() => forcarEnvio(m)} className="flex items-center gap-1 text-xs text-[#2ECC71] hover:text-white bg-[#2ECC71]/10 hover:bg-[#2ECC71]/20 px-3 py-1.5 rounded transition-colors"><Send className="w-3 h-3"/>Forcar Agora</button>
                  <button onClick={() => excluir(m.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded transition-colors"><Trash2 className="w-3 h-3"/>Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2B2D31] border border-[#313338] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[#1E1F22] sticky top-0 bg-[#2B2D31] z-10">
              <h3 className="text-white font-semibold flex items-center gap-2"><Edit3 className="w-4 h-4"/>{editando.id ? 'Editar' : 'Nova'} Mensagem</h3>
              <button onClick={() => setEditando(null)} className="text-[#B5BAC1] hover:text-white"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-[#B5BAC1] mb-1">Nome da Mensagem</label>
                <input type="text" value={editando.nome || ''} onChange={e => setEditando({ ...editando, nome: e.target.value })}
                  className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none" placeholder="Ex: Promocao diaria Shopee"/>
              </div>

              <div>
                <label className="block text-xs text-[#B5BAC1] mb-2">Tipo de Mensagem</label>
                <div className="flex gap-2">
                  {[
                    { key: 'manual' as const, label: 'Mensagem Manual', icon: Type, desc: 'Digite sua propria mensagem' },
                    { key: 'shopee_preset' as const, label: 'Shopee Afiliados', icon: ShoppingBag, desc: 'Publica promocoes automaticas com embeds ricos' },
                  ].map(op => (
                    <button key={op.key} type="button" onClick={() => setEditando({ ...editando, tipo: op.key, shopeePreset: op.key === 'shopee_preset' ? shopeeConfig.presetsSelecionados[0] : null })}
                      className={`flex-1 p-3 rounded-lg border text-left transition-colors ${editando.tipo === op.key ? 'border-[#5865F2] bg-[#5865F2]/10' : 'border-[#1E1F22] hover:border-[#3F4147]'}`}>
                      <op.icon className={`w-5 h-5 mb-1 ${op.key === 'shopee_preset' ? 'text-[#EE4D2D]' : 'text-[#5865F2]'}`}/>
                      <p className="text-white text-sm font-medium">{op.label}</p>
                      <p className="text-[10px] text-[#72767D]">{op.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {editando.tipo === 'shopee_preset' && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-[#B5BAC1]">Modo de Selecao de Presets</label>
                      <div className="flex gap-1 text-xs">
                        {(['fixo', 'sequencial', 'randomico'] as const).map(m => (
                          <button key={m} type="button" onClick={() => setShopeeConfig({ ...shopeeConfig, modoRotacao: m })}
                            className={`px-2 py-1 rounded ${shopeeConfig.modoRotacao === m ? 'bg-[#5865F2] text-white' : 'bg-[#313338] text-[#B5BAC1]'}`}>
                            {m === 'fixo' ? 'Fixo' : m === 'sequencial' ? 'Sequencial' : 'Randomico'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#1E1F22] border border-[#313338] rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
                      <p className="text-[10px] text-[#72767D] mb-1">Selecione os presets para o pool de {shopeeConfig.modoRotacao === 'fixo' ? 'envio (apenas o primeiro sera usado)' : shopeeConfig.modoRotacao === 'randomico' ? 'sorteio' : 'rotacao'}:</p>
                      {SHOPEE_PRESETS_LIST.map(p => (
                        <label key={p.key} onClick={() => togglePreset(p.key)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${shopeeConfig.presetsSelecionados.includes(p.key) ? 'border-[#5865F2] bg-[#5865F2]/10' : 'border-[#313338] hover:border-[#3F4147]'}`}>
                          <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${shopeeConfig.presetsSelecionados.includes(p.key) ? 'bg-[#5865F2] border-[#5865F2]' : 'border-[#3F4147]'}`}>
                            {shopeeConfig.presetsSelecionados.includes(p.key) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm">{p.emoji} {p.nome}</p>
                            <p className="text-[10px] text-[#72767D]">{p.desc}</p>
                          </div>
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.cor }}/>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#B5BAC1] mb-1">Qtd. Produtos por Envio</label>
                      <select value={shopeeConfig.qtdProdutos} onChange={e => setShopeeConfig({ ...shopeeConfig, qtdProdutos: parseInt(e.target.value) })}
                        className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none">
                        {[2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} produtos</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[#B5BAC1] mb-1">Ordenacao</label>
                      <select value={shopeeConfig.ordenacao} onChange={e => setShopeeConfig({ ...shopeeConfig, ordenacao: e.target.value })}
                        className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none">
                        {ORDENACOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-[#B5BAC1] mb-1">Chamada para Acao (CTA)</label>
                    <input type="text" value={shopeeConfig.cta} onChange={e => setShopeeConfig({ ...shopeeConfig, cta: e.target.value })}
                      className="w-full bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none"
                      placeholder="Ex: Comprar Agora 🛒"/>
                  </div>

                  <button type="button" onClick={() => setPreviewShow(!previewShow)}
                    className="flex items-center gap-2 text-xs text-[#5865F2] hover:text-[#4752C4] bg-[#5865F2]/10 hover:bg-[#5865F2]/20 px-3 py-2 rounded-md transition-colors">
                    <Eye className="w-4 h-4"/>{previewShow ? 'Esconder Preview' : 'Pre-visualizar Embed'}
                  </button>

                  {previewShow && (
                    <div className="bg-[#0F0F11] border border-[#313338] rounded-lg p-4 space-y-3">
                      <p className="text-xs text-[#72767D] font-medium">Preview do Embed (modo {shopeeConfig.modoRotacao}, preset: {presetLabel(shopeeConfig.presetsSelecionados[0])})</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: SHOPEE_PRESETS_LIST.find(p=>p.key===shopeeConfig.presetsSelecionados[0])?.cor + '30' || '#EE4D2D30' }}>
                          {SHOPEE_PRESETS_LIST.find(p=>p.key===shopeeConfig.presetsSelecionados[0])?.emoji || '🛒'}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">Nome do Preset</p>
                          <p className="text-xs text-[#B5BAC1]">Exemplo de titulo do embed</p>
                        </div>
                      </div>
                      <div className="bg-[#1E1F22] rounded p-3 border-l-4" style={{ borderLeftColor: SHOPEE_PRESETS_LIST.find(p=>p.key===shopeeConfig.presetsSelecionados[0])?.cor || '#EE4D2D' }}>
                        <p className="text-xs text-[#72767D] mb-1">Autor • Produto Exemplo</p>
                        <p className="text-[11px] text-[#B5BAC1]">⭐ 4.5 | 🛒 1.234 vendidos | Loja: Exemplo</p>
                        <div className="flex gap-3 mt-2 text-[10px]">
                          <span className="text-[#B5BAC1]">💰 Preco</span>
                          <span className="text-[#B5BAC1]">📉 Desconto</span>
                          <span className="text-[#B5BAC1]">💵 Comissao</span>
                        </div>
                        <div className="flex gap-3 text-[10px] font-medium">
                          <span className="text-white">R$ 99,90</span>
                          <span className="text-[#2ECC71]">30% OFF</span>
                          <span className="text-[#F1C40F]">8%</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#72767D]">Rodape: Oferta via Shopee Afiliados</p>
                      <p className="text-xs text-[#5865F2] underline cursor-default">{shopeeConfig.cta}</p>
                    </div>
                  )}
                </>
              )}

              {editando.tipo === 'manual' && (
                <div>
                  <label className="block text-xs text-[#B5BAC1] mb-2">Mensagem (Markdown do Discord)</label>
                  <div className="flex flex-wrap gap-1 mb-2 bg-[#1E1F22] rounded-t-lg p-2 border border-b-0 border-[#313338]">
                    {FORMAT_BUTTONS.map(btn => (
                      <button key={btn.label} type="button" onClick={() => inserirFormatacao(btn.wrap, btn.suffix)}
                        className="p-1.5 rounded hover:bg-[#313338] text-[#B5BAC1] hover:text-white transition-colors" title={`${btn.label}: ${btn.desc}`}>
                        <btn.icon className="w-4 h-4"/>
                      </button>
                    ))}
                    <span className="w-px h-6 bg-[#3F4147] mx-1"/>
                    <button type="button" onClick={() => inserirFormatacao('```\n', '\n```')} className="p-1.5 rounded hover:bg-[#313338] text-[#B5BAC1] hover:text-white transition-colors" title="Bloco de Codigo"><List className="w-4 h-4"/></button>
                    <button type="button" onClick={() => inserirFormatacao('# ', '')} className="p-1.5 rounded hover:bg-[#313338] text-[#B5BAC1] hover:text-white transition-colors" title="Titulo"><Type className="w-4 h-4"/></button>
                    <button type="button" onClick={() => { if (editando) setEditando({ ...editando, mensagem: (editando.mensagem || '') + '\n> ' }); }} className="p-1.5 rounded hover:bg-[#313338] text-[#B5BAC1] hover:text-white transition-colors" title="Bloco de Citacao"><Copy className="w-4 h-4"/></button>
                  </div>
                  <textarea id="editor-mensagem" value={editando.mensagem || ''}
                    onChange={e => setEditando({ ...editando, mensagem: e.target.value })}
                    rows={8} placeholder="Escreva sua mensagem aqui..."
                    className="w-full bg-[#1E1F22] border border-[#313338] rounded-b-lg px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none resize-none font-mono"/>
                </div>
              )}

              <div>
                <label className="block text-xs text-[#B5BAC1] mb-2 flex items-center gap-1"><Clock className="w-3 h-3"/>Intervalo de Envio</label>
                <div className="flex flex-wrap gap-2">
                  {TIMER_PRESETS.map(t => (
                    <button key={t.label} type="button" onClick={() => { setTimerHoras(t.label); if (t.valor > 0) setTimerPersonalizado(''); }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${timerHoras === t.label ? 'bg-[#5865F2] text-white' : 'bg-[#313338] text-[#B5BAC1] hover:bg-[#3F4147]'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {timerHoras === 'Personalizado' && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input type="number" min="1" max="1440" value={timerPersonalizado} onChange={e => setTimerPersonalizado(e.target.value)}
                      className="w-24 bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none" placeholder="Minutos"/>
                    <span className="text-xs text-[#72767D]">minutos</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-[#B5BAC1] mb-2 flex items-center gap-1"><Server className="w-3 h-3"/>Servidores e Canais</label>
                <div className="flex gap-2 mb-2">
                  <select value={servidorAtual} onChange={e => carregarCanais(e.target.value)} className="flex-1 bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none">
                    <option value="">Selecione servidor...</option>
                    {servidores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                  {canaisServidor.length > 0 && (
                    <>
                      <select value={canalAtual} onChange={e => setCanalAtual(e.target.value)} className="flex-1 bg-[#1E1F22] border border-[#3F4147] rounded-md px-3 py-2 text-white text-sm focus:border-[#5865F2] focus:outline-none">
                        <option value="">Selecione canal...</option>
                        {canaisServidor.map(c => <option key={c.id} value={c.id}># {c.nome}</option>)}
                      </select>
                      <button type="button" onClick={adicionarCanal} disabled={!servidorAtual || !canalAtual} className="bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-40 text-white px-3 py-2 rounded-md text-sm flex items-center gap-1"><Plus className="w-4 h-4"/>Add</button>
                    </>
                  )}
                </div>
                {canaisSelecionados.length > 0 ? (
                  <div className="space-y-1">
                    {canaisSelecionados.map((c, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#1E1F22] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Server className="w-3 h-3 text-[#B5BAC1]"/><span className="text-white">{c.servidorNome}</span>
                          <span className="text-[#3F4147]">&gt;</span>
                          <Hash className="w-3 h-3 text-[#B5BAC1]"/><span className="text-[#B5BAC1]">{c.canalNome}</span>
                        </div>
                        <button type="button" onClick={() => removerCanal(i)} className="text-[#72767D] hover:text-red-400"><X className="w-3 h-3"/></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#72767D] py-2">Adicione pelo menos um servidor e canal.</p>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#1E1F22]">
                <button type="button" onClick={salvar} disabled={canaisSelecionados.length === 0} className="bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-40 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                  <Send className="w-4 h-4"/>{editando.id ? 'Salvar' : 'Criar Mensagem'}
                </button>
                <button type="button" onClick={() => setEditando(null)} className="text-[#B5BAC1] hover:text-white px-4 py-2 rounded-md text-sm">Cancelar</button>
                {editando.id && <button type="button" onClick={() => excluir(editando.id!)} className="text-red-400 hover:text-red-300 px-4 py-2 rounded-md text-sm ml-auto">Excluir</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
