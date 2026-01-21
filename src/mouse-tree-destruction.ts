import { Application, Container, Graphics } from "pixi.js";
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
  onWoodCollected?: (count: number, worldX: number, worldY: number) => void,
  onTreeCut?: (tileX: number, tileY: number) => void
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

        // Notify that a tree was cut (for respawn system)
        if (onTreeCut) {
          onTreeCut(x, y);
        }

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
  onAxeSwing?: () => void,
  getCursorRadius?: () => number,
  onTreeCut?: (tileX: number, tileY: number) => void,
  isRoundActive?: () => boolean
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

  // Find all trees within cursor radius at world coordinates
  const findTreesAtWorldPosition = (worldX: number, worldY: number): Array<{ tileX: number; tileY: number }> => {
    // Get current cursor radius from config
    const cursorRadius = getCursorRadius ? getCursorRadius() : 12;
    const foundTrees: Array<{ tileX: number; tileY: number }> = [];
    
    // Check all trees to see if any part of the tree is within cursor radius
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = tiles[y]?.[x];
        if (tile && tile.item === "tree" && tile.tree) {
          const tree = tile.tree;
          const treeWorldX = tree.x;
          const treeWorldY = tree.y;
          
          // Calculate distance from cursor center to tree center
          const dx = worldX - treeWorldX;
          const dy = worldY - treeWorldY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Check if tree is within cursor radius
          // We check if the tree center is within radius, or if any part of the tree
          // (accounting for tree size) is within the cursor radius
          const treeType = (tree as any).treeType || "normal";
          let treeRadius = 20; // Approximate tree radius
          if (treeType === "strong") {
            treeRadius = 30;
          } else if (treeType === "ancient") {
            treeRadius = 40;
          }
          
          // Tree is hit if cursor overlaps with tree (distance < cursorRadius + treeRadius)
          if (distance <= cursorRadius + treeRadius) {
            foundTrees.push({ tileX: x, tileY: y });
          }
        }
      }
    }
    return foundTrees;
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
    // Don't allow tree cutting if round is not active
    if (isRoundActive && !isRoundActive()) {
      return;
    }
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

    // Find all trees within cursor radius at click position
    const treePositions = findTreesAtWorldPosition(worldX, worldY);
    
    if (treePositions.length > 0) {
      // Try to hit immediately if cooldown allows
      if (canHit) {
        // Trigger axe swing animation
        if (onAxeSwing) {
          onAxeSwing();
        }
        
        const currentConfig = getConfig ? getConfig() : undefined;
        
        // Hit all trees within cursor radius
        treePositions.forEach((treePosition) => {
          hitTreeAtTile(
            treePosition.tileX,
            treePosition.tileY,
            tiles,
            mapWidth,
            mapHeight,
            tileSize,
            treesContainer,
            currentConfig,
            onWoodCollected || undefined,
            onTreeCut
          );
        });

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
    // Don't allow tree cutting if round is not active
    if (isRoundActive && !isRoundActive()) {
      return;
    }
    if (isMouseDown && canHit) {
      // Find all trees within cursor radius at current mouse position
      const treePositions = findTreesAtWorldPosition(currentMouseWorldX, currentMouseWorldY);
      
      if (treePositions.length > 0) {
        // Verify trees still exist and hit all of them
        const validTreePositions = treePositions.filter((treePosition) => {
          const tile = tiles[treePosition.tileY]?.[treePosition.tileX];
          return tile && tile.item === "tree" && tile.tree;
        });
        
        if (validTreePositions.length > 0) {
          // Trigger axe swing animation
          if (onAxeSwing) {
            onAxeSwing();
          }
          
          const currentConfig = getConfig ? getConfig() : undefined;
          
          // Hit all trees within cursor radius
          validTreePositions.forEach((treePosition) => {
            hitTreeAtTile(
              treePosition.tileX,
              treePosition.tileY,
              tiles,
              mapWidth,
              mapHeight,
              tileSize,
              treesContainer,
              currentConfig,
              onWoodCollected || undefined,
              onTreeCut
            );
          });

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
