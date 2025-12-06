#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import * as fs from "fs/promises";
import * as path from "path";

const HYPIXEL_API_KEY = process.env.HYPIXEL_API_KEY || "";
const BASE_URL = "https://api.hypixel.net/v2";
const SKYSHARDS_DATA_PATH = process.env.SKYSHARDS_DATA_PATH || path.join(process.env.HOME || "", ".skyshards");

interface HypixelPlayerResponse {
  success: boolean;
  player?: {
    displayname: string;
    uuid: string;
    firstLogin: number;
    lastLogin: number;
    networkExp: number;
    stats?: any;
  };
}

interface SkyblockProfileResponse {
  success: boolean;
  profiles?: Array<{
    profile_id: string;
    cute_name: string;
    members: Record<string, any>;
  }>;
}

interface BazaarResponse {
  success: boolean;
  products?: Record<string, {
    product_id: string;
    sell_summary: Array<{ amount: number; pricePerUnit: number }>;
    buy_summary: Array<{ amount: number; pricePerUnit: number }>;
    quick_status: {
      sellPrice: number;
      buyPrice: number;
      sellVolume: number;
      buyVolume: number;
    };
  }>;
}

interface AuctionResponse {
  success: boolean;
  page?: number;
  totalPages?: number;
  totalAuctions?: number;
  auctions?: Array<{
    uuid: string;
    auctioneer: string;
    item_name: string;
    starting_bid: number;
    highest_bid_amount: number;
    end: number;
  }>;
}

