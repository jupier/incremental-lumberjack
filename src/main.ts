import { Application, Container, extensions, CullerPlugin, Graphics } from "pixi.js";

// Register CullerPlugin for performance optimization (only render visible objects)
extensions.add(CullerPlugin);
import { createMap, addTreesToMap } from "./map";
import { createWoodCounter } from "./wood-counter";
import { createRoundTimer } from "./round-timer";
import { createTree, TreeType } from "./tree";
import { createImprovementsMenu, Improvement } from "./improvements-menu";
import { PlayerStateManager } from "./player-state";
import { getAllImprovements, getImprovementNextCost } from "./improvements";
import { setupMouseTreeDestruction, createTreeDestructionAnimation, hitTreeAtTile } from "./mouse-tree-destruction";
import { animateWoodCollection } from "./wood-animation";
import { setupAxeCursor } from "./axe-cursor";

// Create and initialize PixiJS application with full screen
const app = new Application();


await app.init({
  width: window.innerWidth,
  height: window.innerHeight,
  //backgroundColor: 0x4a6741, // Darker, less shiny green background
  resizeTo: window, // Automatically resize to window
  antialias: true,
  // Performance optimizations for smoother gameplay
  powerPreference: "high-performance", // Use dedicated GPU if available
  autoDensity: true, // Better scaling on high-DPI displays
});

// Add the canvas to the DOM
document.body.appendChild(app.canvas as HTMLCanvasElement);

// Handle window resize
window.addEventListener("resize", () => {
  app.renderer.resize(window.innerWidth, window.innerHeight);
});

// Create a world container
const world = new Container();
world.x = 0;
world.y = 0;
app.stage.addChild(world);

// Map is fixed at 40x20 tiles (playable area)
// Add 1 tile border on all sides, so total map is 42x22
const playableWidth = 40;
const playableHeight = 20;
const borderSize = 1;
const mapWidth = playableWidth + borderSize * 2; // 42
const mapHeight = playableHeight + borderSize * 2; // 22

// Calculate tile size to fill the entire screen without overflow
// Use max to fill screen, but ensure we don't exceed screen bounds
// Floor the result to avoid fractional pixels that could cause rendering issues
const tileSize = Math.floor(Math.max(
  window.innerWidth / mapWidth,
  window.innerHeight / mapHeight
));

// Initialize player state manager first to get initial config
const playerStateManager = new PlayerStateManager();
const initialMapConfig = playerStateManager.getConfig();

// Create the map with separate containers for grass and trees
const { grassContainer, treesContainer, tiles } = createMap({
  width: mapWidth,
  height: mapHeight,
  tileSize: tileSize,
  treeDensity: initialMapConfig.treeDensity,
  strongTreesEnabled: initialMapConfig.strongTreesEnabled,
  ancientTreesEnabled: initialMapConfig.ancientTreesEnabled,
  magicalTreesEnabled: initialMapConfig.magicalTreesEnabled,
  crystalTreesEnabled: initialMapConfig.crystalTreesEnabled,
  legendaryTreesEnabled: initialMapConfig.legendaryTreesEnabled,
});

// Enable culling on containers for performance (only render visible tiles)
grassContainer.cullable = true;
grassContainer.cullableChildren = true;
treesContainer.cullable = true;
treesContainer.cullableChildren = true;

// Add grass tiles first (bottom layer)
world.addChild(grassContainer);


// Add trees last (top layer)
world.addChild(treesContainer);

// Create wood counter
const { container: woodCounter, updateCount: updateWoodCount } =
  createWoodCounter();
app.stage.addChild(woodCounter);
let globalWoodCount = 0;

// Create round timer
const { container: roundTimer, updateTime: updateRoundTimer } =
  createRoundTimer();
app.stage.addChild(roundTimer);

// Round management
let roundTimeRemaining = 30; // seconds
let isRoundActive = false;

// Create improvements menu - get all improvements from centralized file
const improvements: Improvement[] = getAllImprovements();

