import { Graphics, Application } from "pixi.js";
import { TileData } from "./map";

export interface PlayerPosition {
  tileX: number;
  tileY: number;
}

export function createPlayer(): Graphics {
  // Create a simple player using Graphics
  const player = new Graphics();

  // Draw a simple character (circle for head, rectangle for body)
  player.circle(0, -15, 10);
  player.fill(0xffdbac); // Skin color for head

  player.rect(-8, 0, 16, 20);
  player.fill(0x4169e1); // Blue for body

  // Position player at center initially (will be set by tile position)
  player.x = 0;
  player.y = 0;

  return player;
}

export function setupPlayerMovement(
  player: Graphics,
  app: Application,
  tileSize: number,
  mapWidth: number,
  mapHeight: number,
  tiles: TileData[][],
  onMove?: (position: PlayerPosition) => void
): PlayerPosition {
  let currentTileX = Math.floor(mapWidth / 2);
  let currentTileY = Math.floor(mapHeight / 2);
  let isMoving = false;
  // Center player in tile
  let targetX = currentTileX * tileSize + tileSize / 2;
  let targetY = currentTileY * tileSize + tileSize / 2;
  const moveSpeed = 8; // Pixels per frame

  // Set initial position (centered in tile)
  player.x = targetX;
  player.y = targetY;

  const keys: { [key: string]: boolean } = {};
  let keyPressed = false;

  // Track key states
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (!keys[key] && !isMoving) {
      keys[key] = true;
      keyPressed = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Update player position based on keys (z/q/s/d for WASD in French layout)
  app.ticker.add(() => {
    if (isMoving) {
      // Smooth movement to target tile
      const dx = targetX - player.x;
      const dy = targetY - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < moveSpeed) {
        // Reached target
        player.x = targetX;
        player.y = targetY;
        isMoving = false;
        if (onMove) {
          onMove({ tileX: currentTileX, tileY: currentTileY });
        }
      } else {
        // Move towards target
        player.x += (dx / distance) * moveSpeed;
        player.y += (dy / distance) * moveSpeed;
      }
    } else if (keyPressed) {
      // Check for movement input
      let moved = false;
      let newTileX = currentTileX;
      let newTileY = currentTileY;

      if (keys["z"] || keys["w"]) {
        // Move up
        if (currentTileY > 0) {
          newTileY = currentTileY - 1;
          moved = true;
        }
      } else if (keys["s"]) {
        // Move down
        if (currentTileY < mapHeight - 1) {
          newTileY = currentTileY + 1;
          moved = true;
        }
      } else if (keys["q"] || keys["a"]) {
        // Move left
        if (currentTileX > 0) {
          newTileX = currentTileX - 1;
          moved = true;
        }
      } else if (keys["d"]) {
        // Move right
        if (currentTileX < mapWidth - 1) {
          newTileX = currentTileX + 1;
          moved = true;
        }
      }

      // Check for collision (can't walk through trees)
      if (moved) {
        const targetTile = tiles[newTileY]?.[newTileX];
        if (targetTile && targetTile.item === "tree") {
          // Collision detected - can't move here
          moved = false;
        }
      }

      if (moved) {
        // Update position
        currentTileX = newTileX;
        currentTileY = newTileY;
        // Center player in tile
        targetX = currentTileX * tileSize + tileSize / 2;
        targetY = currentTileY * tileSize + tileSize / 2;
        isMoving = true;
        keyPressed = false;
      }
    }
  });

  return { tileX: currentTileX, tileY: currentTileY };
}