async function makeHypixelRequest(endpoint: string): Promise<any> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {};

  if (HYPIXEL_API_KEY) {
    headers["API-Key"] = HYPIXEL_API_KEY;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

async function getPlayerByName(username: string): Promise<string> {
  const data: HypixelPlayerResponse = await makeHypixelRequest(`/player?name=${username}`);

  if (!data.success || !data.player) {
    return `Player "${username}" not found`;
  }

  const player = data.player;
  const networkLevel = Math.floor(Math.sqrt(2 * player.networkExp + 30625) / 50 - 2.5);

  return JSON.stringify({
    name: player.displayname,
    uuid: player.uuid,
    firstLogin: new Date(player.firstLogin).toISOString(),
    lastLogin: new Date(player.lastLogin).toISOString(),
    networkLevel: networkLevel,
    stats: player.stats ? Object.keys(player.stats) : []
  }, null, 2);
}

async function getSkyblockProfile(username: string): Promise<string> {
  const data: SkyblockProfileResponse = await makeHypixelRequest(`/skyblock/profiles?name=${username}`);

  if (!data.success || !data.profiles || data.profiles.length === 0) {
    return `No Skyblock profiles found for "${username}"`;
  }

  const profiles = data.profiles.map(profile => ({
    name: profile.cute_name,
    profile_id: profile.profile_id,
    members: Object.keys(profile.members).length
  }));

  return JSON.stringify(profiles, null, 2);
}

async function getBazaarPrices(itemId?: string): Promise<string> {
  const data: BazaarResponse = await makeHypixelRequest("/skyblock/bazaar");

  if (!data.success || !data.products) {
    return "Failed to fetch bazaar data";
  }

  if (itemId) {
    const product = data.products[itemId.toUpperCase()];
    if (!product) {
      return `Item "${itemId}" not found in bazaar`;
    }

    return JSON.stringify({
      product_id: product.product_id,
      buyPrice: product.quick_status.buyPrice,
      sellPrice: product.quick_status.sellPrice,
      buyVolume: product.quick_status.buyVolume,
      sellVolume: product.quick_status.sellVolume,
      buy_summary: product.buy_summary.slice(0, 3),
      sell_summary: product.sell_summary.slice(0, 3)
    }, null, 2);
  }

  const topProducts = Object.entries(data.products)
    .slice(0, 20)
    .map(([id, product]) => ({
      product_id: id,
      buyPrice: product.quick_status.buyPrice,
      sellPrice: product.quick_status.sellPrice
    }));

  return JSON.stringify(topProducts, null, 2);
}

async function getActiveAuctions(playerName?: string, page: number = 0): Promise<string> {
  let endpoint = `/skyblock/auctions?page=${page}`;

  if (playerName) {
    endpoint = `/skyblock/auctions?player=${playerName}&page=${page}`;
  }

  const data: AuctionResponse = await makeHypixelRequest(endpoint);

  if (!data.success || !data.auctions) {
    return "Failed to fetch auction data";
  }

  const auctions = data.auctions.slice(0, 10).map(auction => ({
    item_name: auction.item_name,
    starting_bid: auction.starting_bid,
    highest_bid: auction.highest_bid_amount,
    ends_at: new Date(auction.end).toISOString(),
    auctioneer: auction.auctioneer
  }));

  return JSON.stringify({
    page: data.page,
    totalPages: data.totalPages,
    totalAuctions: data.totalAuctions,
    auctions: auctions
  }, null, 2);
}

// SkyShards related functions
const ATTRIBUTE_SHARDS = [
  "ATTRIBUTE_SHARD",
  "SPEED_ARTIFACT",
  "MANA_POOL_ARTIFACT",
  "VITALITY_ARTIFACT",
  "LIFELINE_ARTIFACT",
  "MANA_REGENERATION_ARTIFACT",
  "BLAZING_FORTUNE_ARTIFACT",
  "FISHING_EXPERIENCE_ARTIFACT",
  "DOUBLE_HOOK_ARTIFACT",
  "TROPHY_HUNTER_ARTIFACT"
];

const ATTRIBUTE_COMBINATIONS: Record<string, { tier: number; materials: string[] }> = {
  "SPEED": { tier: 1, materials: ["ATTRIBUTE_SHARD"] },
  "MANA_POOL": { tier: 1, materials: ["ATTRIBUTE_SHARD"] },
  "VITALITY": { tier: 1, materials: ["ATTRIBUTE_SHARD"] },
  "LIFELINE": { tier: 2, materials: ["SPEED", "VITALITY"] },
  "MANA_REGENERATION": { tier: 2, materials: ["SPEED", "MANA_POOL"] },
  "BLAZING_FORTUNE": { tier: 3, materials: ["SPEED", "MANA_POOL", "VITALITY"] },
  "FISHING_EXPERIENCE": { tier: 2, materials: ["MANA_POOL", "VITALITY"] },
  "DOUBLE_HOOK": { tier: 3, materials: ["FISHING_EXPERIENCE", "SPEED"] },
  "TROPHY_HUNTER": { tier: 3, materials: ["FISHING_EXPERIENCE", "VITALITY"] }
};

async function getShardPrices(shardIds?: string[]): Promise<string> {
  const data: BazaarResponse = await makeHypixelRequest("/skyblock/bazaar");

  if (!data.success || !data.products) {
    return "Failed to fetch bazaar data";
  }

  const shardsToCheck = shardIds && shardIds.length > 0 ? shardIds : ATTRIBUTE_SHARDS;
  const shardPrices: Record<string, any> = {};

  for (const shardId of shardsToCheck) {
    const productId = shardId.toUpperCase();
    const product = data.products[productId];

    if (product) {
      shardPrices[productId] = {
        buyPrice: product.quick_status.buyPrice,
        sellPrice: product.quick_status.sellPrice,
        buyVolume: product.quick_status.buyVolume,
        sellVolume: product.quick_status.sellVolume
      };
    }
  }

  return JSON.stringify(shardPrices, null, 2);
}

async function calculateFusionCost(targetAttribute: string): Promise<string> {
  const data: BazaarResponse = await makeHypixelRequest("/skyblock/bazaar");

  if (!data.success || !data.products) {
    return "Failed to fetch bazaar data";
  }

  const attrUpper = targetAttribute.toUpperCase();
  const fusion = ATTRIBUTE_COMBINATIONS[attrUpper];

  if (!fusion) {
    return `Unknown attribute: ${targetAttribute}. Available: ${Object.keys(ATTRIBUTE_COMBINATIONS).join(", ")}`;
  }

  let totalCost = 0;
  const breakdown: Record<string, any> = {};

  const calculateMaterialCost = (material: string, depth: number = 0): number => {
    const materialUpper = material.toUpperCase();

    if (materialUpper === "ATTRIBUTE_SHARD") {
      const product = data.products![materialUpper];
      if (product) {
        const cost = product.quick_status.buyPrice;
        breakdown[materialUpper] = {
          type: "base_shard",
          cost: cost,
          depth: depth
        };
        return cost;
      }
      return 0;
    }

    const subFusion = ATTRIBUTE_COMBINATIONS[materialUpper];
    if (subFusion) {
      let subCost = 0;
      const subMaterials: string[] = [];

      for (const subMaterial of subFusion.materials) {
        const cost = calculateMaterialCost(subMaterial, depth + 1);
        subCost += cost;
        subMaterials.push(subMaterial);
      }

      breakdown[materialUpper] = {
        type: "fusion",
        tier: subFusion.tier,
        materials: subMaterials,
        cost: subCost,
        depth: depth
      };

      return subCost;
    }

    return 0;
  };

  for (const material of fusion.materials) {
    totalCost += calculateMaterialCost(material);
  }

  return JSON.stringify({
    attribute: attrUpper,
    tier: fusion.tier,
    totalCost: totalCost,
    breakdown: breakdown,
    materials: fusion.materials
  }, null, 2);
}

async function readSkyShardsData(filename?: string): Promise<string> {
  try {
    const filePath = filename
      ? path.join(SKYSHARDS_DATA_PATH, filename)
      : path.join(SKYSHARDS_DATA_PATH, "fusion_data.json");

    const fileContent = await fs.readFile(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    return JSON.stringify({
      path: filePath,
      data: jsonData
    }, null, 2);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return JSON.stringify({
        error: "SkyShards data file not found",
        expectedPath: filename
          ? path.join(SKYSHARDS_DATA_PATH, filename)
          : path.join(SKYSHARDS_DATA_PATH, "fusion_data.json"),
        hint: "You can set SKYSHARDS_DATA_PATH environment variable to point to your SkyShards data directory"
      }, null, 2);
    }

    throw error;
  }
}

async function listAvailableAttributes(): Promise<string> {
  const attributes = Object.entries(ATTRIBUTE_COMBINATIONS).map(([name, info]) => ({
    name: name,
    tier: info.tier,
    materials: info.materials,
    materialCount: info.materials.length
  }));

  attributes.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

  return JSON.stringify({
    totalAttributes: attributes.length,
    attributes: attributes,
    tiers: {
      tier1: attributes.filter(a => a.tier === 1),
      tier2: attributes.filter(a => a.tier === 2),
      tier3: attributes.filter(a => a.tier === 3)
    }
  }, null, 2);
}

// Skills & Levels functions
const SKILL_NAMES = ["farming", "mining", "combat", "foraging", "fishing", "enchanting", "alchemy", "taming", "dungeoneering", "carpentry", "runecrafting", "social"];

function calculateSkillLevel(exp: number, skillName: string): { level: number; currentExp: number; expToNext: number } {
  const levels = skillName === "runecrafting" ? 25 : skillName === "social" ? 25 : 50;

  const XP_TABLE = [
    50, 125, 200, 300, 500, 750, 1000, 1500, 2000, 3500,
    5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 200000,
    300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1100000, 1200000,
    1300000, 1400000, 1500000, 1600000, 1700000, 1800000, 1900000, 2000000, 2100000, 2200000,
    2300000, 2400000, 2500000, 2600000, 2750000, 2900000, 3100000, 3400000, 3700000, 4000000
  ];

  let totalExp = 0;
  let level = 0;

  for (let i = 0; i < Math.min(levels, XP_TABLE.length); i++) {
    if (exp >= totalExp + XP_TABLE[i]) {
      totalExp += XP_TABLE[i];
      level = i + 1;
    } else {
      break;
    }
  }

  const currentLevelExp = exp - totalExp;
  const expToNext = level < levels ? XP_TABLE[level] - currentLevelExp : 0;

  return { level, currentExp: currentLevelExp, expToNext };
}

async function getPlayerSkills(username: string, profileName?: string): Promise<string> {
  const profileData: SkyblockProfileResponse = await makeHypixelRequest(`/skyblock/profiles?name=${username}`);

  if (!profileData.success || !profileData.profiles || profileData.profiles.length === 0) {
    return `No Skyblock profiles found for "${username}"`;
  }

  const playerData: HypixelPlayerResponse = await makeHypixelRequest(`/player?name=${username}`);
  if (!playerData.success || !playerData.player) {
    return `Player "${username}" not found`;
  }

  const uuid = playerData.player.uuid;
  let profile = profileData.profiles[0];

  if (profileName) {
    const found = profileData.profiles.find(p => p.cute_name.toLowerCase() === profileName.toLowerCase());
    if (found) profile = found;
  }

  const member = profile.members[uuid];
  if (!member) {
    return `Member data not found in profile`;
  }

  const skills: Record<string, any> = {};
  let skillAverage = 0;
  let skillCount = 0;

  for (const skillName of SKILL_NAMES) {
    const expKey = `experience_skill_${skillName}`;
    const exp = member[expKey] || 0;

    if (exp > 0 && skillName !== "runecrafting" && skillName !== "social" && skillName !== "carpentry") {
      const skillInfo = calculateSkillLevel(exp, skillName);
      skills[skillName] = {
        level: skillInfo.level,
        exp: exp,
        currentLevelExp: skillInfo.currentExp,
        expToNextLevel: skillInfo.expToNext
      };
      skillAverage += skillInfo.level;
      skillCount++;
    } else if (exp > 0) {
      const skillInfo = calculateSkillLevel(exp, skillName);
      skills[skillName] = {
        level: skillInfo.level,
        exp: exp
      };
    }
  }

  const avgSkillLevel = skillCount > 0 ? skillAverage / skillCount : 0;

  return JSON.stringify({
    username: username,
    profile: profile.cute_name,
    skills: skills,
    skillAverage: Math.round(avgSkillLevel * 100) / 100,
    totalSkillExp: Object.values(skills).reduce((sum: number, s: any) => sum + (s.exp || 0), 0)
  }, null, 2);
}

// Slayer functions
async function getPlayerSlayers(username: string, profileName?: string): Promise<string> {
  const profileData: SkyblockProfileResponse = await makeHypixelRequest(`/skyblock/profiles?name=${username}`);

  if (!profileData.success || !profileData.profiles || profileData.profiles.length === 0) {
    return `No Skyblock profiles found for "${username}"`;
  }

  const playerData: HypixelPlayerResponse = await makeHypixelRequest(`/player?name=${username}`);
  if (!playerData.success || !playerData.player) {
    return `Player "${username}" not found`;
  }

  const uuid = playerData.player.uuid;
  let profile = profileData.profiles[0];

  if (profileName) {
    const found = profileData.profiles.find(p => p.cute_name.toLowerCase() === profileName.toLowerCase());
    if (found) profile = found;
  }

  const member = profile.members[uuid];
  if (!member || !member.slayer_bosses) {
    return JSON.stringify({
      username: username,
      profile: profile.cute_name,
      slayers: {},
      totalSlayerExp: 0
    }, null, 2);
  }

  const slayers: Record<string, any> = {};
  let totalExp = 0;

  for (const [slayerType, data] of Object.entries(member.slayer_bosses)) {
    const slayerData = data as any;
    const exp = slayerData.xp || 0;
    totalExp += exp;

    slayers[slayerType] = {
      exp: exp,
      level: Math.floor(exp / 5000),
      kills: slayerData.boss_kills_tier_0 + slayerData.boss_kills_tier_1 +
             slayerData.boss_kills_tier_2 + slayerData.boss_kills_tier_3 +
             (slayerData.boss_kills_tier_4 || 0)
    };
  }

  return JSON.stringify({
    username: username,
    profile: profile.cute_name,
    slayers: slayers,
    totalSlayerExp: totalExp
  }, null, 2);
}

// Dungeons functions
async function getPlayerDungeons(username: string, profileName?: string): Promise<string> {
  const profileData: SkyblockProfileResponse = await makeHypixelRequest(`/skyblock/profiles?name=${username}`);

  if (!profileData.success || !profileData.profiles || profileData.profiles.length === 0) {
    return `No Skyblock profiles found for "${username}"`;
  }

  const playerData: HypixelPlayerResponse = await makeHypixelRequest(`/player?name=${username}`);
  if (!playerData.success || !playerData.player) {
    return `Player "${username}" not found`;
  }

  const uuid = playerData.player.uuid;
  let profile = profileData.profiles[0];

  if (profileName) {
    const found = profileData.profiles.find(p => p.cute_name.toLowerCase() === profileName.toLowerCase());
    if (found) profile = found;
  }

  const member = profile.members[uuid];
  if (!member || !member.dungeons) {
    return JSON.stringify({
      username: username,
      profile: profile.cute_name,
      dungeons: { enabled: false }
    }, null, 2);
  }

  const dungeonData = member.dungeons;
  const classes: Record<string, any> = {};

  if (dungeonData.player_classes) {
    for (const [className, classData] of Object.entries(dungeonData.player_classes)) {
      const data = classData as any;
      classes[className] = {
        exp: data.experience || 0,
        level: Math.floor((data.experience || 0) / 50000)
      };
    }
  }

  const catacombs = dungeonData.dungeon_types?.catacombs || {};

  return JSON.stringify({
    username: username,
    profile: profile.cute_name,
    selectedClass: dungeonData.selected_dungeon_class || "none",
    classes: classes,
    catacombs: {
      level: catacombs.level || 0,
      exp: catacombs.experience || 0,
      highestFloor: catacombs.highest_tier_completed || 0
    },
    secrets: dungeonData.secrets_found || 0
  }, null, 2);
}

// Bazaar Flip Finder
async function findBazaarFlips(minProfit: number = 100000, minVolume: number = 1000): Promise<string> {
  const data: BazaarResponse = await makeHypixelRequest("/skyblock/bazaar");

  if (!data.success || !data.products) {
    return "Failed to fetch bazaar data";
  }

  const flips: Array<{
    item: string;
    buyPrice: number;
    sellPrice: number;
    profit: number;
    profitPercent: number;
    buyVolume: number;
    sellVolume: number;
  }> = [];

  for (const [itemId, product] of Object.entries(data.products)) {
    const buyPrice = product.quick_status.buyPrice;
    const sellPrice = product.quick_status.sellPrice;
    const buyVolume = product.quick_status.buyVolume;
    const sellVolume = product.quick_status.sellVolume;

    if (buyPrice > 0 && sellPrice > 0 && buyVolume >= minVolume && sellVolume >= minVolume) {
      const profit = sellPrice - buyPrice;
      const profitPercent = (profit / buyPrice) * 100;

      if (profit >= minProfit) {
        flips.push({
          item: itemId,
          buyPrice: Math.round(buyPrice),
          sellPrice: Math.round(sellPrice),
          profit: Math.round(profit),
          profitPercent: Math.round(profitPercent * 100) / 100,
          buyVolume: Math.round(buyVolume),
          sellVolume: Math.round(sellVolume)
        });
      }
    }
  }

  flips.sort((a, b) => b.profit - a.profit);

  return JSON.stringify({
    totalFlipsFound: flips.length,
    filters: {
      minProfit: minProfit,
      minVolume: minVolume
    },
    topFlips: flips.slice(0, 20)
  }, null, 2);
}

// Networth Calculator (basic)
async function calculateNetworth(username: string, profileName?: string): Promise<string> {
  const profileData: SkyblockProfileResponse = await makeHypixelRequest(`/skyblock/profiles?name=${username}`);

  if (!profileData.success || !profileData.profiles || profileData.profiles.length === 0) {
    return `No Skyblock profiles found for "${username}"`;
  }

  const playerData: HypixelPlayerResponse = await makeHypixelRequest(`/player?name=${username}`);
  if (!playerData.success || !playerData.player) {
    return `Player "${username}" not found`;
  }

  const uuid = playerData.player.uuid;
  let profile = profileData.profiles[0];

  if (profileName) {
    const found = profileData.profiles.find(p => p.cute_name.toLowerCase() === profileName.toLowerCase());
    if (found) profile = found;
  }

  const member = profile.members[uuid];
  if (!member) {
    return `Member data not found in profile`;
  }

  const purse = member.coin_purse || 0;
  const bank = profile.banking?.balance || 0;

  return JSON.stringify({
    username: username,
    profile: profile.cute_name,
    purse: Math.round(purse),
    bank: Math.round(bank),
    liquidCoins: Math.round(purse + bank),
    note: "Full networth calculation requires inventory analysis (not yet implemented)"
  }, null, 2);
}

const server = new Server(
  {
    name: "hypixel-skyblock-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_player",
        description: "Get Hypixel player statistics by username. Returns player info including network level, UUID, and login history.",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "The Minecraft username to look up",
            },
          },
          required: ["username"],
        },
      },
      {
        name: "get_skyblock_profile",
        description: "Get Skyblock profiles for a player. Returns all profiles with their names and member counts.",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "The Minecraft username to look up",
            },
          },
          required: ["username"],
        },
      },
      {
        name: "get_bazaar_prices",
        description: "Get current Bazaar prices. If item_id is provided, returns detailed info for that item. Otherwise returns top 20 items.",
        inputSchema: {
          type: "object",
          properties: {
            item_id: {
              type: "string",
              description: "Optional: Specific item ID to look up (e.g., 'ENCHANTED_DIAMOND', 'WHEAT')",
            },
          },
        },
      },
      {
        name: "get_auctions",
        description: "Get active auctions from the Auction House. Can filter by player name and page number.",
        inputSchema: {
          type: "object",
          properties: {
            player_name: {
              type: "string",
              description: "Optional: Filter auctions by player name",
            },
            page: {
              type: "number",
              description: "Optional: Page number (default: 0)",
            },
          },
        },
      },
      {
        name: "get_shard_prices",
        description: "Get current Bazaar prices for attribute shards. Can specify specific shard IDs or get all common shards.",
        inputSchema: {
          type: "object",
          properties: {
            shard_ids: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Optional: Array of shard IDs to check (e.g., ['ATTRIBUTE_SHARD', 'SPEED_ARTIFACT'])",
            },
          },
        },
      },
      {
        name: "calculate_fusion_cost",
        description: "Calculate the total cost to fuse a specific attribute using current Bazaar prices. Returns breakdown of materials needed.",
        inputSchema: {
          type: "object",
          properties: {
            attribute: {
              type: "string",
              description: "The attribute to calculate fusion cost for (e.g., 'SPEED', 'BLAZING_FORTUNE', 'LIFELINE')",
            },
          },
          required: ["attribute"],
        },
      },
      {
        name: "list_attributes",
        description: "List all available attributes that can be fused, organized by tier with material requirements.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "read_skyshards_data",
        description: "Read SkyShards fusion data from local storage. Requires SKYSHARDS_DATA_PATH to be configured.",
        inputSchema: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description: "Optional: Specific filename to read (default: fusion_data.json)",
            },
          },
        },
      },
      {
        name: "get_player_skills",
        description: "Get detailed skill levels and XP for a Skyblock player. Returns all skills with levels, current XP, and skill average.",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "The Minecraft username to look up",
            },
            profile_name: {
              type: "string",
              description: "Optional: Specific profile name (e.g., 'Coconut', 'Apple'). Uses first profile if not specified.",
            },
          },
          required: ["username"],
        },
      },
      {
        name: "get_player_slayers",
        description: "Get slayer boss statistics for a player. Returns XP, levels, and kills for all slayer types (zombie, spider, wolf, enderman, blaze).",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "The Minecraft username to look up",
            },
            profile_name: {
              type: "string",
              description: "Optional: Specific profile name. Uses first profile if not specified.",
            },
          },
          required: ["username"],
        },
      },
      {
        name: "get_player_dungeons",
        description: "Get dungeon statistics including class levels, catacombs progress, and secrets found.",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "The Minecraft username to look up",
            },
            profile_name: {
              type: "string",
              description: "Optional: Specific profile name. Uses first profile if not specified.",
            },
          },
          required: ["username"],
        },
      },
      {
        name: "find_bazaar_flips",
        description: "Find profitable items to flip in the Bazaar. Analyzes buy/sell prices and finds best opportunities for profit.",
        inputSchema: {
          type: "object",
          properties: {
            min_profit: {
              type: "number",
              description: "Optional: Minimum profit in coins (default: 100000)",
            },
            min_volume: {
              type: "number",
              description: "Optional: Minimum buy/sell volume (default: 1000)",
            },
          },
        },
      },
      {
        name: "calculate_networth",
        description: "Calculate basic networth for a player (purse + bank). Full inventory analysis coming soon.",
        inputSchema: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "The Minecraft username to look up",
            },
            profile_name: {
              type: "string",
              description: "Optional: Specific profile name. Uses first profile if not specified.",
            },
          },
          required: ["username"],
        },
      },
    ] as Tool[],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_player": {
        const username = String(args?.username);
        const result = await getPlayerByName(username);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_skyblock_profile": {
        const username = String(args?.username);
        const result = await getSkyblockProfile(username);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_bazaar_prices": {
        const itemId = args?.item_id ? String(args.item_id) : undefined;
        const result = await getBazaarPrices(itemId);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_auctions": {
        const playerName = args?.player_name ? String(args.player_name) : undefined;
        const page = args?.page ? Number(args.page) : 0;
        const result = await getActiveAuctions(playerName, page);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_shard_prices": {
        const shardIds = args?.shard_ids ? (args.shard_ids as string[]) : undefined;
        const result = await getShardPrices(shardIds);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "calculate_fusion_cost": {
        const attribute = String(args?.attribute);
        const result = await calculateFusionCost(attribute);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "list_attributes": {
        const result = await listAvailableAttributes();
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "read_skyshards_data": {
        const filename = args?.filename ? String(args.filename) : undefined;
        const result = await readSkyShardsData(filename);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_player_skills": {
        const username = String(args?.username);
        const profileName = args?.profile_name ? String(args.profile_name) : undefined;
        const result = await getPlayerSkills(username, profileName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_player_slayers": {
        const username = String(args?.username);
        const profileName = args?.profile_name ? String(args.profile_name) : undefined;
        const result = await getPlayerSlayers(username, profileName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_player_dungeons": {
        const username = String(args?.username);
        const profileName = args?.profile_name ? String(args.profile_name) : undefined;
        const result = await getPlayerDungeons(username, profileName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "find_bazaar_flips": {
        const minProfit = args?.min_profit ? Number(args.min_profit) : 100000;
        const minVolume = args?.min_volume ? Number(args.min_volume) : 1000;
        const result = await findBazaarFlips(minProfit, minVolume);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "calculate_networth": {
        const username = String(args?.username);
        const profileName = args?.profile_name ? String(args.profile_name) : undefined;
        const result = await calculateNetworth(username, profileName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Hypixel Skyblock MCP Server running on stdio");

  if (!HYPIXEL_API_KEY) {
    console.error("Warning: HYPIXEL_API_KEY environment variable not set. Some features may be limited.");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