function syncImprovementsFromState(): void {
  for (const improvement of improvements) {
    const level = playerStateManager.getImprovementLevel(improvement.id);
    improvement.level = level;
    improvement.cost = getImprovementNextCost(improvement.id, level);
    if (improvement.repeatable) {
      // Always show as upgradeable, the level indicates progress
      improvement.purchased = false;
    } else {
      improvement.purchased = level > 0;
    }
  }
}

syncImprovementsFromState();

// Setup custom axe cursor with cooldown display
const initialCursorConfig = playerStateManager.getConfig();
const { triggerSwing, updateCooldown: updateAxeCooldown, updateRadius: updateCursorRadius, container: cursorContainer } = setupAxeCursor(app, initialCursorConfig.cursorRadius);

// Create improvements menu (pass cursor container to hide/show it)
const {
  show: showImprovementsMenu,
  hide: hideImprovementsMenu,
  update: updateImprovementsMenu,
} = createImprovementsMenu(
  improvements,
  (improvementId: string) => {
    syncImprovementsFromState();
    const improvement = improvements.find((imp) => imp.id === improvementId);
    if (
      improvement &&
      (!improvement.purchased || improvement.repeatable) &&
      globalWoodCount >= improvement.cost
    ) {
      // Purchase the improvement through state manager
      const purchased = playerStateManager.purchaseImprovement(improvementId);
      if (purchased) {
        globalWoodCount -= improvement.cost;
        syncImprovementsFromState();
        updateWoodCount(globalWoodCount);
        updateImprovementsMenu(improvements);

        // Get updated config
        const config = playerStateManager.getConfig();

        // Update cursor radius if it changed
        updateCursorRadius(config.cursorRadius);

        // Add more trees if "more_trees" improvement was purchased
        if (improvementId === "more_trees") {
          const treesAdded = addTreesToMap(
            tiles,
            treesContainer,
            mapWidth,
            mapHeight,
            tileSize,
            config.treeDensity,
            config.strongTreesEnabled,
            config.ancientTreesEnabled,
            config.magicalTreesEnabled,
            config.crystalTreesEnabled,
            config.legendaryTreesEnabled
          );
          console.log(`Added ${treesAdded} new trees to the map`);
        }

      }
    }
  },
  (improvementId: string) => playerStateManager.hasImprovement(improvementId),
  { container: cursorContainer },
  () => {
    // Start new round when button is clicked
    startRound();
  }
);

// Setup mouse-based tree destruction
setupMouseTreeDestruction(
  app,
  world,
  tileSize,
  mapWidth,
  mapHeight,
  tiles,
  treesContainer,
  () => playerStateManager.getConfig(),
  (progress: number) => {
    // Update cooldown bar on axe cursor
    updateAxeCooldown(progress);
  },
  (count: number, worldX: number, worldY: number) => {
    // Animate wood collection from tree to counter
    // Wood counter is at screen position (10, 10) + center of counter (75, 25) = (85, 35)
    const targetScreenX = 85; // 10 + 75 (half of 150 width)
    const targetScreenY = 35; // 10 + 25 (half of 50 height)
    
    animateWoodCollection(
      app,
      world,
      worldX,
      worldY,
      targetScreenX,
      targetScreenY,
      count,
      (collectedCount: number) => {
        // Update wood count when animation completes
        globalWoodCount += collectedCount;
        updateWoodCount(globalWoodCount);
      }
    );
  },
  triggerSwing, // Pass swing trigger to mouse tree destruction
  () => playerStateManager.getConfig().cursorRadius, // Pass cursor radius getter
  (tileX: number, tileY: number) => {
    // Handle tree respawn when a tree is cut
    const config = playerStateManager.getConfig();
    if (config.treeRespawnEnabled) {
      // Respawn tree after delay (based on improvement level)
      setTimeout(() => {
        const tile = tiles[tileY]?.[tileX];
        // Only respawn if tile is still empty and round is still active
        if (tile && tile.item === null && isRoundActive) {
          // Get current config again (in case it changed)
          const currentConfig = playerStateManager.getConfig();
          // Choose tree type based on enabled types (weighted random)
          let treeType: TreeType = "normal";
          const rand = Math.random();
          if (currentConfig.legendaryTreesEnabled && rand < 0.01) {
            treeType = "legendary";
          } else if (currentConfig.crystalTreesEnabled && rand < 0.02) {
            treeType = "crystal";
          } else if (currentConfig.magicalTreesEnabled && rand < 0.03) {
            treeType = "magical";
          } else if (currentConfig.ancientTreesEnabled && rand < 0.05) {
            treeType = "ancient";
          } else if (currentConfig.strongTreesEnabled && rand < 0.30) {
            treeType = "strong";
          } else {
            treeType = "normal";
          }
          
          const tree = createTree(treeType);
          const treeX = tileX * tileSize + tileSize / 2;
          const treeY = tileY * tileSize + tileSize / 2;

          tree.x = treeX;
          tree.y = treeY;
          tree.cullable = true;
          treesContainer.addChild(tree);

          // Update tile data
          tile.item = "tree";
          tile.tree = tree;
          tile.treeType = treeType;
        }
      }, config.treeRespawnDelay * 1000); // Convert seconds to milliseconds
    }
  },
  () => isRoundActive // Pass function to check if round is active
);

