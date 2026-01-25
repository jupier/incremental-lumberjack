import { Application, Container, Graphics } from "pixi.js";
import { TileData } from "./map";
import { PlayerConfig } from "./player-state";
import { TreeType } from "./tree";

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
 * Create destruction animation for a tree - splits into pieces
 */
export function createTreeDestructionAnimation(
  tree: Graphics,
  treeType: TreeType,
  world: Container,
  app: Application,
  onComplete: () => void
): void {
  const treeX = tree.x;
  const treeY = tree.y;
  const pieces: Array<{
    graphics: Graphics;
    vx: number;
    vy: number;
    rotationSpeed: number;
    gravity: number;
  }> = [];

  // Get tree colors
  const trunkColor = 
    treeType === "legendary" ? 0xffd700 :
    treeType === "crystal" ? 0x00bcd4 :
    treeType === "magical" ? 0x6a1b9a :
    treeType === "ancient" ? 0x4a2c1a :
    treeType === "strong" ? 0x6b3f1f : 0x8b4513;
  const foliageColor = 
    treeType === "legendary" ? 0xffeb3b :
    treeType === "crystal" ? 0x00e5ff :
    treeType === "magical" ? 0x9c27b0 :
    treeType === "ancient" ? 0x1b4d8a :
    treeType === "strong" ? 0x0f6b1f : 0x228b22;

  // Create trunk pieces (2-4 pieces depending on tree type)
  const trunkPieceCount = 
    treeType === "legendary" ? 4 :
    treeType === "crystal" ? 4 :
    treeType === "magical" ? 3 :
    treeType === "ancient" ? 3 :
    treeType === "strong" ? 2 : 2;
  const trunkHeight = 
    treeType === "legendary" ? 36 :
    treeType === "crystal" ? 34 :
    treeType === "magical" ? 34 :
    treeType === "ancient" ? 32 :
    treeType === "strong" ? 31 : 30;
  const trunkWidth = 
    treeType === "legendary" ? 20 :
    treeType === "crystal" ? 18 :
    treeType === "magical" ? 18 :
    treeType === "ancient" ? 16 :
    treeType === "strong" ? 14 : 12;
  const pieceHeight = trunkHeight / trunkPieceCount;

  for (let i = 0; i < trunkPieceCount; i++) {
    const piece = new Graphics();
    piece.rect(-trunkWidth / 2, -pieceHeight / 2, trunkWidth, pieceHeight);
    piece.fill(trunkColor);
    piece.x = treeX;
    piece.y = treeY - trunkHeight / 2 + (i + 0.5) * pieceHeight;
    piece.rotation = (Math.random() - 0.5) * 0.3; // Random initial rotation
    
    // Random velocity for scattering
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 40;
    pieces.push({
      graphics: piece,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20, // Slight upward initial velocity
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      gravity: 200 + Math.random() * 100,
    });
    world.addChild(piece);
  }

  // Create foliage pieces (2-6 pieces depending on tree type)
  const foliagePieceCount = 
    treeType === "legendary" ? 6 :
    treeType === "crystal" ? 5 :
    treeType === "magical" ? 5 :
    treeType === "ancient" ? 4 :
    treeType === "strong" ? 3 : 2;
  const foliageRadius = 
    treeType === "legendary" ? 30 :
    treeType === "crystal" ? 28 :
    treeType === "magical" ? 26 :
    treeType === "ancient" ? 24 :
    treeType === "strong" ? 18 : 20;

  for (let i = 0; i < foliagePieceCount; i++) {
    const piece = new Graphics();
    const pieceRadius = foliageRadius * (0.4 + Math.random() * 0.3);
    piece.circle(0, 0, pieceRadius);
    piece.fill(foliageColor);
    piece.x = treeX + (Math.random() - 0.5) * 20;
    const foliageYOffset = 
      treeType === "legendary" ? 30 :
      treeType === "crystal" ? 28 :
      treeType === "magical" ? 26 :
      treeType === "ancient" ? 24 :
      treeType === "strong" ? 20 : 20;
    piece.y = treeY - foliageYOffset + (Math.random() - 0.5) * 10;
    piece.rotation = Math.random() * Math.PI * 2;
    
    // Random velocity for scattering
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 50;
    pieces.push({
      graphics: piece,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30, // More upward for foliage
      rotationSpeed: (Math.random() - 0.5) * 0.4,
      gravity: 150 + Math.random() * 100,
    });
    world.addChild(piece);
  }

  // Animate pieces falling
  let animationTime = 0;
  const animationDuration = 0.6; // 600ms animation

  const ticker = () => {
    animationTime += app.ticker.deltaMS / 1000;
    const progress = animationTime / animationDuration;

    if (progress >= 1) {
      // Animation complete - remove all pieces
      pieces.forEach(({ graphics }) => {
        if (world.children.includes(graphics)) {
          world.removeChild(graphics);
        }
        graphics.destroy();
      });
      app.ticker.remove(ticker);
      onComplete();
    } else {
      // Update piece positions
      pieces.forEach((piece) => {
        // Apply gravity
        piece.vy += piece.gravity * (app.ticker.deltaMS / 1000);
        
        // Update position
        piece.graphics.x += piece.vx * (app.ticker.deltaMS / 1000);
        piece.graphics.y += piece.vy * (app.ticker.deltaMS / 1000);
        
        // Update rotation
        piece.graphics.rotation += piece.rotationSpeed * (app.ticker.deltaMS / 1000);
        
        // Fade out as pieces fall
        piece.graphics.alpha = 1 - progress * 0.7; // Fade to 30% opacity
      });
    }
  };

  app.ticker.add(ticker);
}

