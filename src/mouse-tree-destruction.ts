import { Application, Container, Graphics, Point } from "pixi.js";
import { TileData } from "./map";
import { PlayerConfig } from "./player-state";

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

/**
 * Hit a tree at the specified tile coordinates
 */
function hitTreeAtTile(
  tileX: number,
  tileY: number,
  tiles: TileData[][],
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
  treesContainer: Container,
  config?: PlayerConfig,
  onWoodCollected?: (count: number, worldX: number, worldY: number) => void
): void {
  // Check bounds
  if (
    tileX < 0 ||
    tileX >= mapWidth ||
    tileY < 0 ||
    tileY >= mapHeight
  ) {
    return;
  }

  const targetTile = tiles[tileY]?.[tileX];
  if (!targetTile || targetTile.item !== "tree" || !targetTile.tree) {
    return;
  }

  const areaChop = config?.areaChopEnabled || false;
  const configuredTreeMaxHealth = config?.treeMaxHealth ?? 3;
  const healthReduction = Math.max(0, 3 - configuredTreeMaxHealth);

  // Determine which tiles to hit
  const tilesToHit: Array<{ x: number; y: number }> = [];

  if (areaChop) {
    // Hit all trees in 3x3 area around clicked tile
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = tileX + dx;
        const y = tileY + dy;
        if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
          tilesToHit.push({ x, y });
        }
      }
    }
  } else {
    // Hit only the clicked tile
    tilesToHit.push({ x: tileX, y: tileY });
  }

  // Hit all trees in the target tiles
  tilesToHit.forEach(({ x, y }) => {
    const tile = tiles[y]?.[x];
    if (tile && tile.item === "tree" && tile.tree) {
      const targetTree = tile.tree;

      const baseMaxHealth =
        (targetTree as any).baseMaxHealth ?? (targetTree as any).maxHealth ?? 3;
      const effectiveMaxHealth = Math.max(1, baseMaxHealth - healthReduction);

      // Ensure the tree's maxHealth reflects current config
      (targetTree as any).maxHealth = effectiveMaxHealth;

      // Get current health or use effective max health
      const currentHealth = (targetTree as any).health ?? effectiveMaxHealth;
      const newHealth = currentHealth - 1;

      // Decrease tree health
      (targetTree as any).health = newHealth;

      // Shake the tree
      shakeTree(targetTree);

      // Check if tree health reached 0
      if (newHealth <= 0) {
        // Remove tree from container
        treesContainer.removeChild(targetTree);

        // Update tile data (no wood on ground, it's automatically collected)
        tile.item = null;
        tile.tree = undefined;

        const woodDropCount = Math.max(1, (targetTree as any).woodDropCount ?? 3);
        // Calculate tile center in world coordinates
        const tileCenterX = x * tileSize + tileSize / 2;
        const tileCenterY = y * tileSize + tileSize / 2;

        // Automatically collect wood (trigger animation)
        if (onWoodCollected) {
          onWoodCollected(woodDropCount, tileCenterX, tileCenterY);
        }
      }
    }
  });
}

/**
 * Setup mouse-based tree destruction
 */
