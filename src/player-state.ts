/**
 * Player State Management System
 *
 * This module manages the player's configuration.
 * Improvements are defined in improvements.ts
 */

import { getImprovementEffect } from "./improvements";

export interface PlayerConfig {
  // Inventory
  woodInventoryCapacity: number;

  // Combat
  axeCooldownDuration: number; // in seconds
  treeMaxHealth: number; // Maximum health of trees (default 3, reduced to 2 with Sharpened Blade)
  areaChopEnabled: boolean; // Hit all trees in 3x3 area

  // Collection
  autoCollectEnabled: boolean; // Automatically collect wood when walking over it
}

/**
 * Default player configuration
 */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  woodInventoryCapacity: 1,
  axeCooldownDuration: 1.0, // 1 second
  treeMaxHealth: 3, // Trees have 3 health by default
  areaChopEnabled: false,
  autoCollectEnabled: false,
};

/**
 * Player state manager
 * Tracks purchased improvements and calculates current config
 */
export class PlayerStateManager {
  private config: PlayerConfig;
  private purchasedImprovements: Set<string> = new Set();

  constructor(initialConfig: PlayerConfig = DEFAULT_PLAYER_CONFIG) {
    this.config = { ...initialConfig };
  }

  /**
   * Purchase an improvement and apply its effect
   */
  purchaseImprovement(improvementId: string): boolean {
    if (this.purchasedImprovements.has(improvementId)) {
      return false; // Already purchased
    }

    const effect = getImprovementEffect(improvementId);
    if (!effect) {
      return false; // Invalid improvement
    }

    // Apply the improvement effect
    this.config = effect(this.config);
    this.purchasedImprovements.add(improvementId);
    return true;
  }

  /**
   * Check if an improvement is purchased
   */
  hasImprovement(improvementId: string): boolean {
    return this.purchasedImprovements.has(improvementId);
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
    return new Set(this.purchasedImprovements);
  }

  /**
   * Reset to default (useful for testing or new game)
   */
  reset(): void {
    this.config = { ...DEFAULT_PLAYER_CONFIG };
    this.purchasedImprovements.clear();
  }
}