// Round management functions
function startRound() {
  isRoundActive = true;
  roundTimeRemaining = 30;
  updateRoundTimer(roundTimeRemaining);
  hideImprovementsMenu();
  
  // Reset map and trees
  // Clear all existing trees
  treesContainer.removeChildren();
  
  // Reset all tiles
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = tiles[y]?.[x];
      if (tile) {
        tile.item = null;
        tile.tree = undefined;
        tile.treeType = undefined;
      }
    }
  }
  
  // Regenerate trees with current config
  const config = playerStateManager.getConfig();
  addTreesToMap(
    tiles,
    treesContainer,
    mapWidth,
    mapHeight,
    tileSize,
    config.treeDensity,
    config.strongTreesEnabled,
    config.ancientTreesEnabled,
    config.magicalTreesEnabled,
    config.crystalTreesEnabled,
    config.legendaryTreesEnabled
  );
}

function endRound() {
  isRoundActive = false;
  showImprovementsMenu();
}

// Start first round
startRound();

// Update tree shake animations - more realistic shake with rotation
app.ticker.add(() => {
  const shakeIntensity = 4; // Horizontal shake intensity
  const shakeDuration = 0.15; // seconds - shorter, snappier shake
  const shakeCount = 3; // Fewer oscillations for more realistic feel
  const maxRotation = 0.08; // Maximum rotation in radians (~4.5 degrees)
  const deltaTime = app.ticker.deltaMS / 1000; // Convert to seconds

  treesContainer.children.forEach((child) => {
    const tree = child as any;
    if (tree.isShaking) {
      tree.shakeTime = (tree.shakeTime || 0) + deltaTime;
      const progress = tree.shakeTime / shakeDuration;

      if (progress >= 1) {
        // Animation complete, reset position and rotation
        tree.x = tree.originalX;
        tree.y = tree.originalY;
        tree.rotation = 0;
        tree.isShaking = false;
        tree.shakeTime = 0;
      } else {
        // More realistic shake: horizontal movement with slight vertical bounce
        // Use exponential decay for natural damping
        const damping = Math.pow(1 - progress, 1.5);
        const horizontalOffset = Math.sin(progress * Math.PI * shakeCount) * shakeIntensity * damping;
        const verticalOffset = Math.abs(Math.sin(progress * Math.PI * shakeCount * 0.5)) * 2 * damping;
        
        // Add slight rotation that follows the shake direction
        const rotation = Math.sin(progress * Math.PI * shakeCount) * maxRotation * damping;
        
        tree.x = tree.originalX + horizontalOffset;
        tree.y = tree.originalY - verticalOffset; // Move up slightly when hit
        tree.rotation = rotation;
      }
    }
  });
});

// Round timer countdown
app.ticker.add(() => {
  if (isRoundActive && roundTimeRemaining > 0) {
    const deltaTime = app.ticker.deltaMS / 1000; // Convert to seconds
    roundTimeRemaining -= deltaTime;
    
    if (roundTimeRemaining <= 0) {
      roundTimeRemaining = 0;
      endRound();
    }
    
    updateRoundTimer(roundTimeRemaining);
  }
});

