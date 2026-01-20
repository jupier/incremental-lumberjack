/**
 * Player State Management System
 *
 * This module manages the game configuration (axe cooldown, tree health, etc.).
 * Improvements are defined in improvements.ts
 */

import { getImprovementData, getImprovementEffect } from "./improvements";

export interface PlayerConfig {
  // Combat
  axeCooldownDuration: number; // in seconds
  treeMaxHealth: number; // Maximum health of trees (default 3, reduced to 2 with Sharpened Blade)
  areaChopEnabled: boolean; // Hit all trees in 3x3 area
  cursorRadius: number; // Radius of the cursor/hit zone in pixels
  // Map
  treeDensity: number; // Probability of a tile having a tree (0-1)
  treeRespawnEnabled: boolean; // Whether trees respawn after being cut
}

/**
 * Default player configuration
 */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  axeCooldownDuration: 1.0, // 1 second
  treeMaxHealth: 3, // Trees have 3 health by default
  areaChopEnabled: false,
  cursorRadius: 12, // Default cursor radius in pixels
  treeDensity: 0.2, // 20% of tiles have trees by default
  treeRespawnEnabled: false, // Trees don't respawn by default
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

    // Root node is unlocked by default so the tree is visible and usable immediately.
    // This is a no-op improvement, but we record it as "purchased" for prerequisite checks.
    this.purchaseImprovement("axe_root");
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

  /**
   * Get all purchased improvements
   */
  getPurchasedImprovements(): ReadonlySet<string> {
    return new Set(
      [...this.improvementLevels.entries()]
        .filter(([, level]) => level > 0)
        .map(([id]) => id)
    );
  }

  /**
   * Reset to default (useful for testing or new game)
   */
  reset(): void {
    this.config = { ...DEFAULT_PLAYER_CONFIG };
    this.improvementLevels.clear();
  }
}
