/**
 * Improvements System
 *
 * Centralized location for all improvement definitions, including:
 * - Improvement metadata (name, description, cost, prerequisites)
 * - Improvement effects (how they modify PlayerConfig)
 */

import { PlayerConfig } from "./player-state";
import { Improvement } from "./improvements-menu";

export type ImprovementCategory = "axe" | "wagon";

/**
 * Improvement effect functions
 * Each function takes the current config and returns a modified config
 */
export const IMPROVEMENT_EFFECTS: Record<
  string,
  (config: PlayerConfig) => PlayerConfig
> = {
  // Roots (unlocked by default)
  axe_root: (config: PlayerConfig) => ({ ...config }),
  wagon_root: (config: PlayerConfig) => ({ ...config }),

  improved_axe: (config: PlayerConfig) => ({
    ...config,
    axeCooldownDuration: config.axeCooldownDuration * 0.5,
  }),
  sharpened_blade: (config: PlayerConfig) => ({
    ...config,
    treeMaxHealth: 2, // Reduce tree health from 3 to 2
  }),
  area_chop: (config: PlayerConfig) => ({
    ...config,
    areaChopEnabled: true,
  }),
  backpack_upgrade: (config: PlayerConfig) => ({
    ...config,
    woodInventoryCapacity: config.woodInventoryCapacity + 2,
  }),
  // Wagons
  automatic_wagon: (config: PlayerConfig) => ({
    ...config,
    wagonCount: Math.max(1, config.wagonCount),
  }),
  wagon_speed_1: (config: PlayerConfig) => ({
    ...config,
    wagonSpeedMultiplier: config.wagonSpeedMultiplier + 0.25,
  }),
  wagon_capacity_1: (config: PlayerConfig) => ({
    ...config,
    wagonCapacity: config.wagonCapacity + 1,
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
  axe_root: {
    id: "axe_root",
    name: "Axe",
    description: "Unlock the axe improvement tree",
    baseCost: 0,
    category: "axe",
    tier: 0,
  },
  improved_axe: {
    id: "improved_axe",
    name: "Improved Axe",
    description: "Reduces axe cooldown by 50%",
    baseCost: 2,
    category: "axe",
    tier: 1,
    requires: "axe_root",
  },
  sharpened_blade: {
    id: "sharpened_blade",
    name: "Sharpened Blade",
    description: "Trees take 2 hits instead of 3",
    baseCost: 4,
    requires: "improved_axe",
    category: "axe",
    tier: 2,
  },
  area_chop: {
    id: "area_chop",
    name: "Area Chop",
    description: "Hit all trees in a 3x3 area around you",
    baseCost: 10,
    requires: "sharpened_blade",
    category: "axe",
    tier: 3,
  },
  backpack_upgrade: {
    id: "backpack_upgrade",
    name: "Backpack Upgrade",
    description: "Increases wood inventory capacity by 2",
    baseCost: 3,
    requires: "improved_axe",
    category: "axe",
    tier: 2,
  },
  wagon_root: {
    id: "wagon_root",
    name: "Wagon",
    description: "Unlock the wagon improvement tree",
    baseCost: 0,
    category: "wagon",
    tier: 0,
  },
  automatic_wagon: {
    id: "automatic_wagon",
    name: "Automatic Wagon",
    description:
      "A slow wagon that automatically collects wood and brings it to the collect zone",
    baseCost: 6,
    category: "wagon",
    tier: 1,
    requires: "wagon_root",
  },
  wagon_speed_1: {
    id: "wagon_speed_1",
    name: "Faster Wagon",
    description: "Increases wagon speed",
    baseCost: 2,
    costScaling: 1.6,
    requires: "automatic_wagon",
    repeatable: true,
    category: "wagon",
    tier: 2,
  },
  wagon_capacity_1: {
    id: "wagon_capacity_1",
    name: "Bigger Wagon",
    description: "Increases wagon capacity by 1",
    baseCost: 3,
    costScaling: 1.7,
    requires: "automatic_wagon",
    repeatable: true,
    category: "wagon",
    tier: 2,
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
