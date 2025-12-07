# Hypixel Skyblock MCP Server

Um servidor MCP (Model Context Protocol) COMPLETO para integração com a API do Hypixel Skyblock. Com **21 ferramentas poderosas**, este é o servidor MCP mais abrangente para Hypixel Skyblock!

## 🎯 Funcionalidades - 21 Ferramentas Disponíveis

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

### 5. `get_shard_prices`
Obtém preços atuais do Bazaar para shards de atributos.

**Parâmetros:**
- `shard_ids` (array, opcional): Lista de IDs de shards específicos (ex: ['ATTRIBUTE_SHARD', 'SPEED_ARTIFACT'])

**Retorna:**
- Preços de compra/venda e volume para cada shard
- Se não especificado, retorna todos os shards comuns

### 6. `calculate_fusion_cost`
Calcula o custo total para fundir um atributo específico usando preços atuais do Bazaar.

**Parâmetros:**
- `attribute` (string, obrigatório): Nome do atributo (ex: 'SPEED', 'BLAZING_FORTUNE', 'LIFELINE')

**Retorna:**
- Custo total da fusão
- Breakdown detalhado dos materiais necessários
- Tier do atributo
- Árvore de fusão recursiva

### 7. `list_attributes`
Lista todos os atributos disponíveis para fusão, organizados por tier.

**Parâmetros:**
- Nenhum

**Retorna:**
- Lista completa de atributos
- Materiais necessários para cada atributo
- Organização por tier (1, 2, 3)

### 8. `read_skyshards_data`
Lê dados de fusão salvos localmente do SkyShards.

**Parâmetros:**
- `filename` (string, opcional): Nome do arquivo a ler (padrão: fusion_data.json)

**Retorna:**
- Dados de fusão salvos
- Caminho do arquivo lido

### 9. `get_player_skills`
Obtém níveis detalhados de skills e XP de um jogador do Skyblock.

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft
- `profile_name` (string, opcional): Nome do perfil específico

**Retorna:**
- Níveis de todas as skills (Farming, Mining, Combat, Foraging, Fishing, etc.)
- XP total e XP para próximo nível
- Skill average calculada

### 10. `get_player_slayers`
Obtém estatísticas de slayer bosses de um jogador.

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft
- `profile_name` (string, opcional): Nome do perfil específico

**Retorna:**
- XP e níveis de todos os slayers (Zombie, Spider, Wolf, Enderman, Blaze)
- Total de kills por slayer
- XP total de slayers

### 11. `get_player_dungeons`
Obtém estatísticas de dungeons incluindo classes e progresso.

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft
- `profile_name` (string, opcional): Nome do perfil específico

**Retorna:**
- Níveis de todas as classes (Healer, Mage, Berserk, Archer, Tank)
- Progresso de Catacombs (nível, XP, highest floor)
- Total de secrets encontrados
- Classe selecionada atualmente

### 12. `find_bazaar_flips`
Encontra oportunidades de lucro no Bazaar analisando diferenças entre preços de compra e venda.

**Parâmetros:**
- `min_profit` (number, opcional): Lucro mínimo em coins (padrão: 100000)
- `min_volume` (number, opcional): Volume mínimo de transações (padrão: 1000)

**Retorna:**
- Top 20 melhores flips ordenados por lucro
- Preço de compra, venda, lucro e % de lucro
- Volume de compra/venda para cada item

### 13. `calculate_networth`
Calcula o networth básico de um jogador (purse + bank).

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft
- `profile_name` (string, opcional): Nome do perfil específico

**Retorna:**
- Coins na purse
- Coins no bank
- Total de liquid coins
- Nota: Análise completa de inventário em desenvolvimento

### 14. `get_player_collections`
Obtém estatísticas de coleções de um jogador.

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft
- `profile_name` (string, opcional): Nome do perfil específico

**Retorna:**
- Todas as coleções organizadas por categoria (Farming, Mining, Combat, Foraging, Fishing)
- Top 10 coleções com maior progresso
- Total de coleções desbloqueadas

### 15. `get_player_pets`
Obtém todos os pets de um jogador.

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft
- `profile_name` (string, opcional): Nome do perfil específico

**Retorna:**
- Lista de todos os pets (tipo, raridade, nível, XP)
- Pets por raridade (Common, Uncommon, Rare, Epic, Legendary, Mythic)
- Pet ativo atual
- Items segurados pelos pets

### 16. `get_fairy_souls`
Obtém progresso de coleta de Fairy Souls.

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft
- `profile_name` (string, opcional): Nome do perfil específico

**Retorna:**
- Total de fairy souls coletadas
- Fairy souls faltantes
- % de conclusão
- Máximo possível (247 souls)

### 17. `get_jacobs_data`
Obtém estatísticas de Jacob's Farming Contests.

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft
- `profile_name` (string, opcional): Nome do perfil específico

**Retorna:**
- Medals ganhos (Gold, Silver, Bronze)
- Total de medals
- Perks desbloqueados
- Número de contests participados

### 18. `get_museum_data`
Obtém progresso de doações do Museum.

**Parâmetros:**
- `username` (string, obrigatório): Nome de usuário do Minecraft
- `profile_name` (string, opcional): Nome do perfil específico

