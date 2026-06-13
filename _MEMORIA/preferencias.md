# Preferencias do Projeto - Discord Bot

## Stack Principal
- **Bot**: Node.js + TypeScript + discord.js
- **Dashboard**: Next.js (App Router) + React
- **Banco de Dados**: SQLite
- **ORM**: Drizzle ORM
- **Hospedagem**: Railway / Render

## Estrutura do Projeto
- Monorepo com `bot/` e `dashboard/` como workspaces
- Pasta `shared/` para tipos e utilidades compartilhadas

## Funcionalidades Planejadas

### Fase 1 - Core
- [ ] Bot base Discord (login, eventos, comandos slash)
- [ ] Dashboard web com login (OAuth Discord)
- [ ] Configuracao Geral do Bot (nome, avatar, banner, bio)

### Fase 2 - Servidores
- [ ] Gerenciar servidores pelo dashboard
- [ ] Adicionar bot a servidores
- [ ] Sistema anti-bot verification (check/click emoji)
- [ ] Visualizacao remota da tela do bot
- [ ] Passos manuais para verificacao

### Fase 3 - Avancado
- [ ] Comandos personalizados por servidor
- [ ] Sistema de logs
- [ ] Analytics / estatisticas

## Preferencias do Desenvolvedor
- Código em português (nomes de variaveis, comentarios)
- Interface do dashboard moderna e escura (dark mode)
- Componentes reutilizaveis
- Testes automatizados (vitest)