export function setupMouseTreeDestruction(
  app: Application,
  world: Container,
  tileSize: number,
  mapWidth: number,
  mapHeight: number,
  tiles: TileData[][],
  treesContainer: Container,
  getConfig?: () => PlayerConfig,
  onCooldownUpdate?: (progress: number) => void,
  onWoodCollected?: (count: number, worldX: number, worldY: number) => void,
  onAxeSwing?: () => void
): void {
  let hitCooldown = 0;
  let hitCooldownDuration = 1.0;
  let canHit = true;

  // Update cooldown
  app.ticker.add(() => {
    const currentConfig = getConfig ? getConfig() : undefined;
    hitCooldownDuration = currentConfig?.axeCooldownDuration || 1.0;
    
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

  // Track mouse down state and current mouse position
  let isMouseDown = false;
  let currentMouseWorldX = 0;
  let currentMouseWorldY = 0;

  // Find tree at world coordinates using Pixi.js built-in hit testing
  const findTreeAtWorldPosition = (worldX: number, worldY: number): { tileX: number; tileY: number } | null => {
    // Create a point in world coordinates
    const worldPoint = new Point(worldX, worldY);
    
    // Check all trees to see if click is within their actual drawn shape
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = tiles[y]?.[x];
        if (tile && tile.item === "tree" && tile.tree) {
          const tree = tile.tree;
          
          // Convert world point to tree's local coordinate space
          const localPoint = tree.toLocal(worldPoint);
          
          // Use Pixi.js built-in hit testing - checks against actual drawn geometry
          if (tree.containsPoint(localPoint)) {
            return { tileX: x, tileY: y };
          }
        }
      }
    }
    return null;
  };

  // Update mouse position on mouse move (for continuous hitting)
  app.canvas.addEventListener("mousemove", (e: MouseEvent) => {
    const rect = app.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = mouseX - world.x;
    const worldY = mouseY - world.y;
    
    currentMouseWorldX = worldX;
    currentMouseWorldY = worldY;
  });

  // Handle mouse down on the canvas
  app.canvas.addEventListener("mousedown", (e: MouseEvent) => {
    isMouseDown = true;
    
    // Get mouse position relative to canvas
    const rect = app.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    // Account for world transform (camera offset)
    const worldX = mouseX - world.x;
    const worldY = mouseY - world.y;
    
    // Update current mouse position
    currentMouseWorldX = worldX;
    currentMouseWorldY = worldY;

    // Find tree at click position (check actual tree bounds)
    const treePosition = findTreeAtWorldPosition(worldX, worldY);
    
    if (treePosition) {

      // Try to hit immediately if cooldown allows
      if (canHit) {
        // Trigger axe swing animation
        if (onAxeSwing) {
          onAxeSwing();
        }
        
        const currentConfig = getConfig ? getConfig() : undefined;
        hitTreeAtTile(
          treePosition.tileX,
          treePosition.tileY,
          tiles,
          mapWidth,
          mapHeight,
          tileSize,
          treesContainer,
          currentConfig,
          onWoodCollected || undefined
        );

        // Start cooldown
        hitCooldown = hitCooldownDuration;
        canHit = false;
        if (onCooldownUpdate) {
          onCooldownUpdate(0); // Show cooldown bar
        }
      }
    }
  });

  // Handle mouse up to stop continuous hitting
  app.canvas.addEventListener("mouseup", () => {
    isMouseDown = false;
  });

  // Handle mouse leave to stop continuous hitting
  app.canvas.addEventListener("mouseleave", () => {
    isMouseDown = false;
  });

  // Continuous hitting while mouse is held down (respects cooldown)
  app.ticker.add(() => {
    if (isMouseDown && canHit) {
      // Find tree at current mouse position (allows switching trees while holding)
      const treePosition = findTreeAtWorldPosition(currentMouseWorldX, currentMouseWorldY);
      
      if (treePosition) {
        // Verify tree still exists at this position
        const tile = tiles[treePosition.tileY]?.[treePosition.tileX];
        if (tile && tile.item === "tree" && tile.tree) {
          // Trigger axe swing animation
          if (onAxeSwing) {
            onAxeSwing();
          }
          
          const currentConfig = getConfig ? getConfig() : undefined;
          hitTreeAtTile(
            treePosition.tileX,
            treePosition.tileY,
            tiles,
            mapWidth,
            mapHeight,
            tileSize,
            treesContainer,
            currentConfig,
            onWoodCollected || undefined
          );

          // Start cooldown
          hitCooldown = hitCooldownDuration;
          canHit = false;
          if (onCooldownUpdate) {
            onCooldownUpdate(0); // Show cooldown bar
          }
        }
      }
    }
  });
}
