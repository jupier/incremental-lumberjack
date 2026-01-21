import { Application, Container, extensions, CullerPlugin } from "pixi.js";

// Register CullerPlugin for performance optimization (only render visible objects)
extensions.add(CullerPlugin);
import { createMap, addTreesToMap } from "./map";
import { createWoodCounter } from "./wood-counter";
import { createRoundTimer } from "./round-timer";
import { createTree } from "./tree";
import { createImprovementsMenu, Improvement } from "./improvements-menu";
import { PlayerStateManager } from "./player-state";
import { getAllImprovements, getImprovementNextCost } from "./improvements";
import { setupMouseTreeDestruction } from "./mouse-tree-destruction";
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

        // Update existing trees' health if Sharpened Blade was purchased
        if (improvementId === "sharpened_blade") {
          treesContainer.children.forEach((child) => {
            const tree = child as any;
            const baseMaxHealth = tree.baseMaxHealth ?? tree.maxHealth ?? 3;
            const reduction = Math.max(0, 3 - config.treeMaxHealth);
            const effectiveMaxHealth = Math.max(1, baseMaxHealth - reduction);
            if (tree.health && tree.health > effectiveMaxHealth) {
              tree.health = effectiveMaxHealth;
            }
            tree.maxHealth = effectiveMaxHealth;
          });
        }

        // Add more trees if "more_trees" improvement was purchased
        if (improvementId === "more_trees") {
          const treesAdded = addTreesToMap(
            tiles,
            treesContainer,
            mapWidth,
            mapHeight,
            tileSize,
            config.treeDensity,
            "normal"
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
      // Respawn tree after a delay (2 seconds)
      setTimeout(() => {
        const tile = tiles[tileY]?.[tileX];
        // Only respawn if tile is still empty
        if (tile && tile.item === null) {
          const tree = createTree("normal");
          const treeX = tileX * tileSize + tileSize / 2;
          const treeY = tileY * tileSize + tileSize / 2;

          tree.x = treeX;
          tree.y = treeY;
          tree.cullable = true;
          treesContainer.addChild(tree);

          // Update tile data
          tile.item = "tree";
          tile.tree = tree;
          tile.treeType = "normal";
        }
      }, 2000); // 2 second delay
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
}

function endRound() {
  isRoundActive = false;
  showImprovementsMenu();
}

// Start first round
startRound();

// Update tree shake animations
app.ticker.add(() => {
  const shakeIntensity = 8; // Increased from 3 for more noticeable shake
  const shakeDuration = 0.2; // seconds
  const shakeCount = 5;
  const deltaTime = app.ticker.deltaMS / 1000; // Convert to seconds

  treesContainer.children.forEach((child) => {
    const tree = child as any;
    if (tree.isShaking) {
      tree.shakeTime = (tree.shakeTime || 0) + deltaTime;
      const progress = tree.shakeTime / shakeDuration;

      if (progress >= 1) {
        // Animation complete, reset position
        tree.x = tree.originalX;
        tree.y = tree.originalY;
        tree.isShaking = false;
        tree.shakeTime = 0;
      } else {
        // Calculate shake offset using sine wave
        const offset =
          Math.sin(progress * Math.PI * shakeCount) *
          shakeIntensity *
          (1 - progress);
        tree.x = tree.originalX + offset;
        tree.y = tree.originalY + offset * 0.5; // Slight vertical shake
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
