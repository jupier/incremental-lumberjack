/**
 * Player State Management System
 *
 * This module manages the player's configuration and improvements.
 * Instead of a state machine, we use a configuration object that gets
 * modified by improvements when they're purchased.
 */

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

export interface ImprovementEffect {
  id: string;
  apply: (config: PlayerConfig) => PlayerConfig;
  description: string;
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
 * Improvement registry
 * Each improvement defines how it modifies the player config
 */
export const IMPROVEMENT_EFFECTS: Record<string, ImprovementEffect> = {
  improved_axe: {
    id: "improved_axe",
    description: "Reduces axe cooldown by 50%",
    apply: (config: PlayerConfig) => ({
      ...config,
      axeCooldownDuration: config.axeCooldownDuration * 0.5,
    }),
  },
  increased_wood_capacity: {
    id: "increased_wood_capacity",
    description: "Increases wood inventory capacity by 1",
    apply: (config: PlayerConfig) => ({
      ...config,
      woodInventoryCapacity: config.woodInventoryCapacity + 1,
    }),
  },
  sharpened_blade: {
    id: "sharpened_blade",
    description: "Trees take 2 hits instead of 3",
    apply: (config: PlayerConfig) => ({
      ...config,
      treeMaxHealth: 2, // Reduce tree health from 3 to 2
    }),
  },
  area_chop: {
    id: "area_chop",
    description: "Hit all trees in a 3x3 area around you",
    apply: (config: PlayerConfig) => ({
      ...config,
      areaChopEnabled: true,
    }),
  },
  backpack_upgrade: {
    id: "backpack_upgrade",
    description: "Increases wood inventory capacity by 2",
    apply: (config: PlayerConfig) => ({
      ...config,
      woodInventoryCapacity: config.woodInventoryCapacity + 2,
    }),
  },
  auto_collect: {
    id: "auto_collect",
    description: "Automatically collect wood when walking over it",
    apply: (config: PlayerConfig) => ({
      ...config,
      autoCollectEnabled: true,
    }),
  },
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

    const effect = IMPROVEMENT_EFFECTS[improvementId];
    if (!effect) {
      return false; // Invalid improvement
    }

    // Apply the improvement effect
    this.config = effect.apply(this.config);
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
