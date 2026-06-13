import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

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
      <body className="bg-[#1E1F22]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