// Flashlight system - hits random trees on the map
let flashlightTimer = 0;

// Create flashlight indicator (progress ring around cursor)
const flashlightIndicator = new Graphics();
flashlightIndicator.visible = false;
cursorContainer.addChild(flashlightIndicator);

// Function to update flashlight indicator
function updateFlashlightIndicator(progress: number, isEnabled: boolean): void {
  if (!isEnabled) {
    flashlightIndicator.visible = false;
    return;
  }
  
  flashlightIndicator.visible = true;
  flashlightIndicator.clear();
  
  // Draw progress ring around cursor (slightly larger than cursor radius)
  const config = playerStateManager.getConfig();
  const indicatorRadius = config.cursorRadius + 8; // 8 pixels outside cursor
  const strokeWidth = 3;
  
  if (progress >= 1 || progress <= 0) {
    // Ready state - yellow/orange circle border
    flashlightIndicator.circle(0, 0, indicatorRadius);
    flashlightIndicator.stroke({ width: strokeWidth, color: 0xffff00 });
  } else {
    // Charging state - gray border that gradually becomes yellow
    const startAngle = -Math.PI / 2; // Start at top
    const totalAngle = Math.PI * 2;
    const progressAngle = progress * totalAngle;
    
    // Draw full gray circle border (background)
    flashlightIndicator.circle(0, 0, indicatorRadius);
    flashlightIndicator.stroke({ width: strokeWidth, color: 0x666666 });
    
    // Draw yellow progress arc (from top, clockwise) that replaces gray
    if (progress > 0) {
      const endAngle = startAngle + progressAngle;
      
      // Draw the yellow arc
      const startX = Math.cos(startAngle) * indicatorRadius;
      const startY = Math.sin(startAngle) * indicatorRadius;
      flashlightIndicator.moveTo(startX, startY);
      flashlightIndicator.arc(0, 0, indicatorRadius, startAngle, endAngle);
      flashlightIndicator.stroke({ width: strokeWidth, color: 0xffff00 });
    }
  }
}

