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
  (config: PlayerConfig) => PlayerConfig
> = {
  // Cursor radius improvement (repeatable)
  larger_cursor: (config: PlayerConfig) => ({
    ...config,
    cursorRadius: config.cursorRadius + 2, // +2 pixels per level
  }),
  
  // Speed improvements (repeatable, reduce cooldown)
  faster_swing: (config: PlayerConfig) => ({
    ...config,
    axeCooldownDuration: Math.max(0.1, config.axeCooldownDuration * 0.85), // 15% faster
  }),
  
  // Tree density improvements (repeatable)
  more_trees: (config: PlayerConfig) => ({
    ...config,
    treeDensity: Math.min(1.0, config.treeDensity + 0.05), // Increase by 5% (smaller increments)
  }),
  
  // Tree type unlocks
  unlock_strong_trees: (config: PlayerConfig) => ({
    ...config,
    strongTreesEnabled: true,
  }),
  unlock_ancient_trees: (config: PlayerConfig) => ({
    ...config,
    ancientTreesEnabled: true,
  }),
  
  // Tree respawn
  tree_respawn: (config: PlayerConfig) => ({
    ...config,
    treeRespawnEnabled: true,
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
  
  // Tree respawn
  tree_respawn: {
    id: "tree_respawn",
    name: "Tree Respawn",
    description: "Trees automatically respawn after being cut",
    baseCost: 30,
    category: "map",
    tier: 2,
    requires: "more_trees",
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
): ((config: PlayerConfig) => PlayerConfig) | undefined {
  return IMPROVEMENT_EFFECTS[improvementId];
}

/**
 * Get improvement data by ID
 */
export function getImprovementData(improvementId: string) {
  return IMPROVEMENTS_DATA[improvementId];
}
