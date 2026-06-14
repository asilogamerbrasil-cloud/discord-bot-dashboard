'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  LayoutDashboard, 
  Settings, 
  Server, 
  Activity,
  Bot,
  Shield,
  Radio,
  LogOut,
  MessageSquare
} from 'lucide-react';
import { useState } from 'react';

const menus = [
  { label: 'Visao Geral', href: '/', icon: LayoutDashboard },
  { label: 'Servidores', href: '/servidores', icon: Server },
  { label: 'Mensagens', href: '/mensagens', icon: MessageSquare },
  { label: 'Configuracoes', href: '/configuracoes', icon: Settings },
  { label: 'Integracoes', href: '/integracoes', icon: Radio },
  { label: 'Administradores', href: '/admins', icon: Shield },
  { label: 'Logs', href: '/logs', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <aside className="w-60 bg-[#2B2D31] border-r border-[#1E1F22] flex flex-col">
      <div className="p-4 border-b border-[#1E1F22]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">Meu Bot</h2>
            <p className="text-xs text-green-400">Online</p>
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

      <div className="border-t border-[#1E1F22]">
        <button
          onClick={() => setMenuAberto(!menuAberto)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#313338] transition-colors text-left"
        >
          {user?.image ? (
            <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.[0] || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{user?.name}</p>
            <p className="text-xs text-[#B5BAC1]">Admin</p>
          </div>
        </button>

        {menuAberto && (
          <div className="px-4 pb-3">
            <button
              onClick={logout}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