/**
 * Hit a tree at the specified tile coordinates
 */
export function hitTreeAtTile(
  tileX: number,
  tileY: number,
  tiles: TileData[][],
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
  treesContainer: Container,
  app?: Application,
  world?: Container,
  getConfig?: () => PlayerConfig,
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

  // Hit the tree at the target tile
  const tile = tiles[tileY]?.[tileX];
  if (tile && tile.item === "tree" && tile.tree) {
    const targetTree = tile.tree;
    const config = getConfig ? getConfig() : undefined;

    const baseMaxHealth =
      (targetTree as any).baseMaxHealth ?? (targetTree as any).maxHealth ?? 3;
    const effectiveMaxHealth = baseMaxHealth;

    // Ensure the tree's maxHealth reflects current config
    (targetTree as any).maxHealth = effectiveMaxHealth;

    // Get current health or use effective max health
    const currentHealth = (targetTree as any).health ?? effectiveMaxHealth;
    // Use cursor hit damage from config (default 1 if not available)
    const hitDamage = config?.cursorHitDamage ?? 1;
    const newHealth = currentHealth - hitDamage;

    // Decrease tree health
    (targetTree as any).health = newHealth;

    // Shake the tree
    shakeTree(targetTree);

    // Check if tree health reached 0
    if (newHealth <= 0) {
      const treeType = (targetTree as any).treeType as TreeType || "normal";
      const woodDropCount = Math.max(1, (targetTree as any).woodDropCount ?? 3);
      const tileCenterX = tileX * tileSize + tileSize / 2;
      const tileCenterY = tileY * tileSize + tileSize / 2;

      // Hide tree immediately (before destruction animation)
      targetTree.visible = false;

      // Create destruction animation if app and world are provided
      if (app && world) {
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
            tile.item = null;
            tile.tree = undefined;

            // Notify that a tree was cut (for respawn system)
            if (onTreeCut) {
              onTreeCut(tileX, tileY);
            }

            // Automatically collect wood (trigger animation)
            if (onWoodCollected) {
              onWoodCollected(woodDropCount, tileCenterX, tileCenterY);
            }
          }
        );
      } else {
        // Fallback: remove immediately if no animation support
        treesContainer.removeChild(targetTree);
        targetTree.destroy();
        tile.item = null;
        tile.tree = undefined;

        if (onTreeCut) {
          onTreeCut(tileX, tileY);
        }

        if (onWoodCollected) {
          onWoodCollected(woodDropCount, tileCenterX, tileCenterY);
        }
      }
    }
  }
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
            app,
            world,
            getConfig,
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
              app,
              world,
              getConfig,
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
