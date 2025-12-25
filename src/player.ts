import { Graphics, Application, Container } from "pixi.js";
import { TileData } from "./map";
import { createWoodPiece } from "./wood";
import { PlayerConfig } from "./player-state";

export interface PlayerPosition {
  tileX: number;
  tileY: number;
}

export interface PlayerMovementResult extends PlayerPosition {
  updateCooldownDuration?: (improved: boolean) => void;
}

export type PlayerDirection = "up" | "down" | "left" | "right";

export interface PlayerContainer {
  container: Container;
  body: Graphics;
  direction: PlayerDirection;
}

export function createPlayer(): PlayerContainer {
  // Create a container to hold player body and axe separately
  const playerContainer = new Container();

  // Create player body
  const body = new Graphics();

  // Draw body (rectangle)
  body.rect(-8, 0, 16, 20);
  body.fill(0x4169e1); // Blue for body

  // Draw head (circle)
  body.circle(0, -15, 10);
  body.fill(0xffdbac); // Skin color for head

  // Draw hair on top of head
  body.circle(0, -22, 8);
  body.fill(0x8b4513); // Brown hair

  // Draw eyes (will be positioned based on direction)
  // Default eyes looking down
  body.circle(-3, -16, 2);
  body.fill(0x000000); // Left eye
  body.circle(3, -16, 2);
  body.fill(0x000000); // Right eye

  // Draw a small nose
  body.circle(0, -13, 1.5);
  body.fill(0xffdbac);

  // Draw mouth
  body.rect(-2, -11, 4, 1);
  body.fill(0x000000);

  // Draw arms
  body.rect(-12, 2, 4, 8);
  body.fill(0xffdbac); // Left arm
  body.rect(8, 2, 4, 8);
  body.fill(0xffdbac); // Right arm

  // Draw legs
  body.rect(-6, 18, 5, 8);
  body.fill(0x2c3e50); // Dark blue pants - left leg
  body.rect(1, 18, 5, 8);
  body.fill(0x2c3e50); // Dark blue pants - right leg

  // Add body to container
  playerContainer.addChild(body);

  // Position player at center initially (will be set by tile position)
  playerContainer.x = 0;
  playerContainer.y = 0;

  return {
    container: playerContainer,
    body,
    direction: "down", // Default direction
  };
}

