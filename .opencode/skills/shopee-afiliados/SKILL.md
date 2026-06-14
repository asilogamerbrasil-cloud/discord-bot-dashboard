---
name: shopee-afiliados
description: Use when building Shopee Affiliate integrations, working with Shopee Open API (GraphQL), generating affiliate links, tracking commissions, searching products, or any Shopee Affiliate Program development. Covers GraphQL API, authentication, product queries, commission reporting, and best practices.
---

# Shopee Affiliate API (Plataforma Aberta de Afiliados)

## Overview

A Plataforma Aberta de Afiliados da Shopee usa a especificação **GraphQL** sobre HTTP.
Todas as requisições são enviadas via **POST** com o corpo no formato JSON, seguindo o padrão GraphQL.

### Endpoint Base

```
https://open-api.affiliate.shopee.com.br/graphql
```

**Nota:** O endpoint varia por região. Para Brasil use `.com.br`. Para outros países:
- Brasil: `https://open-api.affiliate.shopee.com.br/graphql`
- Global: `https://open-api.affiliate.shopee.com/graphql`

---

## Autenticação

A API usa autenticação via headers HTTP. Não há fluxo OAuth — as credenciais são obtidas diretamente no portal de afiliados da Shopee.

### Headers Obrigatórios

```typescript
const headers = {
  'Content-Type': 'application/json',
  'App-Id': 'SEU_APP_ID',        // Ex: 18381900711
  'App-Secret': 'SUA_SENHA',     // Senha/Secret Key fornecida pela Shopee
};
```

### Fluxo de Autenticação

