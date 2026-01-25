/**
 * Player State Management System
 *
 * Manages the game configuration (axe cooldown, tree health, cursor radius, etc.).
 * Improvements are defined in improvements.ts
 */

import { getImprovementData, getImprovementEffect } from "./improvements";

export interface PlayerConfig {
  // Combat
  axeCooldownDuration: number; // in seconds
  treeMaxHealth: number; // Maximum health of trees (default 3)
  cursorRadius: number; // Radius of the cursor/hit zone in pixels
  cursorHitDamage: number; // Damage per hit (default 1)
  // Map
  treeDensity: number; // Probability of a tile having a tree (0-1)
  treeRespawnEnabled: boolean; // Whether trees respawn after being cut
  treeRespawnDelay: number; // Delay in seconds before tree respawns
  // Flashlight
  flashlightEnabled: boolean; // Whether flashlight is active
  flashlightInterval: number; // Interval between flashes in seconds
  flashlightCount: number; // Number of trees hit per flash
  flashlightPower: number; // Damage per flashlight hit
  // Tree types enabled
  strongTreesEnabled: boolean; // Whether strong trees can spawn
  ancientTreesEnabled: boolean; // Whether ancient trees can spawn
  magicalTreesEnabled: boolean; // Whether magical trees can spawn
  crystalTreesEnabled: boolean; // Whether crystal trees can spawn
  legendaryTreesEnabled: boolean; // Whether legendary trees can spawn
  // Auto-click
  autoClickEnabled: boolean; // Whether auto-click is active
  // Wood drop multipliers (per tree type)
  normalWoodMultiplier: number; // Multiplier for normal tree wood drops
  strongWoodMultiplier: number; // Multiplier for strong tree wood drops
  ancientWoodMultiplier: number; // Multiplier for ancient tree wood drops
  magicalWoodMultiplier: number; // Multiplier for magical tree wood drops
  crystalWoodMultiplier: number; // Multiplier for crystal tree wood drops
  legendaryWoodMultiplier: number; // Multiplier for legendary tree wood drops
  // Tree bomb
  treeBombEnabled: boolean; // Whether tree bombs are enabled
  treeBombChance: number; // Chance for a tree to have a bomb (0-1)
  treeBombRadius: number; // Radius of bomb explosion in tiles
  treeBombDamage: number; // Damage dealt by bomb explosion
}

/**
 * Default player configuration
 */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  axeCooldownDuration: 2.0, // 2 seconds - very slow to start
  treeMaxHealth: 3, // Trees have 3 health by default
  cursorRadius: 4, // Very small cursor radius to start (4 pixels)
  cursorHitDamage: 1, // 1 damage per hit by default
  treeDensity: 0.05, // Very low tree density to start (5% of tiles), max 0.8 (80%)
  treeRespawnEnabled: false, // Trees don't respawn by default
  treeRespawnDelay: 10.0, // 10 seconds delay by default (very slow)
  flashlightEnabled: false, // Flashlight disabled by default
  flashlightInterval: 5.0, // 5 seconds between flashes by default
  flashlightCount: 1, // 1 tree per flash by default
  flashlightPower: 1, // 1 damage per flashlight hit by default
  strongTreesEnabled: false, // Strong trees locked by default
  ancientTreesEnabled: false, // Ancient trees locked by default
  magicalTreesEnabled: false, // Magical trees locked by default
  crystalTreesEnabled: false, // Crystal trees locked by default
  legendaryTreesEnabled: false, // Legendary trees locked by default
  autoClickEnabled: false, // Auto-click disabled by default
  // Wood drop multipliers (start at 1.0 = 100% of base)
  normalWoodMultiplier: 1.0,
  strongWoodMultiplier: 1.0,
  ancientWoodMultiplier: 1.0,
  magicalWoodMultiplier: 1.0,
  crystalWoodMultiplier: 1.0,
  legendaryWoodMultiplier: 1.0,
  // Tree bomb
  treeBombEnabled: false, // Tree bombs disabled by default
  treeBombChance: 0.01, // 1% chance by default
  treeBombRadius: 1, // 1 tile radius (3x3 area)
  treeBombDamage: 1, // 1 damage per explosion
};

/**
 * Player state manager
 * Tracks purchased improvements and calculates current config
 */
export class PlayerStateManager {
  private improvementLevels: Map<string, number> = new Map();

  constructor() {
    // Initialize with default config
  }

  /**
   * Purchase an improvement and increment its level
   */
  purchaseImprovement(improvementId: string): boolean {
    const data = getImprovementData(improvementId);
    const isRepeatable = Boolean(data?.repeatable);
    const currentLevel = this.improvementLevels.get(improvementId) ?? 0;
    if (!isRepeatable && currentLevel > 0) return false; // Already purchased

    const effect = getImprovementEffect(improvementId);
    if (!effect) {
      return false; // Invalid improvement
    }

    // Increment level
    this.improvementLevels.set(improvementId, currentLevel + 1);
    return true;
  }

  /**
   * Check if an improvement is purchased
   */
  hasImprovement(improvementId: string): boolean {
    return (this.improvementLevels.get(improvementId) ?? 0) > 0;
  }

  getImprovementLevel(improvementId: string): number {
    return this.improvementLevels.get(improvementId) ?? 0;
  }

  /**
   * Get current player configuration by recalculating from all improvement levels
   */
  getConfig(): Readonly<PlayerConfig> {
    // Start with default config
    let config: PlayerConfig = { ...DEFAULT_PLAYER_CONFIG };
    
    // Apply all improvements based on their total levels
    // We need to apply them in a specific order for dependencies
    const improvementOrder = [
      "stronger_hit",
      "larger_cursor",
      "faster_swing",
      "more_trees",
      "unlock_strong_trees",
      "unlock_ancient_trees",
      "unlock_magical_trees",
      "unlock_crystal_trees",
      "unlock_legendary_trees",
      "tree_respawn",
      "flashlight",
      "flashlight_speed",
      "flashlight_count",
      "flashlight_power",
      "auto_click",
      "improve_normal_wood",
      "improve_strong_wood",
      "improve_ancient_wood",
      "improve_magical_wood",
      "improve_crystal_wood",
      "improve_legendary_wood",
      "tree_bomb",
      "tree_bomb_chance",
      "tree_bomb_radius",
      "tree_bomb_power",
    ];
    
    for (const improvementId of improvementOrder) {
      const level = this.improvementLevels.get(improvementId) ?? 0;
      if (level > 0) {
        const effect = getImprovementEffect(improvementId);
        if (effect) {
          // For repeatable improvements, apply effect with total level
          // For non-repeatable, just apply once
          const data = getImprovementData(improvementId);
          if (data?.repeatable) {
            // Apply effect with total level (effect will handle incremental changes)
            // For effects that need incremental application, we apply multiple times
            // For effects that calculate from total level, we apply once with total level
            const needsIncremental = ["larger_cursor", "faster_swing", "more_trees", "stronger_hit", "flashlight_speed", "flashlight_count", "flashlight_power", "improve_normal_wood", "improve_strong_wood", "improve_ancient_wood", "improve_magical_wood", "improve_crystal_wood", "improve_legendary_wood", "tree_bomb_chance", "tree_bomb_radius", "tree_bomb_power"];
            if (needsIncremental.includes(improvementId)) {
              // Apply incrementally
              for (let i = 1; i <= level; i++) {
                config = effect(config, i);
              }
            } else {
              // Apply once with total level
              config = effect(config, level);
            }
          } else {
            // Apply once
            config = effect(config, 1);
          }
        }
      }
    }
    
    return config;
  }

}
