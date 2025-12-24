import { Application, Container } from "pixi.js";
import { createPlayer, setupPlayerMovement, PlayerPosition } from "./player";
import { createMap, getTileSize } from "./map";
import { createMinimap, updateMinimapPlayer } from "./minimap";
import {
  createWeaponBar,
  updateWeaponCooldown,
  addWoodToBar,
  removeAllWoodFromBar,
} from "./weapon-bar";
import { createWoodCounter } from "./wood-counter";
import { createImprovementsMenu, Improvement } from "./improvements-menu";
import {
  PlayerStateManager,
  IMPROVEMENT_EFFECTS,
  DEFAULT_PLAYER_CONFIG,
} from "./player-state";

// Create and initialize PixiJS application with full screen
const app = new Application();

await app.init({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x4a6741, // Darker, less shiny green background
  resizeTo: window, // Automatically resize to window
  antialias: true,
});

// Add the canvas to the DOM
document.body.appendChild(app.canvas as HTMLCanvasElement);

// Handle window resize
window.addEventListener("resize", () => {
  app.renderer.resize(window.innerWidth, window.innerHeight);
  // Update minimap position
  minimap.x = window.innerWidth - 210; // MINIMAP_WIDTH + 10
  minimap.y = 10;
  // Update weapon bar position (centered, 400px wide)
  weaponBar.x = (window.innerWidth - 400) / 2; // BAR_WIDTH
  weaponBar.y = window.innerHeight - 80; // BAR_HEIGHT
});

// Create a world container that will move (camera system)
const world = new Container();
app.stage.addChild(world);

// Create a larger map (bigger than screen)
const tileSize = getTileSize();
const mapWidth = 50; // Large map width in tiles
const mapHeight = 50; // Large map height in tiles

// Create the map with separate containers for grass and trees
const { grassContainer, treesContainer, collectZoneContainer, tiles } =
  createMap({
    width: mapWidth,
    height: mapHeight,
  });

// Add grass tiles first (bottom layer)
world.addChild(grassContainer);

// Add collect zone (above grass, below other items)
world.addChild(collectZoneContainer);

// Create wood pieces container (above grass, below player)
const woodContainer = new Container();
world.addChild(woodContainer);

// Create and add the player (middle layer - behind trees, in front of grass and wood)
const player = createPlayer();
world.addChild(player.container);

// Add trees last (top layer - in front of player)
world.addChild(treesContainer);

// Create minimap
const minimap = createMinimap(tiles, mapWidth, mapHeight);
app.stage.addChild(minimap);

// Create weapon bar
const { container: weaponBar, slots } = createWeaponBar();
app.stage.addChild(weaponBar);
const axeSlot = slots[0]; // First slot is the axe

// Create wood counter
const { container: woodCounter, updateCount: updateWoodCount } =
  createWoodCounter();
app.stage.addChild(woodCounter);
let globalWoodCount = 0;

// Initialize player state manager
const playerStateManager = new PlayerStateManager();

// Create improvements menu
const improvements: Improvement[] = [
  {
    id: "improved_axe",
    name: "Improved Axe",
    description: IMPROVEMENT_EFFECTS.improved_axe.description,
    cost: 10,
    purchased: false,
  },
  {
    id: "increased_wood_capacity",
    name: "Increased Wood Capacity",
    description: IMPROVEMENT_EFFECTS.increased_wood_capacity.description,
    cost: 15,
    purchased: false,
  },
];

const {
  container: improvementsMenu,
  show: showImprovementsMenu,
  hide: hideImprovementsMenu,
  update: updateImprovementsMenu,
} = createImprovementsMenu(improvements, (improvementId: string) => {
  const improvement = improvements.find((imp) => imp.id === improvementId);
  if (
    improvement &&
    !improvement.purchased &&
    globalWoodCount >= improvement.cost
  ) {
    // Purchase the improvement through state manager
    const purchased = playerStateManager.purchaseImprovement(improvementId);
    if (purchased) {
      globalWoodCount -= improvement.cost;
      improvement.purchased = true;
      updateWoodCount(globalWoodCount);
      updateImprovementsMenu(improvements);

      // Get updated config
      const config = playerStateManager.getConfig();

      // Update player cooldown if axe was improved
      if (
        improvementId === "improved_axe" &&
        playerMovement.updateCooldownDuration
      ) {
        // Use the actual cooldown from config (supports future multi-level improvements)
        const isImproved =
          config.axeCooldownDuration <
          DEFAULT_PLAYER_CONFIG.axeCooldownDuration;
        playerMovement.updateCooldownDuration(isImproved);
      }

      // Update wood slot capacity display if capacity was increased
      if (improvementId === "increased_wood_capacity") {
        const woodSlot = slots.find((slot) => slot.isWood);
        if (woodSlot) {
          woodSlot.capacity = config.woodInventoryCapacity;
          if (woodSlot.countText) {
            const count = woodSlot.count || 0;
            woodSlot.countText.text = `${count}/${config.woodInventoryCapacity}`;
          }
        }
      }
    }
  }
});
app.stage.addChild(improvementsMenu);

