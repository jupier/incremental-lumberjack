import { Application, Container } from "pixi.js";
import { createPlayer, setupPlayerMovement, PlayerPosition } from "./player";
import { createMap, getTileSize } from "./map";
import { createMinimap, updateMinimapPlayer } from "./minimap";

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
});

// Create a world container that will move (camera system)
const world = new Container();
app.stage.addChild(world);

// Create a larger map (bigger than screen)
const tileSize = getTileSize();
const mapWidth = 50; // Large map width in tiles
const mapHeight = 50; // Large map height in tiles

// Create the map with separate containers for grass and trees
const { grassContainer, treesContainer, tiles } = createMap({
  width: mapWidth,
  height: mapHeight,
});

// Add grass tiles first (bottom layer)
world.addChild(grassContainer);

// Create and add the player (middle layer - behind trees, in front of grass)
const player = createPlayer();
world.addChild(player);

// Add trees last (top layer - in front of player)
world.addChild(treesContainer);

// Create minimap
const minimap = createMinimap(tiles, mapWidth, mapHeight);
app.stage.addChild(minimap);

// Track player position for minimap
let currentPlayerPosition: PlayerPosition = {
  tileX: Math.floor(mapWidth / 2),
  tileY: Math.floor(mapHeight / 2),
};

// Setup player movement with z/q/s/d keys (tile-based)
setupPlayerMovement(
  player,
  app,
  tileSize,
  mapWidth,
  mapHeight,
  tiles,
  (position) => {
    currentPlayerPosition = position;
    updateMinimapPlayer(
      minimap,
      position.tileX,
      position.tileY,
      mapWidth,
      mapHeight
    );
  }
);

// Initialize minimap with player position
updateMinimapPlayer(
  minimap,
  currentPlayerPosition.tileX,
  currentPlayerPosition.tileY,
  mapWidth,
  mapHeight
);

// Camera system: keep player centered, move the world
function updateCamera() {
  // Use player's actual position (smooth movement)
  const playerWorldX = player.x;
  const playerWorldY = player.y;

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
});