app.ticker.add(() => {
  if (!isRoundActive) {
    flashlightTimer = 0;
    updateFlashlightIndicator(0, false);
    return;
  }
  
  const config = playerStateManager.getConfig();
  if (!config.flashlightEnabled) {
    flashlightTimer = 0;
    updateFlashlightIndicator(0, false);
    return;
  }
  
  const deltaTime = app.ticker.deltaMS / 1000; // Convert to seconds
  flashlightTimer += deltaTime;
  
  // Update flashlight indicator progress
  const progress = Math.min(1, flashlightTimer / config.flashlightInterval);
  updateFlashlightIndicator(progress, true);
  
  if (flashlightTimer >= config.flashlightInterval) {
    flashlightTimer = 0;
    updateFlashlightIndicator(0, true); // Reset indicator
    
    // Find all trees on the entire map
    const allTrees: Array<{ tileX: number; tileY: number }> = [];
    
    // Search entire map for trees
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = tiles[y]?.[x];
        if (tile && tile.item === "tree" && tile.tree) {
          allTrees.push({ tileX: x, tileY: y });
        }
      }
    }
    
    // Shuffle and select random trees to hit
    const treesToHit = allTrees
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, config.flashlightCount);
    
    // Hit the selected trees
    treesToHit.forEach(({ tileX, tileY }) => {
      // Create visual flash effect for flashlight hit
      const flashTile = tiles[tileY]?.[tileX];
      if (flashTile && flashTile.tree) {
        const tree = flashTile.tree;
        const treeWorldX = tree.x;
        const treeWorldY = tree.y;
        
        // Create simple flash effect - just a bright circle at the tree
        const flashEffect = new Graphics();
        
        // Draw a bright flash circle at tree position
        flashEffect.circle(0, 0, 30);
        flashEffect.fill({ color: 0xffffff, alpha: 0.9 });
        flashEffect.circle(0, 0, 20);
        flashEffect.fill({ color: 0xffff00, alpha: 0.8 });
        
        // Position Graphics at tree location in world space
        flashEffect.x = treeWorldX;
        flashEffect.y = treeWorldY;
        flashEffect.alpha = 1;
        
        // Add to world container (above trees)
        world.addChild(flashEffect);
        
        // Animate flash: fade out quickly
        let flashTime = 0;
        const flashDuration = 0.15; // 150ms flash
        const flashTicker = () => {
          flashTime += app.ticker.deltaMS / 1000;
          const progress = flashTime / flashDuration;
          
          if (progress >= 1) {
            // Remove flash effect
            if (world.children.includes(flashEffect)) {
              world.removeChild(flashEffect);
            }
            flashEffect.destroy();
            app.ticker.remove(flashTicker);
          } else {
            // Fade out and scale up slightly
            flashEffect.alpha = 1 - progress;
            const scale = 1 + progress * 0.2;
            flashEffect.scale.set(scale);
          }
        };
        app.ticker.add(flashTicker);
      }
      
      // Hit tree with flashlight power
      const targetTile = tiles[tileY]?.[tileX];
      if (targetTile && targetTile.item === "tree" && targetTile.tree) {
        const targetTree = targetTile.tree;
        const currentConfig = playerStateManager.getConfig();

        const baseMaxHealth = (targetTree as any).baseMaxHealth ?? (targetTree as any).maxHealth ?? 3;
        const effectiveMaxHealth = baseMaxHealth;
        (targetTree as any).maxHealth = effectiveMaxHealth;

        const currentHealth = (targetTree as any).health ?? effectiveMaxHealth;
        // Use flashlight power instead of cursor hit damage
        const hitDamage = currentConfig.flashlightPower ?? 1;
        const newHealth = currentHealth - hitDamage;

        (targetTree as any).health = newHealth;

        // Shake the tree
        if (!(targetTree as any).originalX) {
          (targetTree as any).originalX = targetTree.x;
          (targetTree as any).originalY = targetTree.y;
        }
        (targetTree as any).shakeTime = 0;
        (targetTree as any).isShaking = true;

        if (newHealth <= 0) {
          const treeType = (targetTree as any).treeType as TreeType || "normal";
          const woodDropCount = Math.max(1, (targetTree as any).woodDropCount ?? 3);
          const tileCenterX = tileX * tileSize + tileSize / 2;
          const tileCenterY = tileY * tileSize + tileSize / 2;

          // Hide tree immediately (before destruction animation)
          targetTree.visible = false;

          // Create destruction animation
          createTreeDestructionAnimation(
            targetTree,
            treeType,
            world,
            app,
            () => {
              // After animation completes, remove tree and update tile
              if (treesContainer.children.includes(targetTree)) {
                treesContainer.removeChild(targetTree);
              }
              targetTree.destroy();

              // Update tile data
              targetTile.item = null;
              targetTile.tree = undefined;

              // Animate wood collection
              const targetScreenX = 85;
              const targetScreenY = 35;
              animateWoodCollection(
                app,
                world,
                tileCenterX,
                tileCenterY,
                targetScreenX,
                targetScreenY,
                woodDropCount,
                (collectedCount: number) => {
                  globalWoodCount += collectedCount;
                  updateWoodCount(globalWoodCount);
                }
              );

              // Handle tree respawn
              if (currentConfig.treeRespawnEnabled) {
                setTimeout(() => {
                  const respawnTile = tiles[tileY]?.[tileX];
                  if (respawnTile && respawnTile.item === null && isRoundActive) {
                    const respawnConfig = playerStateManager.getConfig();
                    let treeType: TreeType = "normal";
                    const rand = Math.random();
                    if (respawnConfig.legendaryTreesEnabled && rand < 0.01) {
                      treeType = "legendary";
                    } else if (respawnConfig.crystalTreesEnabled && rand < 0.02) {
                      treeType = "crystal";
                    } else if (respawnConfig.magicalTreesEnabled && rand < 0.03) {
                      treeType = "magical";
                    } else if (respawnConfig.ancientTreesEnabled && rand < 0.05) {
                      treeType = "ancient";
                    } else if (respawnConfig.strongTreesEnabled && rand < 0.30) {
                      treeType = "strong";
                    }
                    
                    const tree = createTree(treeType);
                    const treeX = tileX * tileSize + tileSize / 2;
                    const treeY = tileY * tileSize + tileSize / 2;

                    tree.x = treeX;
                    tree.y = treeY;
                    tree.cullable = true;
                    treesContainer.addChild(tree);

                    respawnTile.item = "tree";
                    respawnTile.tree = tree;
                    respawnTile.treeType = treeType;
                  }
                }, currentConfig.treeRespawnDelay * 1000);
              }
            }
          );
        }
      }
    });
  }
});

