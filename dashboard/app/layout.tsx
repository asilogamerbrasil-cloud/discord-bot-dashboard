import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Painel do Bot - Discord',
  description: 'Dashboard de gerenciamento do bot Discord',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="flex h-screen overflow-hidden">
        <Providers>
          <Sidebar />
          <main className="flex-1 overflow-auto p-6 bg-[#1E1F22]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