export function setupPlayerMovement(
  player: PlayerContainer,
  app: Application,
  tileSize: number,
  mapWidth: number,
  mapHeight: number,
  tiles: TileData[][],
  treesContainer: Container,
  woodContainer: Container,
  onMove?: (position: PlayerPosition) => void,
  onCooldownUpdate?: (progress: number) => void,
  onWoodCollected?: () => boolean,
  config?: PlayerConfig,
  getConfig?: () => PlayerConfig
): PlayerMovementResult {
  let currentTileX = Math.floor(mapWidth / 2);
  let currentTileY = Math.floor(mapHeight / 2);
  let isMoving = false;
  // Center player in tile
  let targetX = currentTileX * tileSize + tileSize / 2;
  let targetY = currentTileY * tileSize + tileSize / 2;
  const moveSpeed = 8; // Pixels per frame

  // Set initial position (centered in tile)
  player.container.x = targetX;
  player.container.y = targetY;

  // Initialize player direction
  updatePlayerDirection(player);

  const keys: { [key: string]: boolean } = {};

  // Track key states (allow holding keys)
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Hit cooldown system
  let hitCooldown = 0;
  let hitCooldownDuration = config?.axeCooldownDuration || 1.0;
  let canHit = true;

  // Function to update cooldown duration (for improvements)
  const updateCooldownDuration = (improved: boolean) => {
    if (getConfig) {
      const currentConfig = getConfig();
      hitCooldownDuration = currentConfig.axeCooldownDuration;
    } else {
      hitCooldownDuration = improved ? 0.5 : 1.0;
    }
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && canHit && !isMoving) {
      // Perform hit
      const currentConfig = getConfig ? getConfig() : config;
      checkTreeHit(
        player,
        currentTileX,
        currentTileY,
        tiles,
        mapWidth,
        mapHeight,
        tileSize,
        treesContainer,
        woodContainer,
        currentConfig
      );
      // Start cooldown
      hitCooldown = hitCooldownDuration;
      canHit = false;
      if (onCooldownUpdate) {
        onCooldownUpdate(0); // Show cooldown bar
      }
    } else if (e.key.toLowerCase() === "c" && !isMoving) {
      // Collect wood piece from current tile
      checkWoodCollection(
        currentTileX,
        currentTileY,
        tiles,
        mapWidth,
        mapHeight,
        woodContainer,
        onWoodCollected
      );
    }
  });

  // Update cooldown
  app.ticker.add(() => {
    if (hitCooldown > 0) {
      hitCooldown -= app.ticker.deltaMS / 1000; // Convert to seconds
      if (hitCooldown <= 0) {
        hitCooldown = 0;
        canHit = true;
        if (onCooldownUpdate) {
          onCooldownUpdate(1); // Hide cooldown bar
        }
      } else {
        // Update cooldown bar
        const progress = 1 - hitCooldown / hitCooldownDuration;
        if (onCooldownUpdate) {
          onCooldownUpdate(progress);
        }
      }
    }
  });

  // Update player position based on keys (z/q/s/d for WASD in French layout)
  app.ticker.add(() => {
    if (isMoving) {
      // Smooth movement to target tile
      const dx = targetX - player.container.x;
      const dy = targetY - player.container.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < moveSpeed) {
        // Reached target
        player.container.x = targetX;
        player.container.y = targetY;
        isMoving = false;
        if (onMove) {
          onMove({ tileX: currentTileX, tileY: currentTileY });
        }
      } else {
        // Move towards target
        player.container.x += (dx / distance) * moveSpeed;
        player.container.y += (dy / distance) * moveSpeed;
      }
    } else {
      // Check for movement input (allow holding keys)
      let moved = false;
      let newTileX = currentTileX;
      let newTileY = currentTileY;

      if (keys["z"] || keys["w"]) {
        // Move up
        player.direction = "up";
        if (currentTileY > 0) {
          newTileY = currentTileY - 1;
          moved = true;
        }
      } else if (keys["s"]) {
        // Move down
        player.direction = "down";
        if (currentTileY < mapHeight - 1) {
          newTileY = currentTileY + 1;
          moved = true;
        }
      } else if (keys["q"] || keys["a"]) {
        // Move left
        player.direction = "left";
        if (currentTileX > 0) {
          newTileX = currentTileX - 1;
          moved = true;
        }
      } else if (keys["d"]) {
        // Move right
        player.direction = "right";
        if (currentTileX < mapWidth - 1) {
          newTileX = currentTileX + 1;
          moved = true;
        }
      }

      // Update player sprite based on direction (even if movement blocked)
      updatePlayerDirection(player);

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

        // Auto-collect wood if enabled
        const currentConfig = getConfig ? getConfig() : config;
        if (currentConfig?.autoCollectEnabled) {
          const currentTile = tiles[currentTileY]?.[currentTileX];
          if (
            currentTile &&
            currentTile.item === "wood" &&
            currentTile.woodPieces &&
            currentTile.woodPieces.length > 0
          ) {
            // Try to collect wood (respects capacity)
            if (onWoodCollected && onWoodCollected()) {
              // Remove the first wood piece
              const woodPiece = currentTile.woodPieces.shift()!;
              woodContainer.removeChild(woodPiece);

              // If no more wood pieces, update tile item
              if (currentTile.woodPieces.length === 0) {
                currentTile.item = null;
                currentTile.woodPieces = undefined;
              }
            }
          }
        }
      }
    }
  });

  return {
    tileX: currentTileX,
    tileY: currentTileY,
    updateCooldownDuration,
  };
}

