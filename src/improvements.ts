/**
 * Improvements System
 *
 * Centralized location for all improvement definitions, including:
 * - Improvement metadata (name, description, cost, prerequisites)
 * - Improvement effects (how they modify PlayerConfig)
 */

import { PlayerConfig } from "./player-state";
import { Improvement } from "./improvements-menu";

export type ImprovementCategory = "cursor" | "map";

/**
 * Improvement effect functions
 * Each function takes the current config and returns a modified config
 */
export const IMPROVEMENT_EFFECTS: Record<
  string,
  (config: PlayerConfig, level: number) => PlayerConfig
> = {
  // Cursor radius improvement (repeatable)
  larger_cursor: (config: PlayerConfig, _level: number) => ({
    ...config,
    cursorRadius: config.cursorRadius + 2, // +2 pixels per level
  }),
  
  // Speed improvements (repeatable, reduce cooldown)
  faster_swing: (config: PlayerConfig, _level: number) => ({
    ...config,
    axeCooldownDuration: Math.max(0.1, config.axeCooldownDuration * 0.85), // 15% faster per level
  }),
  
  // Tree density improvements (repeatable)
  more_trees: (config: PlayerConfig, _level: number) => ({
    ...config,
    treeDensity: Math.min(1.0, config.treeDensity + 0.05), // +5% per level
  }),
  
  // Tree type unlocks
  unlock_strong_trees: (config: PlayerConfig, _level: number) => ({
    ...config,
    strongTreesEnabled: true,
  }),
  unlock_ancient_trees: (config: PlayerConfig, _level: number) => ({
    ...config,
    ancientTreesEnabled: true,
  }),
  
  // Tree respawn (repeatable, leveled)
  tree_respawn: (config: PlayerConfig, level: number) => {
    // First level enables respawn, subsequent levels reduce delay
    const baseDelay = 10.0; // Start with 10 seconds
    // Each level reduces delay by 20% (minimum 0.5 seconds)
    const delay = Math.max(0.5, baseDelay * Math.pow(0.8, level - 1));
    return {
      ...config,
      treeRespawnEnabled: true,
      treeRespawnDelay: delay,
    };
  },
  
  // Flashlight unlock (one-time)
  flashlight: (config: PlayerConfig, _level: number) => ({
    ...config,
    flashlightEnabled: true,
  }),
  
  // Flashlight speed improvement (repeatable)
  flashlight_speed: (config: PlayerConfig, _level: number) => {
    const baseInterval = 5.0; // Base interval
    // Each level reduces interval by 15% (minimum 0.5 seconds)
    const currentInterval = config.flashlightInterval || baseInterval;
    return {
      ...config,
      flashlightInterval: Math.max(0.5, currentInterval * 0.85),
    };
  },
  
  // Flashlight count improvement (repeatable)
  flashlight_count: (config: PlayerConfig, _level: number) => ({
    ...config,
    flashlightCount: config.flashlightCount + 1, // +1 tree per flash per level
  }),
  
  // Flashlight power improvement (repeatable)
  flashlight_power: (config: PlayerConfig, _level: number) => ({
    ...config,
    flashlightPower: config.flashlightPower + 1, // +1 damage per level
  }),
  
  // Cursor hit damage improvement (repeatable, leveled)
  stronger_hit: (config: PlayerConfig, _level: number) => ({
    ...config,
    cursorHitDamage: config.cursorHitDamage + 1, // +1 damage per level
  }),
};

/**
 * Improvement definitions with metadata
 */
export const IMPROVEMENTS_DATA: Record<
  string,
  {
    id: string;
    name: string;
    description: string;
    baseCost: number;
    costScaling?: number; // only for repeatable upgrades
    requires?: string; // ID of required improvement
    repeatable?: boolean;
    category: ImprovementCategory;
    tier: number; // for tree layout
  }
