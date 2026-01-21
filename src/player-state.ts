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
  // Map
  treeDensity: number; // Probability of a tile having a tree (0-1)
  treeRespawnEnabled: boolean; // Whether trees respawn after being cut
  // Tree types enabled
  strongTreesEnabled: boolean; // Whether strong trees can spawn
  ancientTreesEnabled: boolean; // Whether ancient trees can spawn
}

/**
 * Default player configuration
 */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  axeCooldownDuration: 2.0, // 2 seconds - very slow to start
  treeMaxHealth: 3, // Trees have 3 health by default
  cursorRadius: 4, // Very small cursor radius to start (4 pixels)
  treeDensity: 0.05, // Very low tree density to start (5% of tiles)
  treeRespawnEnabled: false, // Trees don't respawn by default
  strongTreesEnabled: false, // Strong trees locked by default
  ancientTreesEnabled: false, // Ancient trees locked by default
};

/**
 * Player state manager
 * Tracks purchased improvements and calculates current config
 */
export class PlayerStateManager {
  private config: PlayerConfig;
  private improvementLevels: Map<string, number> = new Map();

  constructor(initialConfig: PlayerConfig = DEFAULT_PLAYER_CONFIG) {
    this.config = { ...initialConfig };
  }

  /**
   * Purchase an improvement and apply its effect
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

    // Apply the improvement effect
    this.config = effect(this.config);
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
   * Get current player configuration
   */
  getConfig(): Readonly<PlayerConfig> {
    return { ...this.config };
  }

}