function checkTreeHit(
  player: PlayerContainer,
  playerTileX: number,
  playerTileY: number,
  tiles: TileData[][],
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
  treesContainer: Container,
  woodContainer: Container,
  config?: PlayerConfig
): void {
  const areaChop = config?.areaChopEnabled || false;
  const treeMaxHealth = config?.treeMaxHealth || 3;

  // Determine which tiles to hit
  const tilesToHit: Array<{ x: number; y: number }> = [];

  if (areaChop) {
    // Hit all trees in 3x3 area around player
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tileX = playerTileX + dx;
        const tileY = playerTileY + dy;
        if (tileX >= 0 && tileX < mapWidth && tileY >= 0 && tileY < mapHeight) {
          tilesToHit.push({ x: tileX, y: tileY });
        }
      }
    }
  } else {
    // Hit single tile in front of player
    let targetTileX = playerTileX;
    let targetTileY = playerTileY;

    switch (player.direction) {
      case "up":
        targetTileY = playerTileY - 1;
        break;
      case "down":
        targetTileY = playerTileY + 1;
        break;
      case "left":
        targetTileX = playerTileX - 1;
        break;
      case "right":
        targetTileX = playerTileX + 1;
        break;
    }

    if (
      targetTileX >= 0 &&
      targetTileX < mapWidth &&
      targetTileY >= 0 &&
      targetTileY < mapHeight
    ) {
      tilesToHit.push({ x: targetTileX, y: targetTileY });
    }
  }

  // Hit all trees in the target tiles
  tilesToHit.forEach(({ x, y }) => {
    const targetTile = tiles[y]?.[x];
    if (targetTile && targetTile.item === "tree" && targetTile.tree) {
      const tree = targetTile.tree;

      // Get current health or use max health from config
      const currentHealth = (tree as any).health ?? treeMaxHealth;
      const newHealth = currentHealth - 1;

      // Decrease tree health
      (tree as any).health = newHealth;

      // Shake the tree
      shakeTree(tree);

      // Check if tree health reached 0
      if (newHealth <= 0) {
        // Remove tree from container
        treesContainer.removeChild(tree);

        // Update tile data
        targetTile.item = "wood";
        targetTile.tree = undefined;
        targetTile.woodPieces = [];

        // Create 3 wood pieces on the tile
        const tileCenterX = x * tileSize + tileSize / 2;
        const tileCenterY = y * tileSize + tileSize / 2;

        // Position wood pieces in a small area around tile center
        const offsets = [
          { x: -8, y: -6 },
          { x: 8, y: -6 },
          { x: 0, y: 6 },
        ];

        for (let i = 0; i < 3; i++) {
          const woodPiece = createWoodPiece();
          woodPiece.x = tileCenterX + offsets[i].x;
          woodPiece.y = tileCenterY + offsets[i].y;
          woodContainer.addChild(woodPiece);
          targetTile.woodPieces!.push(woodPiece);
        }
      }
    }
  });
}

function checkWoodCollection(
  playerTileX: number,
  playerTileY: number,
  tiles: TileData[][],
  mapWidth: number,
  mapHeight: number,
  woodContainer: Container,
  onWoodCollected?: () => boolean
): void {
  // Check the current tile where the player is standing
  if (
    playerTileX >= 0 &&
    playerTileX < mapWidth &&
    playerTileY >= 0 &&
    playerTileY < mapHeight
  ) {
    const currentTile = tiles[playerTileY]?.[playerTileX];
    if (
      currentTile &&
      currentTile.item === "wood" &&
      currentTile.woodPieces &&
      currentTile.woodPieces.length > 0
    ) {
      // Try to add wood to inventory first (check capacity)
      let canCollect = true;
      if (onWoodCollected) {
        canCollect = onWoodCollected();
      }

      // Only remove wood piece from tile if inventory has space
      if (canCollect) {
        // Remove the first wood piece
        const woodPiece = currentTile.woodPieces.shift()!;
        woodContainer.removeChild(woodPiece);

        // If no more wood pieces, update tile item
        if (currentTile.woodPieces.length === 0) {
          currentTile.item = null;
          currentTile.woodPieces = undefined;
        }
      }
    }
  }
}