// Track player position for minimap (will be updated by setupPlayerMovement)
let currentPlayerPosition: PlayerPosition = {
  tileX: Math.floor(mapWidth / 2),
  tileY: Math.floor(mapHeight / 2),
};

// Helper function to check if player is in collect zone
function isInCollectZone(
  tileX: number,
  tileY: number,
  mapWidth: number,
  mapHeight: number
): boolean {
  const centerX = Math.floor(mapWidth / 2);
  const centerY = Math.floor(mapHeight / 2);
  const collectZoneStartX = centerX - 1; // 3x3 zone centered at center
  const collectZoneStartY = centerY - 1;
  const collectZoneEndX = centerX + 1;
  const collectZoneEndY = centerY + 1;

  return (
    tileX >= collectZoneStartX &&
    tileX <= collectZoneEndX &&
    tileY >= collectZoneStartY &&
    tileY <= collectZoneEndY
  );
}

// Setup player movement with z/q/s/d keys (tile-based)
const initialConfig = playerStateManager.getConfig();
const playerMovement = setupPlayerMovement(
  player,
  app,
  tileSize,
  mapWidth,
  mapHeight,
  tiles,
  treesContainer,
  woodContainer,
  (position) => {
    currentPlayerPosition = position;
    updateMinimapPlayer(
      minimap,
      position.tileX,
      position.tileY,
      mapWidth,
      mapHeight
    );

    // Check if player is in collect zone and deposit all wood
    if (isInCollectZone(position.tileX, position.tileY, mapWidth, mapHeight)) {
      const woodDeposited = removeAllWoodFromBar(weaponBar, slots);
      if (woodDeposited > 0) {
        globalWoodCount += woodDeposited;
        updateWoodCount(globalWoodCount);
      }
    }
  },
  (progress) => {
    // Update weapon bar cooldown
    updateWeaponCooldown(axeSlot, progress);
  },
  () => {
    // Wood collected callback - try to add wood (respects capacity)
    // Returns true if wood was added, false if inventory is full
    const config = playerStateManager.getConfig();
    return addWoodToBar(weaponBar, slots, config.woodInventoryCapacity);
  },
  initialConfig.axeCooldownDuration < 1.0 // Check if improved (cooldown < 1.0 means improved)
);

// Initialize minimap with player position
currentPlayerPosition = {
  tileX: playerMovement.tileX,
  tileY: playerMovement.tileY,
};
updateMinimapPlayer(
  minimap,
  currentPlayerPosition.tileX,
  currentPlayerPosition.tileY,
  mapWidth,
  mapHeight
);

// Handle Tab key to show/hide improvements menu
let improvementsMenuVisible = false;
window.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    if (
      currentPlayerPosition &&
      isInCollectZone(
        currentPlayerPosition.tileX,
        currentPlayerPosition.tileY,
        mapWidth,
        mapHeight
      )
    ) {
      if (improvementsMenuVisible) {
        hideImprovementsMenu();
        improvementsMenuVisible = false;
      } else {
        showImprovementsMenu();
        improvementsMenuVisible = true;
      }
    }
  } else if (e.key === "Escape" && improvementsMenuVisible) {
    hideImprovementsMenu();
    improvementsMenuVisible = false;
  }
});

// Camera system: keep player centered, move the world
function updateCamera() {
  // Use player's actual position (smooth movement)
  const playerWorldX = player.container.x;
  const playerWorldY = player.container.y;

  // Move world so player is centered on screen
  world.x = window.innerWidth / 2 - playerWorldX;
  world.y = window.innerHeight / 2 - playerWorldY;

  // Account for tree overflow (trees extend 40px radius beyond their center)
  const treeOverflow = 40;
  const mapPixelWidth = mapWidth * tileSize;
  const mapPixelHeight = mapHeight * tileSize;

  // Clamp camera to allow showing tree overflow
  // Trees extend 40px beyond their center, so we need to allow showing that overflow
  // The effective map bounds are: -treeOverflow to mapPixelWidth + treeOverflow
  const minX = window.innerWidth - mapPixelWidth - treeOverflow;
  const minY = window.innerHeight - mapPixelHeight - treeOverflow;
  const maxX = treeOverflow;
  const maxY = treeOverflow;

  world.x = Math.max(minX, Math.min(maxX, world.x));
  world.y = Math.max(minY, Math.min(maxY, world.y));
}

// Update camera every frame to follow player smoothly
app.ticker.add(() => {
  updateCamera();

  // Update tree shake animations
  const shakeIntensity = 3;
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