// Auto-click system - automatically hits trees
let autoClickTimer = 0;
const autoClickInterval = 0.5; // Click every 0.5 seconds

app.ticker.add(() => {
  if (!isRoundActive) {
    autoClickTimer = 0;
    return;
  }
  
  const config = playerStateManager.getConfig();
  if (!config.autoClickEnabled) {
    autoClickTimer = 0;
    return;
  }
  
  const deltaTime = app.ticker.deltaMS / 1000; // Convert to seconds
  autoClickTimer += deltaTime;
  
  if (autoClickTimer >= autoClickInterval) {
    autoClickTimer = 0;
    
    // Find all trees on the map
    const allTrees: Array<{ tileX: number; tileY: number }> = [];
    
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = tiles[y]?.[x];
        if (tile && tile.item === "tree" && tile.tree) {
          allTrees.push({ tileX: x, tileY: y });
        }
      }
    }
    
    // Hit a random tree (or multiple if there are many)
    if (allTrees.length > 0) {
      // Shuffle and select up to 3 random trees to hit
      const treesToHit = allTrees
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(3, allTrees.length));
      
      treesToHit.forEach(({ tileX, tileY }) => {
        hitTreeAtTile(
          tileX,
          tileY,
          tiles,
          mapWidth,
          mapHeight,
          tileSize,
          treesContainer,
          app,
          world,
          () => playerStateManager.getConfig(),
          (count: number, worldX: number, worldY: number) => {
            const targetScreenX = 85;
            const targetScreenY = 35;
            animateWoodCollection(
              app,
              world,
              worldX,
              worldY,
              targetScreenX,
              targetScreenY,
              count,
              (collectedCount: number) => {
                globalWoodCount += collectedCount;
                updateWoodCount(globalWoodCount);
              }
            );
          },
          (tileX: number, tileY: number) => {
            // Handle tree respawn
            const currentConfig = playerStateManager.getConfig();
            if (currentConfig.treeRespawnEnabled) {
              setTimeout(() => {
                const respawnTile = tiles[tileY]?.[tileX];
                if (respawnTile && respawnTile.item === null && isRoundActive) {
                  const respawnConfig = playerStateManager.getConfig();
                  let treeType: TreeType = "normal";
                  const rand = Math.random();
                  if (respawnConfig.legendaryTreesEnabled && rand < 0.01) {
                    treeType = "legendary";
                  } else if (respawnConfig.crystalTreesEnabled && rand < 0.02) {
                    treeType = "crystal";
                  } else if (respawnConfig.magicalTreesEnabled && rand < 0.03) {
                    treeType = "magical";
                  } else if (respawnConfig.ancientTreesEnabled && rand < 0.05) {
                    treeType = "ancient";
                  } else if (respawnConfig.strongTreesEnabled && rand < 0.30) {
                    treeType = "strong";
                  }
                  
                  const tree = createTree(treeType);
                  const treeX = tileX * tileSize + tileSize / 2;
                  const treeY = tileY * tileSize + tileSize / 2;

                  tree.x = treeX;
                  tree.y = treeY;
                  tree.cullable = true;
                  treesContainer.addChild(tree);

                  respawnTile.item = "tree";
                  respawnTile.tree = tree;
                  respawnTile.treeType = treeType;
                }
              }, currentConfig.treeRespawnDelay * 1000);
            }
          }
        );
      });
    }
  }
});
