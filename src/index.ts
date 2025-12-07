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

// SkyShards related functions - COMPLETE ATTRIBUTE SYSTEM
const ATTRIBUTE_SHARDS = [
  // Base Shards
  "ATTRIBUTE_SHARD",

  // Common Tier Shards
  "NATURE_ELEMENTAL", "FOG_ELEMENTAL", "LIGHT_ELEMENTAL",
  "NOCTURNAL_ANIMAL", "CHEAPSTAKE", "MOONGLADE_MASTERY",
  "FISHERMAN", "EXPERIENCE", "MOSSY_BOX",
  "FOREST_FISHING", "SKELETAL_RULER", "CREATURE_FISHER",
  "ARTHROPOD_RESISTANCE", "HAPPY_BOX", "YUMMY",
  "UNDEAD_RESISTANCE", "FIG_SHARPENING", "UNITY_IS_STRENGTH",
  "ENDER_RESISTANCE", "BUCKET_LOVER", "TREE_LURKER",
  "VISITOR_BAIT", "MIDAS_TOUCH", "FOREST_STRENGTH",
  "BLAZING_RESISTANCE", "YOG_MEMBRANE", "OWL_FRIEND",
  "DECENT_KARMA", "ROTTEN_PICKAXE", "MYTHOLOGICAL_RESISTANCE",

  // Uncommon Tier Shards
  "WOOD_ELEMENTAL", "WATER_ELEMENTAL", "STONE_ELEMENTAL",
  "FIG_COLLECTOR", "GOLD_BAIT", "MOUNTAIN_CLIMBER",
  "BIGGER_BOX", "GOOD_KARMA", "ECHO_OF_BOXES",
  "PEST_LUCK", "FOREST_TRAP", "MANA_STEAL",
  "DRAGON_SHORTBOW_IMPROVEMENT", "MANGROVE_SHARPENING", "SPEED",
  "LOST_AND_FOUND", "HUNTERS_FANG", "INSECT_POWER",
  "UNDEAD_RULER", "STRONG_ARMS", "LIFE_RECOVERY",
  "MANGROVE_COLLECTOR", "SPIRIT_AXE", "COMBO",
  "STRONG_LEGS", "INFECTION", "ARTHROPOD_RULER",
  "KATS_FAVORITE", "ENDER_RULER", "MAGMATIC_RULER",
  "BATTLE_FROG", "INFILTRATION",

  // Rare Tier Shards
  "FOREST_ELEMENTAL", "TORRENT_ELEMENTAL", "LIGHTNING_ELEMENTAL",
  "ANIMAL_EXPERTISE", "FROG_LEGS", "ESSENCE_OF_ICE",
  "BEACON_ZEALOT", "GREAT_KARMA",

  // Gear/Stats Shards
  "MANA_POOL", "VITALITY", "DEFENSE",
  "HEALTH", "TRUE_DEFENSE", "FEROCITY",
  "ATTACK_SPEED", "SWING_RANGE", "BREEZE",
  "LIFELINE", "MANA_REGENERATION", "BLAZING_FORTUNE",
  "FISHING_EXPERIENCE", "DOUBLE_HOOK", "TROPHY_HUNTER",
  "DOMINANCE", "VETERAN", "CHAMPION",
  "FORTITUDE", "MAGIC_FIND", "ARACHNO",
  "ARACHNO_RESISTANCE", "BLAZE", "BLAZE_RESISTANCE",
  "UNDEAD", "ENDER", "SPEED_ARTIFACT",
  "MANA_POOL_ARTIFACT", "VITALITY_ARTIFACT",
  "LIFELINE_ARTIFACT", "MANA_REGENERATION_ARTIFACT",
  "BLAZING_FORTUNE_ARTIFACT", "FISHING_EXPERIENCE_ARTIFACT",
  "DOUBLE_HOOK_ARTIFACT", "TROPHY_HUNTER_ARTIFACT"
];

