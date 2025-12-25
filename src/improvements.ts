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
  auto_collect: (config: PlayerConfig) => ({
    ...config,
    autoCollectEnabled: true,
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
  auto_collect: {
    id: "auto_collect",
    name: "Auto-Collect",
    description: "Automatically collect wood when walking over it",
    cost: 40,
    requires: "backpack_upgrade", // Requires Backpack Upgrade
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