> = {
  // Cursor radius improvement (repeatable)
  larger_cursor: {
    id: "larger_cursor",
    name: "Larger Cursor",
    description: "Increases cursor size by 2 pixels",
    baseCost: 3,
    costScaling: 1.4,
    repeatable: true,
    category: "cursor",
    tier: 1,
  },
  
  // Speed improvements
  faster_swing: {
    id: "faster_swing",
    name: "Faster Swing",
    description: "Reduces cooldown by 15%",
    baseCost: 5,
    costScaling: 1.5,
    repeatable: true,
    category: "cursor",
    tier: 2,
  },
  
  // Tree density improvements
  more_trees: {
    id: "more_trees",
    name: "More Trees",
    description: "Increases tree density by 5%",
    baseCost: 4,
    costScaling: 1.4,
    repeatable: true,
    category: "map",
    tier: 1,
  },
  
  // Tree type unlocks
  unlock_strong_trees: {
    id: "unlock_strong_trees",
    name: "Strong Trees",
    description: "Unlocks strong trees (6 health, 6 wood)",
    baseCost: 25,
    category: "map",
    tier: 3,
    requires: "more_trees",
  },
  unlock_ancient_trees: {
    id: "unlock_ancient_trees",
    name: "Ancient Trees",
    description: "Unlocks ancient trees (10 health, 10 wood)",
    baseCost: 50,
    category: "map",
    tier: 4,
    requires: "unlock_strong_trees",
  },
  
  // Tree respawn (repeatable, leveled)
  tree_respawn: {
    id: "tree_respawn",
    name: "Tree Respawn",
    description: "Trees automatically respawn after being cut (faster with each level)",
    baseCost: 30,
    costScaling: 1.5,
    repeatable: true,
    category: "map",
    tier: 2,
    requires: "more_trees",
  },
  
  // Flashlight unlock (one-time)
  flashlight: {
    id: "flashlight",
    name: "Flashlight",
    description: "Unlocks flashlight that periodically hits random trees on the map",
    baseCost: 40,
    category: "cursor",
    tier: 3,
    requires: "faster_swing",
  },
  
  // Flashlight speed improvement
  flashlight_speed: {
    id: "flashlight_speed",
    name: "Flashlight Speed",
    description: "Reduces flashlight interval by 15%",
    baseCost: 15,
    costScaling: 1.5,
    repeatable: true,
    category: "cursor",
    tier: 4,
    requires: "flashlight",
  },
  
  // Flashlight count improvement
  flashlight_count: {
    id: "flashlight_count",
    name: "Flashlight Count",
    description: "Increases number of trees hit per flash by 1",
    baseCost: 20,
    costScaling: 1.6,
    repeatable: true,
    category: "cursor",
    tier: 4,
    requires: "flashlight",
  },
  
  // Flashlight power improvement
  flashlight_power: {
    id: "flashlight_power",
    name: "Flashlight Power",
    description: "Increases flashlight damage by 1",
    baseCost: 25,
    costScaling: 1.5,
    repeatable: true,
    category: "cursor",
    tier: 4,
    requires: "flashlight",
  },
  
  // Cursor hit damage improvement
  stronger_hit: {
    id: "stronger_hit",
    name: "Stronger Hit",
    description: "Increases damage per hit by 1",
    baseCost: 8,
    costScaling: 1.4,
    repeatable: true,
    category: "cursor",
    tier: 1,
  },
};

export function getImprovementNextCost(
  improvementId: string,
  currentLevel: number
): number {
  const data = IMPROVEMENTS_DATA[improvementId];
  if (!data) return 999999;
  if (!data.repeatable) return data.baseCost;

  const scaling = data.costScaling ?? 1.6;
  const cost = data.baseCost * Math.pow(scaling, currentLevel);
  return Math.max(1, Math.round(cost));
}

/**
 * Get all improvements as Improvement array for the menu
 */
export function getAllImprovements(): Improvement[] {
  return Object.values(IMPROVEMENTS_DATA).map((data) => ({
    id: data.id,
    name: data.name,
    description: data.description,
    cost: getImprovementNextCost(data.id, 0),
    purchased: false, // Will be updated by the menu system
    requires: data.requires,
    repeatable: data.repeatable,
    level: 0,
    category: data.category,
    tier: data.tier,
  }));
}

/**
 * Get improvement effect by ID
 */
export function getImprovementEffect(
  improvementId: string
): ((config: PlayerConfig, level: number) => PlayerConfig) | undefined {
  return IMPROVEMENT_EFFECTS[improvementId];
}

/**
 * Get improvement data by ID
 */
export function getImprovementData(improvementId: string) {
  return IMPROVEMENTS_DATA[improvementId];
}
