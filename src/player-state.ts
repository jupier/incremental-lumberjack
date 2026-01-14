/**
 * Player State Management System
 *
 * This module manages the player's configuration.
 * Improvements are defined in improvements.ts
 */

import { getImprovementData, getImprovementEffect } from "./improvements";

export interface PlayerConfig {
  // Inventory
  woodInventoryCapacity: number;

  // Combat
  axeCooldownDuration: number; // in seconds
  treeMaxHealth: number; // Maximum health of trees (default 3, reduced to 2 with Sharpened Blade)
  areaChopEnabled: boolean; // Hit all trees in 3x3 area

  // Wagons
  wagonCount: number; // Number of active wagons
  wagonCapacity: number; // How many wood pieces a wagon can carry before depositing
  wagonSpeedMultiplier: number; // Multiplier applied to the wagon base speed
}

/**
 * Default player configuration
 */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  woodInventoryCapacity: 1,
  axeCooldownDuration: 1.0, // 1 second
  treeMaxHealth: 3, // Trees have 3 health by default
  areaChopEnabled: false,
  wagonCount: 0,
  wagonCapacity: 1,
  wagonSpeedMultiplier: 1,
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

    // Root nodes are unlocked by default so both trees are visible and usable immediately.
    // These are no-op improvements, but we record them as "purchased" for prerequisite checks.
    this.purchaseImprovement("axe_root");
    this.purchaseImprovement("wagon_root");
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
