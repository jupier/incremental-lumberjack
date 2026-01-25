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

  // Tree density improvements (repeatable, limited to 80%)
  more_trees: (config: PlayerConfig, _level: number) => ({
    ...config,
    treeDensity: Math.min(0.8, config.treeDensity + 0.05), // +5% per level, max 80%
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

  // New tree type unlocks
  unlock_magical_trees: (config: PlayerConfig, _level: number) => ({
    ...config,
    magicalTreesEnabled: true,
  }),
  unlock_crystal_trees: (config: PlayerConfig, _level: number) => ({
    ...config,
    crystalTreesEnabled: true,
  }),
  unlock_legendary_trees: (config: PlayerConfig, _level: number) => ({
    ...config,
    legendaryTreesEnabled: true,
  }),

  // Auto-click unlock
  auto_click: (config: PlayerConfig, _level: number) => ({
    ...config,
    autoClickEnabled: true,
  }),

  // Wood drop improvements for each tree type (repeatable, adds flat amount per level)
  improve_normal_wood: (config: PlayerConfig, _level: number) => ({
    ...config,
    normalWoodBonus: config.normalWoodBonus + 2, // +2 pieces per level
  }),
  improve_strong_wood: (config: PlayerConfig, _level: number) => ({
    ...config,
    strongWoodBonus: config.strongWoodBonus + 3, // +3 pieces per level
  }),
  improve_ancient_wood: (config: PlayerConfig, _level: number) => ({
    ...config,
    ancientWoodBonus: config.ancientWoodBonus + 5, // +5 pieces per level
  }),
  improve_magical_wood: (config: PlayerConfig, _level: number) => ({
    ...config,
    magicalWoodBonus: config.magicalWoodBonus + 8, // +8 pieces per level
  }),
  improve_crystal_wood: (config: PlayerConfig, _level: number) => ({
    ...config,
    crystalWoodBonus: config.crystalWoodBonus + 12, // +12 pieces per level
  }),
  improve_legendary_wood: (config: PlayerConfig, _level: number) => ({
    ...config,
    legendaryWoodBonus: config.legendaryWoodBonus + 20, // +20 pieces per level
  }),

  // Horizontal line weapon improvements
  horizontal_line_weapon: (config: PlayerConfig, _level: number) => ({
    ...config,
    horizontalLineWeaponEnabled: true,
  }),
  horizontal_line_weapon_speed: (config: PlayerConfig, _level: number) => ({
    ...config,
    horizontalLineWeaponInterval: config.horizontalLineWeaponInterval * 0.85, // 15% faster per level
  }),
  horizontal_line_weapon_power: (config: PlayerConfig, _level: number) => ({
    ...config,
    horizontalLineWeaponPower: config.horizontalLineWeaponPower + 1, // +1 damage per level
  }),

  // Vertical line weapon improvements
  vertical_line_weapon: (config: PlayerConfig, _level: number) => ({
    ...config,
    verticalLineWeaponEnabled: true,
  }),
  vertical_line_weapon_speed: (config: PlayerConfig, _level: number) => ({
    ...config,
    verticalLineWeaponInterval: config.verticalLineWeaponInterval * 0.85, // 15% faster per level
  }),
  vertical_line_weapon_power: (config: PlayerConfig, _level: number) => ({
    ...config,
    verticalLineWeaponPower: config.verticalLineWeaponPower + 1, // +1 damage per level
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
  unlock_magical_trees: {
    id: "unlock_magical_trees",
    name: "Magical Trees",
    description: "Unlocks magical trees (15 health, 15 wood)",
    baseCost: 100,
    category: "map",
    tier: 5,
    requires: "unlock_ancient_trees",
  },
  unlock_crystal_trees: {
    id: "unlock_crystal_trees",
    name: "Crystal Trees",
    description: "Unlocks crystal trees (20 health, 20 wood)",
    baseCost: 200,
    category: "map",
    tier: 6,
    requires: "unlock_magical_trees",
  },
  unlock_legendary_trees: {
    id: "unlock_legendary_trees",
    name: "Legendary Trees",
    description: "Unlocks legendary trees (30 health, 30 wood)",
    baseCost: 500,
    category: "map",
    tier: 7,
    requires: "unlock_crystal_trees",
  },

  // Auto-click unlock
  auto_click: {
    id: "auto_click",
    name: "Auto Click",
    description: "Automatically clicks trees for you (1000 wood)",
    baseCost: 1000,
    category: "cursor",
    tier: 5,
    requires: "flashlight",
  },

  // Wood drop improvements for each tree type
  improve_normal_wood: {
    id: "improve_normal_wood",
    name: "Normal Wood+",
    description: "Increases normal tree wood drops by 10%",
    baseCost: 10,
    costScaling: 1.3,
    repeatable: true,
    category: "map",
    tier: 2,
    requires: "more_trees",
  },
  improve_strong_wood: {
    id: "improve_strong_wood",
    name: "Strong Wood+",
    description: "Increases strong tree wood drops by 10%",
    baseCost: 30,
    costScaling: 1.4,
    repeatable: true,
    category: "map",
    tier: 4,
    requires: "unlock_strong_trees",
  },
  improve_ancient_wood: {
    id: "improve_ancient_wood",
    name: "Ancient Wood+",
    description: "Increases ancient tree wood drops by 10%",
    baseCost: 60,
    costScaling: 1.5,
    repeatable: true,
    category: "map",
    tier: 5,
    requires: "unlock_ancient_trees",
  },
  improve_magical_wood: {
    id: "improve_magical_wood",
    name: "Magical Wood+",
    description: "Increases magical tree wood drops by 10%",
    baseCost: 120,
    costScaling: 1.5,
    repeatable: true,
    category: "map",
    tier: 6,
    requires: "unlock_magical_trees",
  },
  improve_crystal_wood: {
    id: "improve_crystal_wood",
    name: "Crystal Wood+",
    description: "Increases crystal tree wood drops by 10%",
    baseCost: 250,
    costScaling: 1.6,
    repeatable: true,
    category: "map",
    tier: 7,
    requires: "unlock_crystal_trees",
  },
  improve_legendary_wood: {
    id: "improve_legendary_wood",
    name: "Legendary Wood+",
    description: "Increases legendary tree wood drops by 10%",
    baseCost: 600,
    costScaling: 1.6,
    repeatable: true,
    category: "map",
    tier: 8,
    requires: "unlock_legendary_trees",
  },

  // Horizontal line weapon improvements
  horizontal_line_weapon: {
    id: "horizontal_line_weapon",
    name: "Horizontal Line Weapon",
    description: "Unlocks weapon that hits all trees on a random horizontal line",
    baseCost: 150,
    category: "cursor",
    tier: 5,
    requires: "flashlight",
  },
  horizontal_line_weapon_speed: {
    id: "horizontal_line_weapon_speed",
    name: "Horizontal Line Speed",
    description: "Reduces horizontal line weapon interval by 15%",
    baseCost: 30,
    costScaling: 1.5,
    repeatable: true,
    category: "cursor",
    tier: 6,
    requires: "horizontal_line_weapon",
  },
  horizontal_line_weapon_power: {
    id: "horizontal_line_weapon_power",
    name: "Horizontal Line Power",
    description: "Increases horizontal line weapon damage by 1",
    baseCost: 40,
    costScaling: 1.4,
    repeatable: true,
    category: "cursor",
    tier: 6,
    requires: "horizontal_line_weapon",
  },

  // Vertical line weapon improvements
  vertical_line_weapon: {
    id: "vertical_line_weapon",
    name: "Vertical Line Weapon",
    description: "Unlocks weapon that hits all trees on a random vertical line",
    baseCost: 150,
    category: "cursor",
    tier: 5,
    requires: "horizontal_line_weapon",
  },
  vertical_line_weapon_speed: {
    id: "vertical_line_weapon_speed",
    name: "Vertical Line Speed",
    description: "Reduces vertical line weapon interval by 15%",
    baseCost: 30,
    costScaling: 1.5,
    repeatable: true,
    category: "cursor",
    tier: 6,
    requires: "vertical_line_weapon",
  },
  vertical_line_weapon_power: {
    id: "vertical_line_weapon_power",
    name: "Vertical Line Power",
    description: "Increases vertical line weapon damage by 1",
    baseCost: 40,
    costScaling: 1.4,
    repeatable: true,
    category: "cursor",
    tier: 6,
    requires: "vertical_line_weapon",
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
