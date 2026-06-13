# Bot Discord + Dashboard

## Servicos Necessarios

### Para Desenvolvimento (gratuito)
- **Discord Developer Portal**: Criar a aplicacao e obter credenciais
  - https://discord.com/developers/applications
- **Ngrok** (opcional): Expor localhost para testes de OAuth
  - https://ngrok.com (plano gratuito funciona)

### Para Producao (Railway / Render)

#### Railway (recomendado)
- **Bot**: Railway.app - $5/mes (plano Hobby)
- **Dashboard**: Mesmo app no Railway (monorepo)
- **Banco SQLite**: como Railway tem ephemeral storage, usar **Turso** (SQLite cloud, gratuito ate 9GB)
  - https://turso.tech - SQLite na nuvem, compatível com Drizzle, free tier generoso
- **Dominio customizado** (opcional): Comprar no seu registrador preferido

#### Alternativa Render
- **Web Service** (bot): $7/mes
- **Web Service** (dashboard): $7/mes  
- **Turso** para SQLite: gratuito

### Credenciais Discord Necessarias (gratuitas)
- `DISCORD_TOKEN` - Token do bot
- `DISCORD_CLIENT_ID` - ID da aplicacao
- `DISCORD_CLIENT_SECRET` - Secret da aplicacao
- `DISCORD_REDIRECT_URI` - URL de callback OAuth

### Stack Resumida
| Camada | Tecnologia |
|--------|-----------|
| Bot | Node.js + TypeScript + discord.js |
| Dashboard | Next.js 14 (App Router) |
| Banco | SQLite (local dev) / Turso (producao) |
| ORM | Drizzle ORM |
| Auth | Discord OAuth2 |
| Host | Railway ou Render |
| Estilo | Tailwind CSS |