// Complete attribute combinations with tiers and fusion requirements
const ATTRIBUTE_COMBINATIONS: Record<string, { tier: number; materials: string[]; category?: string }> = {
  // Tier 1 - Base Stats
  "SPEED": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "stats" },
  "MANA_POOL": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "stats" },
  "VITALITY": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "stats" },
  "DEFENSE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "stats" },
  "HEALTH": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "stats" },
  "TRUE_DEFENSE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "stats" },
  "FEROCITY": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "stats" },
  "ATTACK_SPEED": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "stats" },
  "SWING_RANGE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "stats" },
  "BREEZE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "stats" },

  // Tier 2 - Basic Combinations
  "LIFELINE": { tier: 2, materials: ["SPEED", "VITALITY"], category: "combined" },
  "MANA_REGENERATION": { tier: 2, materials: ["SPEED", "MANA_POOL"], category: "combined" },
  "FISHING_EXPERIENCE": { tier: 2, materials: ["MANA_POOL", "VITALITY"], category: "combined" },
  "DOMINANCE": { tier: 2, materials: ["FEROCITY", "HEALTH"], category: "combined" },
  "VETERAN": { tier: 2, materials: ["DEFENSE", "SPEED"], category: "combined" },
  "FORTITUDE": { tier: 2, materials: ["HEALTH", "DEFENSE"], category: "combined" },

  // Tier 3 - Advanced Combinations
  "BLAZING_FORTUNE": { tier: 3, materials: ["SPEED", "MANA_POOL", "VITALITY"], category: "advanced" },
  "DOUBLE_HOOK": { tier: 3, materials: ["FISHING_EXPERIENCE", "SPEED"], category: "advanced" },
  "TROPHY_HUNTER": { tier: 3, materials: ["FISHING_EXPERIENCE", "VITALITY"], category: "advanced" },
  "CHAMPION": { tier: 3, materials: ["DOMINANCE", "DEFENSE"], category: "advanced" },
  "MAGIC_FIND": { tier: 3, materials: ["BREEZE", "MANA_POOL", "VITALITY"], category: "advanced" },

  // Combat Attributes
  "ARACHNO": { tier: 2, materials: ["ATTACK_SPEED", "FEROCITY"], category: "combat" },
  "ARACHNO_RESISTANCE": { tier: 2, materials: ["DEFENSE", "VITALITY"], category: "combat" },
  "BLAZE": { tier: 2, materials: ["ATTACK_SPEED", "VITALITY"], category: "combat" },
  "BLAZE_RESISTANCE": { tier: 2, materials: ["TRUE_DEFENSE", "HEALTH"], category: "combat" },
  "UNDEAD": { tier: 2, materials: ["FEROCITY", "VITALITY"], category: "combat" },
  "ENDER": { tier: 2, materials: ["HEALTH", "MANA_POOL"], category: "combat" },

  // Elemental Attributes - Common
  "NATURE_ELEMENTAL": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "elemental" },
  "FOG_ELEMENTAL": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "elemental" },
  "LIGHT_ELEMENTAL": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "elemental" },

  // Elemental Attributes - Uncommon
  "WOOD_ELEMENTAL": { tier: 2, materials: ["NATURE_ELEMENTAL", "ATTRIBUTE_SHARD"], category: "elemental" },
  "WATER_ELEMENTAL": { tier: 2, materials: ["FOG_ELEMENTAL", "ATTRIBUTE_SHARD"], category: "elemental" },
  "STONE_ELEMENTAL": { tier: 2, materials: ["LIGHT_ELEMENTAL", "ATTRIBUTE_SHARD"], category: "elemental" },

  // Elemental Attributes - Rare
  "FOREST_ELEMENTAL": { tier: 3, materials: ["WOOD_ELEMENTAL", "NATURE_ELEMENTAL"], category: "elemental" },
  "TORRENT_ELEMENTAL": { tier: 3, materials: ["WATER_ELEMENTAL", "FOG_ELEMENTAL"], category: "elemental" },
  "LIGHTNING_ELEMENTAL": { tier: 3, materials: ["STONE_ELEMENTAL", "LIGHT_ELEMENTAL"], category: "elemental" },

  // Special/Utility Attributes
  "MOONGLADE_MASTERY": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "utility" },
  "FISHERMAN": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "utility" },
  "EXPERIENCE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "utility" },
  "MIDAS_TOUCH": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "utility" },
  "MANA_STEAL": { tier: 2, materials: ["MANA_POOL", "ATTACK_SPEED"], category: "utility" },
  "LIFE_RECOVERY": { tier: 2, materials: ["HEALTH", "MANA_REGENERATION"], category: "utility" },
  "COMBO": { tier: 2, materials: ["ATTACK_SPEED", "FEROCITY"], category: "utility" },

  // Resistance Attributes
  "ARTHROPOD_RESISTANCE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "resistance" },
  "UNDEAD_RESISTANCE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "resistance" },
  "ENDER_RESISTANCE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "resistance" },
  "BLAZING_RESISTANCE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "resistance" },
  "MYTHOLOGICAL_RESISTANCE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "resistance" },

  // Ruler Attributes
  "SKELETAL_RULER": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "ruler" },
  "UNDEAD_RULER": { tier: 2, materials: ["UNDEAD_RESISTANCE", "HEALTH"], category: "ruler" },
  "ARTHROPOD_RULER": { tier: 2, materials: ["ARTHROPOD_RESISTANCE", "ATTACK_SPEED"], category: "ruler" },
  "ENDER_RULER": { tier: 2, materials: ["ENDER_RESISTANCE", "MANA_POOL"], category: "ruler" },
  "MAGMATIC_RULER": { tier: 2, materials: ["BLAZING_RESISTANCE", "FEROCITY"], category: "ruler" },

  // Animal/Creature Attributes
  "NOCTURNAL_ANIMAL": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "creature" },
  "CREATURE_FISHER": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "creature" },
  "OWL_FRIEND": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "creature" },
  "ANIMAL_EXPERTISE": { tier: 3, materials: ["NOCTURNAL_ANIMAL", "OWL_FRIEND", "SPEED"], category: "creature" },
  "BATTLE_FROG": { tier: 2, materials: ["FEROCITY", "HEALTH"], category: "creature" },
  "FROG_LEGS": { tier: 3, materials: ["BATTLE_FROG", "SPEED"], category: "creature" },

  // Karma Attributes
  "DECENT_KARMA": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "karma" },
  "GOOD_KARMA": { tier: 2, materials: ["DECENT_KARMA", "MANA_POOL"], category: "karma" },
  "GREAT_KARMA": { tier: 3, materials: ["GOOD_KARMA", "DECENT_KARMA"], category: "karma" },

  // Box/Storage Attributes
  "HAPPY_BOX": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "storage" },
  "MOSSY_BOX": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "storage" },
  "BIGGER_BOX": { tier: 2, materials: ["HAPPY_BOX", "MOSSY_BOX"], category: "storage" },
  "ECHO_OF_BOXES": { tier: 2, materials: ["HAPPY_BOX", "BIGGER_BOX"], category: "storage" },

  // Gathering/Collection Attributes
  "FIG_SHARPENING": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "gathering" },
  "FIG_COLLECTOR": { tier: 2, materials: ["FIG_SHARPENING", "EXPERIENCE"], category: "gathering" },
  "MANGROVE_SHARPENING": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "gathering" },
  "MANGROVE_COLLECTOR": { tier: 2, materials: ["MANGROVE_SHARPENING", "EXPERIENCE"], category: "gathering" },
  "FOREST_FISHING": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "gathering" },
  "FOREST_TRAP": { tier: 2, materials: ["FOREST_FISHING", "SPEED"], category: "gathering" },
  "FOREST_STRENGTH": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "gathering" },

  // Miscellaneous Special Attributes
  "PEST_LUCK": { tier: 2, materials: ["MAGIC_FIND", "SPEED"], category: "special" },
  "LOST_AND_FOUND": { tier: 2, materials: ["MAGIC_FIND", "FISHING_EXPERIENCE"], category: "special" },
  "HUNTERS_FANG": { tier: 2, materials: ["FEROCITY", "ATTACK_SPEED"], category: "special" },
  "INSECT_POWER": { tier: 2, materials: ["ARTHROPOD_RESISTANCE", "FEROCITY"], category: "special" },
  "STRONG_ARMS": { tier: 2, materials: ["ATTACK_SPEED", "HEALTH"], category: "special" },
  "STRONG_LEGS": { tier: 2, materials: ["SPEED", "HEALTH"], category: "special" },
  "SPIRIT_AXE": { tier: 2, materials: ["ATTACK_SPEED", "MANA_POOL"], category: "special" },
  "INFECTION": { tier: 2, materials: ["HEALTH", "UNDEAD"], category: "special" },
  "KATS_FAVORITE": { tier: 2, materials: ["SPEED", "MANA_POOL"], category: "special" },
  "INFILTRATION": { tier: 2, materials: ["SPEED", "VITALITY"], category: "special" },
  "MOUNTAIN_CLIMBER": { tier: 2, materials: ["DEFENSE", "SPEED"], category: "special" },
  "GOLD_BAIT": { tier: 2, materials: ["MIDAS_TOUCH", "FISHING_EXPERIENCE"], category: "special" },
  "DRAGON_SHORTBOW_IMPROVEMENT": { tier: 2, materials: ["ATTACK_SPEED", "FEROCITY"], category: "special" },
  "UNITY_IS_STRENGTH": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "special" },
  "BUCKET_LOVER": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "special" },
  "TREE_LURKER": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "special" },
  "VISITOR_BAIT": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "special" },
  "YUMMY": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "special" },
  "ROTTEN_PICKAXE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "special" },
  "YOG_MEMBRANE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "special" },
  "CHEAPSTAKE": { tier: 1, materials: ["ATTRIBUTE_SHARD"], category: "special" },
  "ESSENCE_OF_ICE": { tier: 3, materials: ["WATER_ELEMENTAL", "MANA_POOL", "VITALITY"], category: "special" },
  "BEACON_ZEALOT": { tier: 3, materials: ["MOONGLADE_MASTERY", "SPEED", "MANA_POOL"], category: "special" }
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
    materialCount: info.materials.length,
    category: info.category || "uncategorized"
  }));

  attributes.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));

  // Group by category
  const byCategory: Record<string, any[]> = {};
  attributes.forEach(attr => {
    if (!byCategory[attr.category]) {
      byCategory[attr.category] = [];
    }
    byCategory[attr.category].push(attr);
  });

  return JSON.stringify({
    totalAttributes: attributes.length,
    totalShards: ATTRIBUTE_SHARDS.length,
    byTier: {
      tier1: attributes.filter(a => a.tier === 1).length,
      tier2: attributes.filter(a => a.tier === 2).length,
      tier3: attributes.filter(a => a.tier === 3).length
    },
    byCategory: Object.keys(byCategory).map(cat => ({
      category: cat,
      count: byCategory[cat].length,
      attributes: byCategory[cat].map(a => a.name)
    })),
    categories: {
      stats: attributes.filter(a => a.category === "stats"),
      combat: attributes.filter(a => a.category === "combat"),
      elemental: attributes.filter(a => a.category === "elemental"),
      utility: attributes.filter(a => a.category === "utility"),
      resistance: attributes.filter(a => a.category === "resistance"),
      ruler: attributes.filter(a => a.category === "ruler"),
      creature: attributes.filter(a => a.category === "creature"),
      karma: attributes.filter(a => a.category === "karma"),
      storage: attributes.filter(a => a.category === "storage"),
      gathering: attributes.filter(a => a.category === "gathering"),
      special: attributes.filter(a => a.category === "special"),
      combined: attributes.filter(a => a.category === "combined"),
      advanced: attributes.filter(a => a.category === "advanced")
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

// Collections System
async function getPlayerCollections(username: string, profileName?: string): Promise<string> {
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

  const collections = member.collection || {};
  const collectionsByCategory: Record<string, any> = {
    farming: {},
    mining: {},
    combat: {},
    foraging: {},
    fishing: {}
  };

  for (const [itemId, amount] of Object.entries(collections)) {
    const item = String(itemId);
    const value = Number(amount);

    if (item.includes("WHEAT") || item.includes("CARROT") || item.includes("POTATO") || item.includes("PUMPKIN") || item.includes("MELON") || item.includes("MUSHROOM") || item.includes("CACTUS") || item.includes("SUGAR")) {
      collectionsByCategory.farming[item] = value;
    } else if (item.includes("COBBLESTONE") || item.includes("COAL") || item.includes("IRON") || item.includes("GOLD") || item.includes("DIAMOND") || item.includes("LAPIS") || item.includes("EMERALD") || item.includes("REDSTONE") || item.includes("QUARTZ") || item.includes("OBSIDIAN") || item.includes("GLOWSTONE") || item.includes("GRAVEL") || item.includes("SAND") || item.includes("NETHERRACK")) {
      collectionsByCategory.mining[item] = value;
    } else if (item.includes("ROTTEN") || item.includes("BONE") || item.includes("STRING") || item.includes("SPIDER") || item.includes("SLIME") || item.includes("GUNPOWDER") || item.includes("ENDER") || item.includes("GHAST") || item.includes("BLAZE") || item.includes("MAGMA")) {
      collectionsByCategory.combat[item] = value;
    } else if (item.includes("LOG") || item.includes("WOOD")) {
      collectionsByCategory.foraging[item] = value;
    } else if (item.includes("FISH") || item.includes("SALMON") || item.includes("CLOWNFISH") || item.includes("PUFFERFISH") || item.includes("PRISMARINE") || item.includes("INK") || item.includes("LILY") || item.includes("SPONGE")) {
      collectionsByCategory.fishing[item] = value;
    }
  }

  const totalCollections = Object.keys(collections).length;

  return JSON.stringify({
    username: username,
    profile: profile.cute_name,
    totalCollections: totalCollections,
    collectionsByCategory: collectionsByCategory,
    topCollections: Object.entries(collections)
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .slice(0, 10)
      .map(([item, amount]) => ({ item, amount }))
  }, null, 2);
}

// Pets System
async function getPlayerPets(username: string, profileName?: string): Promise<string> {
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
  if (!member || !member.pets) {
    return JSON.stringify({
      username: username,
      profile: profile.cute_name,
      pets: [],
      totalPets: 0
    }, null, 2);
  }

  const pets = member.pets.map((pet: any) => ({
    type: pet.type,
    tier: pet.tier,
    exp: pet.exp || 0,
    active: pet.active || false,
    heldItem: pet.heldItem || null,
    candyUsed: pet.candyUsed || 0
  }));

  const petsByRarity: Record<string, number> = {};
  pets.forEach((pet: any) => {
    petsByRarity[pet.tier] = (petsByRarity[pet.tier] || 0) + 1;
  });

  return JSON.stringify({
    username: username,
    profile: profile.cute_name,
    totalPets: pets.length,
    petsByRarity: petsByRarity,
    activePet: pets.find((p: any) => p.active) || null,
    pets: pets.slice(0, 20)
  }, null, 2);
}

// Fairy Souls
async function getFairySouls(username: string, profileName?: string): Promise<string> {
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

  const fairySouls = member.fairy_souls_collected || 0;
  const maxFairySouls = 247; // Total fairy souls in the game
  const percentage = (fairySouls / maxFairySouls) * 100;

  return JSON.stringify({
    username: username,
    profile: profile.cute_name,
    fairySoulsCollected: fairySouls,
    maxFairySouls: maxFairySouls,
    remaining: maxFairySouls - fairySouls,
    percentageComplete: Math.round(percentage * 100) / 100
  }, null, 2);
}

// Jacob's Contests
async function getJacobsData(username: string, profileName?: string): Promise<string> {
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
  if (!member || !member.jacob2) {
    return JSON.stringify({
      username: username,
      profile: profile.cute_name,
      medals: { gold: 0, silver: 0, bronze: 0 },
      perks: {},
      contests: {}
    }, null, 2);
  }

  const jacobData = member.jacob2;
  const medals = jacobData.medals_inv || { gold: 0, silver: 0, bronze: 0 };
  const perks = jacobData.perks || {};
  const contests = jacobData.contests || {};

  return JSON.stringify({
    username: username,
    profile: profile.cute_name,
    medals: medals,
    totalMedals: (medals.gold || 0) + (medals.silver || 0) + (medals.bronze || 0),
    perks: perks,
    contestsParticipated: Object.keys(contests).length
  }, null, 2);
}

// Museum
async function getMuseumData(username: string, profileName?: string): Promise<string> {
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
  if (!member || !member.museum) {
    return JSON.stringify({
      username: username,
      profile: profile.cute_name,
      itemsDonated: 0,
      value: 0
    }, null, 2);
  }

  const museum = member.museum;
  const itemsDonated = Object.keys(museum.items || {}).length;
  const museumValue = museum.value || 0;

  return JSON.stringify({
    username: username,
    profile: profile.cute_name,
    itemsDonated: itemsDonated,
    value: museumValue,
    items: museum.items || {}
  }, null, 2);
}

// Guild Statistics
async function getGuildStats(guildName: string): Promise<string> {
  const guildData = await makeHypixelRequest(`/guild?name=${encodeURIComponent(guildName)}`);

  if (!guildData.success || !guildData.guild) {
    return `Guild "${guildName}" not found`;
  }

  const guild = guildData.guild;

  return JSON.stringify({
    name: guild.name,
    tag: guild.tag || null,
    level: guild.level || 0,
    exp: guild.exp || 0,
    members: guild.members.length,
    created: new Date(guild.created).toISOString(),
    description: guild.description || "",
    preferredGames: guild.preferredGames || [],
    publiclyListed: guild.publiclyListed || false
  }, null, 2);
}

// Minion Calculator (production estimates)
const MINION_PRODUCTION: Record<string, { itemsPerHour: number; sellPrice: number }> = {
  "WHEAT": { itemsPerHour: 480, sellPrice: 2 },
  "CARROT": { itemsPerHour: 480, sellPrice: 2 },
  "POTATO": { itemsPerHour: 480, sellPrice: 2 },
  "COBBLESTONE": { itemsPerHour: 240, sellPrice: 3 },
  "SNOW": { itemsPerHour: 240, sellPrice: 1 },
  "CLAY": { itemsPerHour: 160, sellPrice: 3 },
  "DIAMOND": { itemsPerHour: 64, sellPrice: 8 },
  "OBSIDIAN": { itemsPerHour: 160, sellPrice: 10 }
};

async function calculateMinionProfit(minionType: string, tier: number = 11): Promise<string> {
  const minionData = MINION_PRODUCTION[minionType.toUpperCase()];

  if (!minionData) {
    return `Minion type "${minionType}" not found. Available: ${Object.keys(MINION_PRODUCTION).join(", ")}`;
  }

  const tierMultiplier = 1 + (tier - 1) * 0.05;
  const itemsPerHour = minionData.itemsPerHour * tierMultiplier;
  const profitPerHour = itemsPerHour * minionData.sellPrice;
  const profitPerDay = profitPerHour * 24;

  return JSON.stringify({
    minionType: minionType.toUpperCase(),
    tier: tier,
    itemsPerHour: Math.round(itemsPerHour),
    profitPerHour: Math.round(profitPerHour),
    profitPerDay: Math.round(profitPerDay),
    profitPerWeek: Math.round(profitPerDay * 7),
    note: "Estimates based on base production rates. Actual rates may vary with fuel and upgrades."
  }, null, 2);
}

// Item Price Comparison
async function compareItemPrices(itemId: string): Promise<string> {
  const data: BazaarResponse = await makeHypixelRequest("/skyblock/bazaar");

  if (!data.success || !data.products) {
    return "Failed to fetch bazaar data";
  }

  const product = data.products[itemId.toUpperCase()];

  if (!product) {
    return `Item "${itemId}" not found in bazaar`;
  }

  return JSON.stringify({
    item: itemId.toUpperCase(),
    bazaarBuyPrice: product.quick_status.buyPrice,
    bazaarSellPrice: product.quick_status.sellPrice,
    spread: product.quick_status.buyPrice - product.quick_status.sellPrice,
    spreadPercent: ((product.quick_status.buyPrice - product.quick_status.sellPrice) / product.quick_status.buyPrice) * 100,
    instantBuy: product.quick_status.sellPrice,
    instantSell: product.quick_status.buyPrice,
    recommendation: product.quick_status.buyPrice - product.quick_status.sellPrice > 1000
      ? "Good flip opportunity"
      : "Low profit margin"
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
      {
        name: "get_player_collections",
        description: "Get collection statistics for a player. Returns all collections organized by category (farming, mining, combat, foraging, fishing).",
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
        name: "get_player_pets",
        description: "Get all pets owned by a player. Returns pet types, rarities, levels, and active pet.",
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
        name: "get_fairy_souls",
        description: "Get fairy souls collection progress. Returns total collected, remaining, and completion percentage.",
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
        name: "get_jacobs_data",
        description: "Get Jacob's farming contest statistics. Returns medals won, perks unlocked, and contests participated.",
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
        name: "get_museum_data",
        description: "Get museum donation statistics. Returns items donated and museum value.",
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
        name: "get_guild_stats",
        description: "Get statistics for a guild by name. Returns member count, level, exp, and creation date.",
        inputSchema: {
          type: "object",
          properties: {
            guild_name: {
              type: "string",
              description: "The name of the guild to look up",
            },
          },
          required: ["guild_name"],
        },
      },
      {
        name: "calculate_minion_profit",
        description: "Calculate estimated profit for a minion type and tier. Returns items per hour and profit estimates.",
        inputSchema: {
          type: "object",
          properties: {
            minion_type: {
              type: "string",
              description: "Type of minion (e.g., 'WHEAT', 'DIAMOND', 'COBBLESTONE')",
            },
            tier: {
              type: "number",
              description: "Optional: Minion tier (1-12, default: 11)",
            },
          },
          required: ["minion_type"],
        },
      },
      {
        name: "compare_item_prices",
        description: "Compare buy and sell prices for an item in the Bazaar. Returns spread analysis and flip recommendations.",
        inputSchema: {
          type: "object",
          properties: {
            item_id: {
              type: "string",
              description: "The item ID to compare (e.g., 'ENCHANTED_DIAMOND')",
            },
          },
          required: ["item_id"],
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

      case "get_player_collections": {
        const username = String(args?.username);
        const profileName = args?.profile_name ? String(args.profile_name) : undefined;
        const result = await getPlayerCollections(username, profileName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_player_pets": {
        const username = String(args?.username);
        const profileName = args?.profile_name ? String(args.profile_name) : undefined;
        const result = await getPlayerPets(username, profileName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_fairy_souls": {
        const username = String(args?.username);
        const profileName = args?.profile_name ? String(args.profile_name) : undefined;
        const result = await getFairySouls(username, profileName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_jacobs_data": {
        const username = String(args?.username);
        const profileName = args?.profile_name ? String(args.profile_name) : undefined;
        const result = await getJacobsData(username, profileName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_museum_data": {
        const username = String(args?.username);
        const profileName = args?.profile_name ? String(args.profile_name) : undefined;
        const result = await getMuseumData(username, profileName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "get_guild_stats": {
        const guildName = String(args?.guild_name);
        const result = await getGuildStats(guildName);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "calculate_minion_profit": {
        const minionType = String(args?.minion_type);
        const tier = args?.tier ? Number(args.tier) : 11;
        const result = await calculateMinionProfit(minionType, tier);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "compare_item_prices": {
        const itemId = String(args?.item_id);
        const result = await compareItemPrices(itemId);
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
