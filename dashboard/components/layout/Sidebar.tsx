'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Settings, 
  Server, 
  Activity,
  Bot
} from 'lucide-react';

const menus = [
  { label: 'Visao Geral', href: '/', icon: LayoutDashboard },
  { label: 'Servidores', href: '/servidores', icon: Server },
  { label: 'Configuracoes', href: '/configuracoes', icon: Settings },
  { label: 'Logs', href: '/logs', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-[#2B2D31] border-r border-[#1E1F22] flex flex-col">
      <div className="p-4 border-b border-[#1E1F22]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">Meu Bot</h2>
            <p className="text-xs text-[#B5BAC1]">Online</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {menus.map((menu) => {
          const Icon = menu.icon;
          const ativo = pathname === menu.href;
          
          return (
            <Link
              key={menu.href}
              href={menu.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                ativo
                  ? 'bg-[#5865F2] text-white'
                  : 'text-[#B5BAC1] hover:bg-[#313338] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {menu.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#1E1F22]">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-[#B5BAC1]">Bot Conectado</span>
        </div>
      </div>
    </aside>
  );
}
