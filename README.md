# Hypixel Skyblock MCP Server

Um servidor MCP (Model Context Protocol) para integração com a API do Hypixel Skyblock, permitindo acesso fácil a dados de jogadores, perfis, bazaar e leilões.

## Funcionalidades

Este servidor MCP fornece as seguintes ferramentas:

### 1. `get_player`
Obtém estatísticas de um jogador do Hypixel por nome de usuário.

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft

**Retorna:**
- Nome do jogador
- UUID
- Network Level
- Primeiro e último login
- Lista de jogos jogados

### 2. `get_skyblock_profile`
Obtém todos os perfis do Skyblock de um jogador.

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft

**Retorna:**
- Lista de perfis com nome, ID e número de membros

### 3. `get_bazaar_prices`
Obtém preços atuais do Bazaar do Skyblock.

**Parâmetros:**
- `item_id` (string, opcional): ID específico do item (ex: 'ENCHANTED_DIAMOND', 'WHEAT')

**Retorna:**
- Se item_id fornecido: Detalhes completos do item incluindo preço de compra/venda e volume
- Se não fornecido: Top 20 itens com preços básicos

### 4. `get_auctions`
Obtém leilões ativos da Auction House.

**Parâmetros:**
- `player_name` (string, opcional): Filtrar leilões por nome do jogador
- `page` (number, opcional): Número da página (padrão: 0)

**Retorna:**
- Leilões ativos com detalhes de lance, item e tempo restante
- Informação de paginação

## Instalação

### 1. Clone o repositório

```bash
git clone <repository-url>
cd skyblock
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure a API Key do Hypixel

Obtenha uma API key do Hypixel:
1. Entre no servidor Hypixel (`mc.hypixel.net`)
2. Digite `/api new` no chat
3. Copie a chave gerada

Configure a variável de ambiente:

```bash
export HYPIXEL_API_KEY="sua-api-key-aqui"
```

### 4. Compile o projeto

```bash
npm run build
```

## Uso

### Executar o servidor localmente

```bash
npm start
```

### Configurar no Claude Desktop

Adicione ao seu arquivo de configuração do Claude Desktop (`claude_desktop_config.json`):

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hypixel-skyblock": {
      "command": "node",
      "args": ["/caminho/completo/para/skyblock/build/index.js"],
      "env": {
        "HYPIXEL_API_KEY": "sua-api-key-aqui"
      }
    }
  }
}
```

Substitua `/caminho/completo/para/skyblock` pelo caminho absoluto do diretório do projeto.

### Desenvolvimento

Para desenvolvimento com recompilação automática:

```bash
npm run dev
```

## Exemplos de Uso

Após configurar o servidor MCP no Claude Desktop, você pode usar comandos como:

- "Quais são as estatísticas do jogador Technoblade?"
- "Mostre-me os perfis do Skyblock do jogador Dream"
- "Qual é o preço atual de ENCHANTED_DIAMOND no Bazaar?"
- "Mostre-me os leilões ativos do jogador xyz"

## Estrutura do Projeto

```
skyblock/
├── src/
│   └── index.ts          # Servidor MCP principal
├── build/                # Arquivos compilados (gerado)
├── package.json          # Dependências e scripts
├── tsconfig.json         # Configuração TypeScript
└── README.md            # Esta documentação
```

## Tecnologias Utilizadas

- **TypeScript**: Linguagem principal
- **@modelcontextprotocol/sdk**: SDK oficial do MCP
- **node-fetch**: Cliente HTTP para fazer requisições à API do Hypixel

## Limitações

- A API do Hypixel tem rate limits. Use com moderação.
- Algumas funcionalidades requerem uma API key válida.
- Os dados retornados dependem da disponibilidade da API do Hypixel.

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## Licença

MIT

## Links Úteis

- [Documentação da API do Hypixel](https://api.hypixel.net/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Hypixel Skyblock Wiki](https://wiki.hypixel.net/Skyblock)