**Retorna:**
- Items doados ao museum
- Valor total do museum
- Lista de items específicos

### 19. `get_guild_stats`
Obtém estatísticas de uma guild por nome.

**Parâmetros:**
- `guild_name` (string, obrigatório): Nome da guild

**Retorna:**
- Nome e tag da guild
- Level e XP
- Número de membros
- Data de criação
- Descrição e jogos preferidos

### 20. `calculate_minion_profit`
Calcula lucro estimado para um tipo de minion.

**Parâmetros:**
- `minion_type` (string, obrigatório): Tipo do minion (ex: 'WHEAT', 'DIAMOND', 'COBBLESTONE')
- `tier` (number, opcional): Tier do minion (1-12, padrão: 11)

**Retorna:**
- Items produzidos por hora
- Lucro por hora/dia/semana
- Estimativas baseadas em taxas de produção

### 21. `compare_item_prices`
Compara preços de compra e venda no Bazaar.

**Parâmetros:**
- `item_id` (string, obrigatório): ID do item para comparar

**Retorna:**
- Preços de buy e sell
- Spread de preço
- % de spread
- Recomendação de flip

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

### Integração com SkyShards (Opcional)

Para usar a funcionalidade de leitura de dados do SkyShards, configure a variável de ambiente adicional:

```json
{
  "mcpServers": {
    "hypixel-skyblock": {
      "command": "node",
      "args": ["/caminho/completo/para/skyblock/build/index.js"],
      "env": {
        "HYPIXEL_API_KEY": "sua-api-key-aqui",
        "SKYSHARDS_DATA_PATH": "/caminho/para/seus/dados/skyshards"
      }
    }
  }
}
```

O SkyShards é uma ferramenta web para calcular fusões ótimas de atributos. Se você exportar dados do SkyShards para um arquivo local, este servidor MCP pode lê-los.

### Desenvolvimento

Para desenvolvimento com recompilação automática:

```bash
npm run dev
```

## Exemplos de Uso

Após configurar o servidor MCP no Claude Desktop, você pode usar comandos como:

### Consultas de Jogadores
- "Quais são as estatísticas do jogador Technoblade?"
- "Mostre-me os perfis do Skyblock do jogador Dream"

### Economia e Bazaar
- "Qual é o preço atual de ENCHANTED_DIAMOND no Bazaar?"
- "Mostre-me os preços dos shards de atributos"
- "Quanto custa no total para fundir BLAZING_FORTUNE?"

### Leilões
- "Mostre-me os leilões ativos do jogador xyz"
- "Quais são os leilões da página 2?"

### Fusão de Atributos (SkyShards)
- "Liste todos os atributos disponíveis para fusão"
- "Calcule o custo para fundir LIFELINE"
- "Quais são os preços atuais de ATTRIBUTE_SHARD?"
- "Mostre-me a árvore de fusão para DOUBLE_HOOK"

### Skills & Progressão
- "Quais são os níveis de skills do jogador Technoblade?"
- "Mostre-me a skill average do jogador xyz"
- "Quanto XP falta para o próximo nível de mining?"

### Slayers
- "Quais são as estatísticas de slayers do jogador Dream?"
- "Quantos zombie slayers o jogador xyz matou?"
- "Qual é o XP total de slayers?"

### Dungeons
- "Mostre as estatísticas de dungeons do jogador xyz"
- "Qual é o nível de catacombs?"
- "Quantos secrets o jogador encontrou?"
- "Quais são os níveis das classes de dungeon?"

### Economia & Lucro
- "Encontre os melhores flips no Bazaar agora"
- "Mostre flips com lucro mínimo de 500k"
- "Quais itens têm maior margem de lucro?"

### Networth
- "Calcule o networth do jogador xyz"
- "Quanto dinheiro o jogador tem no total?"

### Collections
- "Mostre as coleções do jogador xyz"
- "Quais são as top coleções de farming?"
- "Quantas coleções diferentes o jogador tem?"

### Pets
- "Liste todos os pets do jogador xyz"
- "Qual é o pet ativo do jogador?"
- "Quantos pets legendários o jogador tem?"

### Fairy Souls
- "Quantas fairy souls o jogador coletou?"
- "Quantas fairy souls faltam?"
- "Qual é a % de conclusão de fairy souls?"

### Jacob's Contests
- "Mostre as estatísticas de Jacob do jogador xyz"
- "Quantas medals o jogador ganhou?"
- "Quais perks de farming estão desbloqueados?"

### Museum
- "Mostre o progresso do museum do jogador xyz"
- "Quantos items foram doados ao museum?"

### Guilds
- "Mostre estatísticas da guild 'Example Guild'"
- "Quantos membros a guild tem?"
- "Qual é o level da guild?"

### Minions
- "Calcule o lucro de um wheat minion tier 11"
- "Quanto lucro faz um diamond minion por dia?"
- "Compare lucro de diferentes minions"

### Comparação de Preços
- "Compare preços de ENCHANTED_DIAMOND"
- "Qual é o spread de preço de WHEAT?"

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
- [SkyShards - Fusion Calculator](https://skyshards.com/)
- [SkyShards GitHub](https://github.com/Campionnn/SkyShards)
