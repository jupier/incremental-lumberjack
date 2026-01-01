/**
 * Improvements System
 *
 * Centralized location for all improvement definitions, including:
 * - Improvement metadata (name, description, cost, prerequisites)
 * - Improvement effects (how they modify PlayerConfig)
 */

import { PlayerConfig } from "./player-state";
import { Improvement } from "./improvements-menu";

/**
 * Improvement effect functions
 * Each function takes the current config and returns a modified config
 */
export const IMPROVEMENT_EFFECTS: Record<
  string,
  (config: PlayerConfig) => PlayerConfig
> = {
  improved_axe: (config: PlayerConfig) => ({
    ...config,
    axeCooldownDuration: config.axeCooldownDuration * 0.5,
  }),
  increased_wood_capacity: (config: PlayerConfig) => ({
    ...config,
    woodInventoryCapacity: config.woodInventoryCapacity + 1,
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
    cost: number;
    requires?: string; // ID of required improvement
    repeatable?: boolean;
  }
> = {
  improved_axe: {
    id: "improved_axe",
    name: "Improved Axe",
    description: "Reduces axe cooldown by 50%",
    cost: 10,
  },
  increased_wood_capacity: {
    id: "increased_wood_capacity",
    name: "Increased Wood Capacity",
    description: "Increases wood inventory capacity by 1",
    cost: 15,
  },
  sharpened_blade: {
    id: "sharpened_blade",
    name: "Sharpened Blade",
    description: "Trees take 2 hits instead of 3",
    cost: 20,
  },
  area_chop: {
    id: "area_chop",
    name: "Area Chop",
    description: "Hit all trees in a 3x3 area around you",
    cost: 50,
  },
  backpack_upgrade: {
    id: "backpack_upgrade",
    name: "Backpack Upgrade",
    description: "Increases wood inventory capacity by 2",
    cost: 20,
  },
  automatic_wagon: {
    id: "automatic_wagon",
    name: "Automatic Wagon",
    description:
      "A slow wagon that automatically collects wood and brings it to the collect zone",
    cost: 0,
  },
  wagon_speed_1: {
    id: "wagon_speed_1",
    name: "Faster Wagon",
    description: "Increases wagon speed",
    cost: 0,
    requires: "automatic_wagon",
    repeatable: true,
  },
  wagon_capacity_1: {
    id: "wagon_capacity_1",
    name: "Bigger Wagon",
    description: "Increases wagon capacity by 1",
    cost: 0,
    requires: "automatic_wagon",
    repeatable: true,
  },
};

/**
 * Get all improvements as Improvement array for the menu
 */
export function getAllImprovements(): Improvement[] {
  return Object.values(IMPROVEMENTS_DATA).map((data) => ({
    id: data.id,
    name: data.name,
    description: data.description,
    cost: data.cost,
    purchased: false, // Will be updated by the menu system
    requires: data.requires,
    repeatable: data.repeatable,
    level: 0,
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