1. Cadastre-se no Programa de Afiliados Shopee (https://affiliate.shopee.com.br)
2. Acesse o portal e obtenha seu **App ID** e **App Secret**
3. Todas as chamadas à API GraphQL exigem os headers `App-Id` e `App-Secret`
4. **Importante:** Não há renovação de token — as credenciais são estáticas

---

## GraphQL API Reference

### Estrutura Geral de Requisição

```typescript
async function shopeeGraphQL<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  appId: string,
  appSecret: string
): Promise<T> {
  const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'App-Id': appId,
      'App-Secret': appSecret,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shopee API Error (${res.status}): ${errText.substring(0, 500)}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}
```

### Query: Gerar Link de Afiliado (`generateAffiliateLink`)

Gera um link de afiliado para um produto específico da Shopee.

```graphql
query GenerateAffiliateLink($productId: String!, $campaignId: String) {
  generateAffiliateLink(productId: $productId, campaignId: $campaignId) {
    success
    message
    data {
      productId
      affiliateLink
      originalLink
      shortLink
    }
  }
}
```

**Variáveis:**
- `productId` (String, obrigatório): ID do produto na Shopee (ex: shopee_product_id)
- `campaignId` (String, opcional): ID de campanha personalizada

**Exemplo de uso:**
```typescript
const query = `
  query GenerateLink($productId: String!) {
    generateAffiliateLink(productId: $productId) {
      success
      message
      data {
        productId
        affiliateLink
        shortLink
        originalLink
      }
    }
  }
`;

const result = await shopeeGraphQL(query, { productId: '1234567890' }, appId, appSecret);
// result.generateAffiliateLink.data.affiliateLink -> link com tracking
```

### Query: Buscar Produtos (`searchProduct`)

Pesquisa produtos na Shopee com suporte a paginação, ordenação e filtros.

```graphql
query SearchProduct(
  $keyword: String!,
  $page: Int,
  $pageSize: Int,
  $orderBy: String,
  $orderDirection: String,
  $minPrice: Float,
  $maxPrice: Float,
  $categoryId: String
) {
  searchProduct(
    keyword: $keyword
    page: $page
    pageSize: $pageSize
    orderBy: $orderBy
    orderDirection: $orderDirection
    minPrice: $minPrice
    maxPrice: $maxPrice
    categoryId: $categoryId
  ) {
    success
    message
    data {
      totalCount
      page
      pageSize
      products {
        productId
        productName
        productImage
        productUrl
        price
        originalPrice
        discount
        rating
        soldCount
        shopName
        shopId
        categoryId
        categoryName
        commissionRate
      }
    }
  }
}
```

**Parâmetros de busca:**
- `keyword` (String): Termo de busca
- `page` (Int): Página (default: 1)
- `pageSize` (Int): Itens por página (max 50)
- `orderBy` (String): `"price"`, `"sales"`, `"rating"`, `"commission"`
- `orderDirection` (String): `"asc"` ou `"desc"`
- `minPrice` / `maxPrice` (Float): Filtro de preço
- `categoryId` (String): Filtrar por categoria

### Query: Detalhe do Produto (`getProductDetail`)

Obtém informações detalhadas de um produto específico.

```graphql
query GetProductDetail($productId: String!) {
  getProductDetail(productId: $productId) {
    success
    message
    data {
      productId
      productName
      productImage
      productUrl
      price
      originalPrice
      discount
      rating
      ratingCount
      soldCount
      stock
      shopName
      shopId
      categoryId
      categoryName
      description
      images
      variants {
        name
        price
        stock
      }
      commissionRate
      commissionAmount
    }
  }
}
```

### Query: Categorias (`getCategories`)

Lista todas as categorias de produtos disponíveis.

```graphql
query GetCategories {
  getCategories {
    success
    message
    data {
      categories {
        categoryId
        categoryName
        parentId
        subCategories {
          categoryId
          categoryName
        }
      }
    }
  }
}
```

### Query: Produtos em Destaque / Mais Vendidos (`getHotProducts`)

Retorna produtos populares/em alta.

```graphql
query GetHotProducts($categoryId: String, $page: Int, $pageSize: Int) {
  getHotProducts(categoryId: $categoryId, page: $page, pageSize: $pageSize) {
    success
    message
    data {
      totalCount
      products {
        productId
        productName
        productImage
        price
        originalPrice
        discount
        rating
        soldCount
        commissionRate
      }
    }
  }
}
```

### Query: Relatório de Comissões (`getCommissionReport`)

Relatório de comissões em um período.

```graphql
query GetCommissionReport(
  $startDate: String!,
  $endDate: String!,
  $page: Int,
  $pageSize: Int
) {
  getCommissionReport(
    startDate: $startDate
    endDate: $endDate
    page: $page
    pageSize: $pageSize
  ) {
    success
    message
    data {
      totalCount
      totalCommission
      totalOrders
      totalClicks
      orders {
        orderId
        productId
        productName
        productImage
        price
        commissionRate
        commissionAmount
        orderStatus
        orderDate
      }
    }
  }
}
```

**Parâmetros:**
- `startDate` / `endDate` (String): Formato `"YYYY-MM-DD"`
- `page` (Int): Página (default: 1)
- `pageSize` (Int): Itens por página

### Query: Lista de Pedidos (`getOrderList`)

Lista pedidos realizados via links de afiliado.

```graphql
query GetOrderList(
  $startDate: String!,
  $endDate: String!,
  $status: String,
  $page: Int,
  $pageSize: Int
) {
  getOrderList(
    startDate: $startDate
    endDate: $endDate
    status: $status
    page: $page
    pageSize: $pageSize
  ) {
    success
    message
    data {
      totalCount
      totalCommission
      orders {
        orderId
        productId
        productName
        productImage
        price
        quantity
        commissionRate
        commissionAmount
        orderStatus
        orderDate
        clickId
      }
    }
  }
}
```

**Status de pedidos:**
- `"pending"` - Pendente
- `"confirmed"` - Confirmado
- `"shipped"` - Enviado
- `"delivered"` - Entregue
- `"cancelled"` - Cancelado
- `"returned"` - Devolvido

### Query: Relatório de Cliques (`getClickReport`)

Relatório de cliques nos links de afiliado.

```graphql
query GetClickReport($startDate: String!, $endDate: String!, $page: Int, $pageSize: Int) {
  getClickReport(startDate: $startDate, endDate: $endDate, page: $page, pageSize: $pageSize) {
    success
    message
    data {
      totalClicks
      uniqueClicks
      clickDetails {
        date
        productId
        productName
        clicks
        conversions
      }
    }
  }
}
```

---

## Tipos TypeScript

```typescript
interface ShopeeConfig {
  appId: string;
  appSecret: string;
}

interface Product {
  productId: string;
  productName: string;
  productImage: string;
  productUrl: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  ratingCount: number;
  soldCount: number;
  shopName: string;
  shopId: string;
  categoryId: string;
  categoryName: string;
  commissionRate: number;
  commissionAmount: number;
  description?: string;
  images?: string[];
  variants?: ProductVariant[];
}

interface ProductVariant {
  name: string;
  price: number;
  stock: number;
}

interface AffiliateLink {
  productId: string;
  affiliateLink: string;
  originalLink: string;
  shortLink: string;
}

interface CommissionOrder {
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  commissionRate: number;
  commissionAmount: number;
  orderStatus: string;
  orderDate: string;
  clickId?: string;
  quantity?: number;
}

interface CommissionReport {
  totalCount: number;
  totalCommission: number;
  totalOrders: number;
  totalClicks: number;
  orders: CommissionOrder[];
}

interface ClickReport {
  totalClicks: number;
  uniqueClicks: number;
  clickDetails: {
    date: string;
    productId: string;
    productName: string;
    clicks: number;
    conversions: number;
  }[];
}
```

---

## Fluxo Típico de Integração (Bot Discord)

### 1. Monitoramento de Promoções

```typescript
async function monitorarPromocoes(config: ShopeeConfig, channelId: string) {
  // Buscar produtos em destaque com alta taxa de comissão
  const query = `
    query HotProducts($page: Int, $pageSize: Int) {
      getHotProducts(page: $page, pageSize: $pageSize) {
        data {
          products {
            productId
            productName
            price
            originalPrice
            discount
            commissionRate
          }
        }
      }
    }
  `;

  const result = await shopeeGraphQL(query, { page: 1, pageSize: 10 }, config.appId, config.appSecret);
  
  // Filtrar produtos com desconto > 30% e comissão > 5%
  const boasOfertas = result.getHotProducts.data.products.filter(
    p => p.discount >= 30 && p.commissionRate >= 5
  );

  for (const produto of boasOfertas) {
    // Gerar link de afiliado
    const linkQuery = `
      query GenerateLink($productId: String!) {
        generateAffiliateLink(productId: $productId) {
          data { affiliateLink shortLink }
        }
      }
    `;
    const linkResult = await shopeeGraphQL(linkQuery, { productId: produto.productId }, config.appId, config.appSecret);
    
    const mensagem = `⚡ **OFERTA IMPERDÍVEL!** ⚡\n\n🛍️ **${produto.productName}**\n💰 De: ~~R$ ${produto.originalPrice}~~ Por: **R$ ${produto.price}**\n📉 ${produto.discount}% OFF | 💵 ${produto.commissionRate}% Comissão\n🔗 ${linkResult.generateAffiliateLink.data.shortLink}`;
    
    // Enviar para canal Discord
    await sendDiscordMessage(channelId, mensagem);
  }
}
```

### 2. Relatório Diário de Comissões

```typescript
async function relatorioDiario(config: ShopeeConfig, channelId: string) {
  const hoje = new Date().toISOString().split('T')[0];

  const query = `
    query Report($startDate: String!, $endDate: String!) {
      getCommissionReport(startDate: $startDate, endDate: $endDate) {
        data {
          totalCommission
          totalOrders
          totalClicks
        }
      }
    }
  `;

  const result = await shopeeGraphQL(query, { startDate: hoje, endDate: hoje }, config.appId, config.appSecret);
  const report = result.getCommissionReport.data;

  const mensagem = `📊 **RELATÓRIO DIÁRIO - SHOPEE** 📊\n\n📅 Data: ${hoje}\n👆 Cliques: ${report.totalClicks}\n🛒 Pedidos: ${report.totalOrders}\n💵 Comissão: R$ ${report.totalCommission.toFixed(2)}`;

  await sendDiscordMessage(channelId, mensagem);
}
```

### 3. Busca de Produtos por Nicho

```typescript
async function buscarPorNicho(config: ShopeeConfig, keyword: string): Promise<Product[]> {
  const query = `
    query Search($keyword: String!, $pageSize: Int, $orderBy: String) {
      searchProduct(keyword: $keyword, pageSize: 10, orderBy: "commission") {
        data {
          products {
            productId
            productName
            price
            originalPrice
            discount
            rating
            soldCount
            commissionRate
          }
        }
      }
    }
  `;

  const result = await shopeeGraphQL(query, { keyword, pageSize: 10 }, config.appId, config.appSecret);
  return result.searchProduct.data.products;
}
```

---

## Limites de Rate e Boas Práticas

### Rate Limiting
- A API da Shopee tem limites por App ID
- Recomendação: máximo 60 requisições por minuto
- Implementar retry com backoff exponencial

### Retry com Backoff

```typescript
async function shopeeGraphQLWithRetry<T>(
  query: string,
  variables: Record<string, unknown>,
  config: ShopeeConfig,
  maxRetries = 3
): Promise<T> {
  for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
    try {
      return await shopeeGraphQL<T>(query, variables, config.appId, config.appSecret);
    } catch (erro) {
      if (tentativa === maxRetries) throw erro;
      const delay = Math.pow(2, tentativa) * 1000; // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Cache de Produtos

```typescript
const cacheProdutos = new Map<string, { data: Product; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutos

async function getProdutoComCache(config: ShopeeConfig, productId: string): Promise<Product> {
  const cached = cacheProdutos.get(productId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const query = `
    query Detail($productId: String!) {
      getProductDetail(productId: $productId) {
        data {
          productId
          productName
          price
          originalPrice
          discount
          rating
          soldCount
          commissionRate
          commissionAmount
        }
      }
    }
  `;

  const result = await shopeeGraphQL(query, { productId }, config.appId, config.appSecret);
  const produto = result.getProductDetail.data;
  
  cacheProdutos.set(productId, { data: produto, timestamp: Date.now() });
  return produto;
}
```

---

## Segurança

### Proteção de Credenciais

- **NUNCA** exponha `App-Secret` em logs, mensagens ou frontend
- Armazene o `App-Secret` apenas em variáveis de ambiente ou banco de dados criptografado
- O `App-Id` pode ser público (similar a um client ID), mas mantenha o Secret seguro
- Em produção, use secrets managers (Railway env vars, Vault, etc.)

### Validação de Dados

```typescript
function validarConfig(config: ShopeeConfig): boolean {
  if (!config.appId || !config.appSecret) return false;
  if (typeof config.appId !== 'string' || config.appId.trim().length < 5) return false;
  if (typeof config.appSecret !== 'string' || config.appSecret.trim().length < 8) return false;
  return true;
}
```

---

## Variáveis de Ambiente Recomendadas

```bash
# .env
SHOPEE_APP_ID=seu_app_id
SHOPEE_APP_SECRET=sua_senha_secreta
SHOPEE_API_URL=https://open-api.affiliate.shopee.com.br/graphql
```

---

## Resumo de Endpoints GraphQL

| Query/Mutation | Descrição | Principal Uso |
|---|---|---|
| `searchProduct` | Buscar produtos | Pesquisar ofertas por palavra-chave |
| `getProductDetail` | Detalhes do produto | Obter preço, comissão, avaliações |
| `getHotProducts` | Produtos em destaque | Descobrir produtos populares |
| `getCategories` | Listar categorias | Navegar por categorias |
| `generateAffiliateLink` | Gerar link de afiliado | Criar links com tracking |
| `getCommissionReport` | Relatório de comissões | Monitorar ganhos |
| `getOrderList` | Lista de pedidos | Acompanhar conversões |
| `getClickReport` | Relatório de cliques | Analisar performance |

---

## Referências

- Portal do Afiliado Shopee: https://affiliate.shopee.com.br
- Documentação Oficial: https://open.shopee.com (Plataforma Aberta)
- GraphQL Clients: https://graphql.org/code/#graphql-clients
- Especificação GraphQL: https://graphql.org/