function shakeTree(tree: Graphics): void {
  // Store original position if not already stored
  if (!(tree as any).originalX) {
    (tree as any).originalX = tree.x;
    (tree as any).originalY = tree.y;
  }

  // Reset shake animation state
  (tree as any).shakeTime = 0;
  (tree as any).isShaking = true;
}

function updatePlayerDirection(player: PlayerContainer): void {
  const { body, direction } = player;

  // Clear previous drawings and redraw based on direction
  body.clear();

  // Common body parts (same for all directions)
  // Draw body (rectangle)
  body.rect(-8, 0, 16, 20);
  body.fill(0x4169e1); // Blue for body

  // Draw head (circle)
  body.circle(0, -15, 10);
  body.fill(0xffdbac); // Skin color for head

  // Draw hair on top of head
  body.circle(0, -22, 8);
  body.fill(0x8b4513); // Brown hair

  // Draw arms
  body.rect(-12, 2, 4, 8);
  body.fill(0xffdbac); // Left arm
  body.rect(8, 2, 4, 8);
  body.fill(0xffdbac); // Right arm

  // Draw legs
  body.rect(-6, 18, 5, 8);
  body.fill(0x2c3e50); // Dark blue pants - left leg
  body.rect(1, 18, 5, 8);
  body.fill(0x2c3e50); // Dark blue pants - right leg

  // Draw direction-specific features (eyes, nose, mouth)
  switch (direction) {
    case "left":
      // Eyes looking left
      body.circle(-4, -16, 2);
      body.fill(0x000000); // Left eye (looking left)
      body.circle(-1, -16, 2);
      body.fill(0x000000); // Right eye (looking left)
      // Nose
      body.circle(-2, -13, 1.5);
      body.fill(0xffdbac);
      // Mouth
      body.rect(-3, -11, 2, 1);
      body.fill(0x000000);
      // Flip player horizontally
      body.scale.x = -1;
      body.scale.y = 1;
      break;
    case "right":
      // Eyes looking right
      body.circle(1, -16, 2);
      body.fill(0x000000); // Left eye (looking right)
      body.circle(4, -16, 2);
      body.fill(0x000000); // Right eye (looking right)
      // Nose
      body.circle(2, -13, 1.5);
      body.fill(0xffdbac);
      // Mouth
      body.rect(1, -11, 2, 1);
      body.fill(0x000000);
      // Normal orientation
      body.scale.x = 1;
      body.scale.y = 1;
      break;
    case "up":
      // Eyes looking up
      body.circle(-3, -18, 2);
      body.fill(0x000000); // Left eye (looking up)
      body.circle(3, -18, 2);
      body.fill(0x000000); // Right eye (looking up)
      // Nose
      body.circle(0, -15, 1.5);
      body.fill(0xffdbac);
      // Mouth
      body.rect(-2, -12, 4, 1);
      body.fill(0x000000);
      // Normal orientation
      body.scale.x = 1;
      body.scale.y = 1;
      break;
    case "down":
      // Eyes looking down (default)
      body.circle(-3, -16, 2);
      body.fill(0x000000); // Left eye
      body.circle(3, -16, 2);
      body.fill(0x000000); // Right eye
      // Nose
      body.circle(0, -13, 1.5);
      body.fill(0xffdbac);
      // Mouth
      body.rect(-2, -11, 4, 1);
      body.fill(0x000000);
      // Normal orientation
      body.scale.x = 1;
      body.scale.y = 1;
      break;
  }
}
